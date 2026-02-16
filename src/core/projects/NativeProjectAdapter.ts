import { IProjectAdapter } from './types';
import { VisualProject } from './models';
import {
    ensureDirectory,
    readJsonFile,
    writeJsonFile,
    atomicWriteJsonFile,
    listFiles,
    fileExists,
    removeDirectoryRecursive,
    writeFileBytes,
    readFileBytes,
    storeAssetNative,
    cleanupGlobalAssetsNative,
    bytesToDataUrl,
    dataUrlToBytes,
    getExtensionFromMimeType,
} from '@/core/storage/NativeStorage';
import SQLite from '@tauri-apps/plugin-sql';
import { v4 as uuidv4 } from 'uuid';
import { join } from '@tauri-apps/api/path'; // Note: In newer Tauri, path joining might be different or require specific handling
// For now, we use simple string concatenation as used in NativeStorage.ts to align with existing patterns
// or we can import the existing path helpers if any. 
// Given NativeStorage.ts uses string templates, we will stick to that to start.

const PROJECTS_DIR = 'projects';

export class NativeProjectAdapter implements IProjectAdapter {

    private db: SQLite | null = null;

    private async getProjectDir(projectId: string): Promise<string> {
        const projectDir = `${PROJECTS_DIR}/${projectId}`;
        await ensureDirectory(projectDir);
        return projectDir;
    }

    private async getDB(): Promise<SQLite> {
        if (this.db) return this.db;
        this.db = await SQLite.load('sqlite:teleprompter.db');

        // Initialize index table
        await this.db.execute(`
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT,
                createdAt INTEGER,
                modifiedAt INTEGER,
                pageCount INTEGER
            )
        `);

        return this.db;
    }

    private async updateIndex(project: VisualProject): Promise<void> {
        const db = await this.getDB();
        await db.execute(
            `INSERT OR REPLACE INTO projects (id, name, createdAt, modifiedAt, pageCount) 
             VALUES (?, ?, ?, ?, ?)`,
            [project.id, project.name, project.createdAt, project.modifiedAt, project.pages.length]
        );
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

        // Process Pages & Assets (with de-duplication)
        const pagesWithRefs = await Promise.all(project.pages.map(async (page, index) => {
            // 1. Handle regular image data
            if (page.data && (page.data.startsWith('data:') || page.data.startsWith('blob:'))) {
                let bytes: Uint8Array;
                let mimeType: string;

                if (page.data.startsWith('data:')) {
                    const result = dataUrlToBytes(page.data);
                    bytes = result.bytes;
                    mimeType = result.mimeType;
                } else {
                    const res = await fetch(page.data);
                    const blob = await res.blob();
                    const arrayBuffer = await blob.arrayBuffer();
                    bytes = new Uint8Array(arrayBuffer);
                    mimeType = blob.type;
                }

                const ext = getExtensionFromMimeType(mimeType);
                // Call Rust to hash and store in global_assets
                const assetPath = await storeAssetNative(bytes, ext);

                return {
                    ...page,
                    assetId: page.assetId || uuidv4(),
                    data: assetPath, // This will be "global_assets/HASH.ext"
                    _mimeType: mimeType,
                };
            }

            // 3. Handle Existing File Paths (already saved)
            // If it looks like a path, ensure we keep the assetId
            return page;
        }));

        // Process Audio (with de-duplication)
        let audioRef = null;
        if (project.audioFile) {
            if (project.audioFile.data.startsWith('data:') || project.audioFile.data.startsWith('blob:')) {
                let bytes: Uint8Array;
                let mimeType: string;

                if (project.audioFile.data.startsWith('data:')) {
                    const result = dataUrlToBytes(project.audioFile.data);
                    bytes = result.bytes;
                    mimeType = result.mimeType;
                } else {
                    const res = await fetch(project.audioFile.data);
                    const blob = await res.blob();
                    const arrayBuffer = await blob.arrayBuffer();
                    bytes = new Uint8Array(arrayBuffer);
                    mimeType = blob.type;
                }

                const ext = getExtensionFromMimeType(mimeType);
                const assetPath = await storeAssetNative(bytes, ext);

                audioRef = {
                    ...project.audioFile,
                    data: assetPath, // "global_assets/HASH.ext"
                    mimeType
                };
            } else {
                // Already a path (likely de-duplicated)
                audioRef = project.audioFile;
            }
        }

        const projectJsonPath = `${projectDir}/project.json`;
        await atomicWriteJsonFile(projectJsonPath, {
            ...project,
            pages: pagesWithRefs,
            audioFile: audioRef,
            modifiedAt: Date.now()
        });

        // Update SQLite index for fast listing
        await this.updateIndex(project);
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

            // Audio file data is also assumed to be a path or a data URL
            let audioFile = metadata.audioFile;
            if (audioFile && audioFile.data && !audioFile.data.startsWith('data:') && !audioFile.data.startsWith('blob:')) {
                const { convertPathToSrc } = await import('@/core/storage/NativeStorage');
                audioFile = { ...audioFile, data: convertPathToSrc(audioFile.data) };
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
            const db = await this.getDB();
            const results = await db.select<any[]>('SELECT * FROM projects ORDER BY modifiedAt DESC');

            if (results.length === 0) {
                // Initial fetch if DB is empty - migrate existing files to index
                await ensureDirectory(PROJECTS_DIR);
                const entries = await listFiles(PROJECTS_DIR);
                const projects: VisualProject[] = [];

                for (const dirName of entries) {
                    try {
                        const metadata = await readJsonFile<any>(`${PROJECTS_DIR}/${dirName}/project.json`);
                        const p = {
                            id: metadata.id || dirName,
                            name: metadata.name || 'Untitled',
                            createdAt: metadata.createdAt || Date.now(),
                            modifiedAt: metadata.modifiedAt || Date.now(),
                            pages: metadata.pages || [],
                            audioFile: metadata.audioFile,
                        };
                        await this.updateIndex(p);
                        projects.push(p);
                    } catch { /* skip */ }
                }
                return projects.sort((a, b) => b.modifiedAt - a.modifiedAt);
            }

            return results.map(row => ({
                id: row.id,
                name: row.name,
                createdAt: row.createdAt,
                modifiedAt: row.modifiedAt,
                pages: new Array(row.pageCount || 0).fill({}), // Lightweight placeholder
                audioFile: null,
            }));
        } catch (error) {
            console.error('Failed to get projects from index', error);
            return [];
        }
    }

    async deleteProject(id: string): Promise<void> {
        const projectDir = `${PROJECTS_DIR}/${id}`;
        await removeDirectoryRecursive(projectDir);

        // Remove from index
        try {
            const db = await this.getDB();
            await db.execute('DELETE FROM projects WHERE id = ?', [id]);
        } catch (e) {
            console.error('Failed to remove from index', e);
        }
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
            pages: original.pages.map(p => ({
                ...p,
                id: uuidv4(),
                segments: p.segments.map(s => ({ ...s, id: uuidv4() }))
            }))
        };

        // Saving will naturally link to the same de-duplicated assets
        await this.saveProject(newProject);
        return newProject;
    }

    /**
     * Scans all projects and the audio library to find all active assets
     * and triggers a cleanup of orphans in the global asset store.
     */
    async cleanupUnusedAssets(): Promise<void> {
        try {
            const projects = await this.getAllProjects();
            const activeAssets = new Set<string>();

            // 1. Collect assets from all projects
            for (const p of projects) {
                // We need to load the full project to see assets
                const fullProject = await this.loadProject(p.id);
                if (fullProject) {
                    for (const page of fullProject.pages) {
                        if (page.data && page.data.startsWith('global_assets/')) {
                            activeAssets.add(page.data);
                        }
                    }
                    if (fullProject.audioFile && fullProject.audioFile.data.startsWith('global_assets/')) {
                        activeAssets.add(fullProject.audioFile.data);
                    }
                }
            }

            // 2. Collect assets from Audio Library (if applicable)
            // Note: Currently AudioStorage has its own maintenance, but we should unify
            // For now, let's just focus on CAS assets.

            const deletedCount = await cleanupGlobalAssetsNative(Array.from(activeAssets));
            if (deletedCount > 0) {
                console.log(`[Storage GC] Deleted ${deletedCount} orphaned assets`);
            }
        } catch (error) {
            console.error('Asset cleanup failed', error);
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
