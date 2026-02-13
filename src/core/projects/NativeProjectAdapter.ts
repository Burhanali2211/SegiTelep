import { IProjectAdapter } from './types';
import { VisualProject } from './models';
import {
    ensureDirectory,
    readJsonFile,
    writeJsonFile,
    listFiles,
    fileExists,
    removeDirectoryRecursive,
    writeFileBytes,
    readFileBytes,
    bytesToDataUrl,
    dataUrlToBytes,
    getExtensionFromMimeType,
} from '@/core/storage/NativeStorage';
import { v4 as uuidv4 } from 'uuid';
import { join } from '@tauri-apps/api/path'; // Note: In newer Tauri, path joining might be different or require specific handling
// For now, we use simple string concatenation as used in NativeStorage.ts to align with existing patterns
// or we can import the existing path helpers if any. 
// Given NativeStorage.ts uses string templates, we will stick to that to start.

const PROJECTS_DIR = 'projects';

export class NativeProjectAdapter implements IProjectAdapter {

    private async getProjectDir(projectId: string): Promise<string> {
        const projectDir = `${PROJECTS_DIR}/${projectId}`;
        await ensureDirectory(projectDir);
        await ensureDirectory(`${projectDir}/assets`); // Unified asset directory
        return projectDir;
    }

    async createProject(name: string): Promise<VisualProject> {
        const id = uuidv4();
        const project: VisualProject = {
            id,
            name,
            createdAt: Date.now(),
            modifiedAt: Date.now(),
            pages: [],
            audioFile: null,
        };
        await this.saveProject(project);
        return project;
    }

    async saveProject(project: VisualProject): Promise<void> {
        const projectDir = await this.getProjectDir(project.id);
        const assetsDir = `${projectDir}/assets`;

        // Process Pages & Assets
        const pagesWithRefs = await Promise.all(project.pages.map(async (page, index) => {
            // 1. Handle regular image data
            if (page.data && page.data.startsWith('data:')) {
                const { bytes, mimeType } = dataUrlToBytes(page.data);
                const ext = getExtensionFromMimeType(mimeType);
                const assetId = page.assetId || uuidv4();
                const assetPath = `${assetsDir}/${assetId}.${ext}`;

                await writeFileBytes(assetPath, bytes);

                return {
                    ...page,
                    assetId,
                    data: assetPath, // Store relative path
                    _mimeType: mimeType,
                };
            }

            // 2. Handle Blob URLs (convert to bytes)
            if (page.data && page.data.startsWith('blob:')) {
                try {
                    const res = await fetch(page.data);
                    const blob = await res.blob();
                    const dataUrl = await new Promise<string>((resolve, reject) => {
                        const r = new FileReader();
                        r.onload = () => resolve(r.result as string);
                        r.onerror = reject;
                        r.readAsDataURL(blob);
                    });
                    const { bytes, mimeType } = dataUrlToBytes(dataUrl);
                    const ext = getExtensionFromMimeType(mimeType);
                    const assetId = page.assetId || uuidv4();
                    const assetPath = `${assetsDir}/${assetId}.${ext}`;

                    await writeFileBytes(assetPath, bytes);
                    return {
                        ...page,
                        assetId,
                        data: assetPath,
                        _mimeType: mimeType,
                    };
                } catch (e) {
                    console.error('Failed to save blob asset', e);
                    return page;
                }
            }

            // 3. Handle Existing File Paths (already saved)
            // If it looks like a path, ensure we keep the assetId
            return page;
        }));

        // Process Audio
        let audioRef = null;
        if (project.audioFile) {
            if (project.audioFile.data.startsWith('data:')) {
                const { bytes, mimeType } = dataUrlToBytes(project.audioFile.data);
                const ext = getExtensionFromMimeType(mimeType);
                const audioId = project.audioFile.id || uuidv4();
                const audioPath = `${assetsDir}/${audioId}.${ext}`;
                await writeFileBytes(audioPath, bytes);

                audioRef = {
                    ...project.audioFile,
                    id: audioId,
                    data: audioPath,
                    mimeType
                };
            } else {
                audioRef = project.audioFile;
            }
        }

        const metadata = {
            ...project,
            pages: pagesWithRefs,
            audioFile: audioRef,
            modifiedAt: Date.now(),
        };

        await writeJsonFile(`${projectDir}/project.json`, metadata);
    }

    async loadProject(id: string): Promise<VisualProject | null> {
        const projectDir = `${PROJECTS_DIR}/${id}`;
        const projectJsonPath = `${projectDir}/project.json`;

        if (!(await fileExists(projectJsonPath))) return null;

        try {
            const metadata = await readJsonFile<any>(projectJsonPath);

            // Hydrate pages with data URLs for the UI
            // Note: In strict Tauri mode, we might want to pass paths and let the UI use convertFileSrc
            // But for compatibility with existing components that might expect data URLs or direct paths:

            const pages = await Promise.all(metadata.pages.map(async (page: any) => {
                // Resolve data path to something usable if needed
                // If it is a path, we leave it as a path. The UI hook 'useAssetUrl' handles conversion.
                return page;
            }));

            // Hydrate Audio
            let audioFile = metadata.audioFile;
            if (audioFile && audioFile.data && !audioFile.data.startsWith('data:')) {
                // It's a path, leave it for hook to resolve
            }

            return {
                ...metadata,
                pages,
                audioFile
            };
        } catch (error) {
            console.error('Failed to load project', error);
            return null;
        }
    }

    async getAllProjects(): Promise<VisualProject[]> {
        try {
            await ensureDirectory(PROJECTS_DIR);
            const entries = await listFiles(PROJECTS_DIR);
            const projects: VisualProject[] = [];

            for (const dirName of entries) {
                try {
                    const metadata = await readJsonFile<any>(`${PROJECTS_DIR}/${dirName}/project.json`);
                    // Create a lightweight version for the list
                    projects.push({
                        id: metadata.id || dirName,
                        name: metadata.name || 'Untitled',
                        createdAt: metadata.createdAt || Date.now(),
                        modifiedAt: metadata.modifiedAt || Date.now(),
                        pages: metadata.pages || [], // We might want to limit this for perf
                        audioFile: metadata.audioFile,
                    });
                } catch {
                    // Skip
                }
            }
            return projects.sort((a, b) => b.modifiedAt - a.modifiedAt);
        } catch {
            return [];
        }
    }

    async deleteProject(id: string): Promise<void> {
        const projectDir = `${PROJECTS_DIR}/${id}`;
        await removeDirectoryRecursive(projectDir);
    }

    async duplicateProject(id: string): Promise<VisualProject | undefined> {
        const original = await this.loadProject(id);
        if (!original) return undefined;

        const newId = uuidv4();
        const newProject: VisualProject = {
            ...original,
            id: newId,
            name: `${original.name} (Copy)`,
            createdAt: Date.now(),
            modifiedAt: Date.now(),
            // We will perform a deep save which will copy assets
        };

        // CRITICAL: We need to actually copy the assets, not just reference them.
        // The easiest robust way in this adapter without `cp` command availability 
        // is to read the original assets and write them to the new location.
        // Or, since we have the paths in `original`, `saveProject` will encounter paths.

        // Modification to saveProject needed:
        // If we pass `newProject` to `saveProject`, it has pages with `data` pointing to `projects/OLD_ID/assets/file.png`.
        // We need `saveProject` (or a helper) to detect this across-project reference and COPY the file.

        // Let's manually handle the copy here for clarity and safety.
        const newProjectDir = await this.getProjectDir(newId); // creates dir
        const newAssetsDir = `${newProjectDir}/assets`;

        const newPages = await Promise.all(original.pages.map(async (page) => {
            const newData = await this.copyAssetTo(page.data, newAssetsDir);
            return {
                ...page,
                id: uuidv4(), // new page ID
                data: newData,
                assetId: uuidv4(), // new asset ID
                segments: page.segments.map(s => ({ ...s, id: uuidv4() }))
            };
        }));

        let newAudio = null;
        if (original.audioFile) {
            const newAudioData = await this.copyAssetTo(original.audioFile.data, newAssetsDir);
            newAudio = {
                ...original.audioFile,
                id: uuidv4(),
                data: newAudioData
            };
        }

        const savedProject = {
            ...newProject,
            pages: newPages,
            audioFile: newAudio
        };

        await writeJsonFile(`${newProjectDir}/project.json`, savedProject);
        return savedProject;
    }

    // Helper to copy an asset file to a new directory and return the new relative path
    private async copyAssetTo(currentPath: string | undefined, targetDir: string): Promise<string | undefined> {
        if (!currentPath) return currentPath;
        if (currentPath.startsWith('data:') || currentPath.startsWith('blob:')) return currentPath; // saveProject will handle these later if needed, but here we expect paths usually

        try {
            // Resolve full path or relative path
            // Use read/write bytes to copy
            const bytes = await readFileBytes(currentPath);

            const ext = currentPath.split('.').pop() || 'bin';
            const newFileName = `${uuidv4()}.${ext}`;
            const newPath = `${targetDir}/${newFileName}`;

            await writeFileBytes(newPath, bytes);
            return newPath;
        } catch (e) {
            console.warn(`Failed to copy asset ${currentPath}`, e);
            return currentPath; // Fallback? Or fail?
        }
    }

    async exportProject(project: VisualProject): Promise<void> {
        // Re-use existing export logic or move it here
        // For native, we might just export the JSON with embedded base64 for portability?
        // Or zip it. For now, matching existing behavior (JSON export).

        // To make it portable, we must embed assets as base64
        const portablePages = await Promise.all(project.pages.map(async (p) => {
            if (p.data && !p.data.startsWith('data:')) {
                try {
                    const bytes = await readFileBytes(p.data);
                    // We need mime type. Stored in _mimeType or guess
                    const ext = p.data.split('.').pop();
                    const mime = ext === 'png' ? 'image/png' : 'image/jpeg'; // naive guess
                    const b64 = bytesToDataUrl(bytes, (p as any)._mimeType || mime);
                    return { ...p, data: b64 };
                } catch { return p; }
            }
            return p;
        }));

        const portableProject = { ...project, pages: portablePages };

        const data = JSON.stringify(portableProject, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.name.replace(/[^a-z0-9]/gi, '_')}.visualprompt.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async importProject(file: File): Promise<VisualProject> {
        const text = await file.text();
        const data = JSON.parse(text) as VisualProject;

        // When importing, we receive base64 data usually.
        // createProject -> saveProject will turn base64 into files.
        // So we just return the structure with new IDs and let saveProject handle physical storage.

        return {
            ...data,
            id: uuidv4(),
            name: data.name || 'Imported Project',
            createdAt: Date.now(),
            modifiedAt: Date.now(),
            pages: (data.pages || []).map(page => ({
                ...page,
                id: uuidv4(),
                segments: (page.segments || []).map(seg => ({
                    ...seg,
                    id: uuidv4(),
                })),
            })),
        };
    }
}
