import { IProjectAdapter } from './types';
import { VisualProject } from './models';
import { AssetManager } from '@/core/storage/AssetManager';
import { v4 as uuidv4 } from 'uuid';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

// IndexedDB schema for web fallback
interface VisualProjectDB extends DBSchema {
    visualProjects: {
        key: string;
        value: VisualProject;
        indexes: { 'by-name': string; 'by-modified': number };
    };
    assets: {
        key: string;
        value: { id: string; data: Blob; type: string; name: string };
    };
}

const DB_NAME = 'visual-teleprompter-db';
const DB_VERSION = 3;

let dbInstance: IDBPDatabase<VisualProjectDB> | null = null;

async function getDB(): Promise<IDBPDatabase<VisualProjectDB>> {
    if (dbInstance) return dbInstance;

    dbInstance = await openDB<VisualProjectDB>(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion) {
            if (oldVersion < 1) {
                const store = db.createObjectStore('visualProjects', { keyPath: 'id' });
                store.createIndex('by-name', 'name');
                store.createIndex('by-modified', 'modifiedAt');
            }

            if (oldVersion < 3) {
                if (!db.objectStoreNames.contains('assets')) {
                    db.createObjectStore('assets', { keyPath: 'id' });
                }
            }
        },
    });

    return dbInstance;
}

// Deep clone helper to ensure data is serializable
function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

// Safe serializer for IndexedDB - removes any non-cloneable objects
function sanitizeForIDB<T>(obj: T): T {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;

    try {
        // Use JSON round-trip to strip non-serializable values
        return JSON.parse(JSON.stringify(obj, (key, value) => {
            // Skip functions and DOM objects
            if (typeof value === 'function') return undefined;
            if (value instanceof Event) return undefined;
            if (value instanceof Element) return undefined;
            if (value instanceof Window) return undefined;
            if (value && typeof value === 'object') {
                const name = value.constructor?.name;
                if (name && (name.includes('Event') || name.includes('Element') || name.includes('Node'))) {
                    return undefined;
                }
            }
            return value;
        }));
    } catch {
        // If serialization fails, return a deep clone attempt
        return deepClone(obj);
    }
}

export class WebProjectAdapter implements IProjectAdapter {

    async createProject(name: string): Promise<VisualProject> {
        const project: VisualProject = {
            id: uuidv4(),
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
        // Ensure assets are saved to AssetManager only if they are new (data URLs)
        const pagesWithAssets = await Promise.all(project.pages.map(async (page) => {
            // Priority 1: Data URL - definitely new data from upload
            if (page.data && page.data.startsWith('data:')) {
                const assetId = await AssetManager.saveAsset(page.data, `page-${page.id}`);
                return {
                    ...page,
                    assetId,
                    data: assetId // Store ID as reference
                };
            }

            // Priority 2: Asset ID already exists - content is already in storage
            // Even if data is a blob: URL, we don't need to re-save it
            if (page.assetId) {
                return { ...page, data: page.assetId };
            }

            // Priority 3: Blob URL without asset ID - attempt to save once
            if (page.data && page.data.startsWith('blob:')) {
                try {
                    const assetId = await AssetManager.saveAsset(page.data, `page-${page.id}`);
                    return { ...page, assetId, data: assetId };
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                } catch (err) {
                    console.warn('Could not save blob: asset, keeping as is', page.id);
                }
            }

            return page;
        }));

        let audioRef = project.audioFile;
        if (project.audioFile && project.audioFile.data) {
            const isDataUrl = project.audioFile.data.startsWith('data:');
            const isBlobUrl = project.audioFile.data.startsWith('blob:');

            if (isDataUrl || (isBlobUrl && !project.audioFile.id)) {
                try {
                    const assetId = await AssetManager.saveAsset(project.audioFile.data, `audio-${project.audioFile.name}`);
                    audioRef = { ...project.audioFile, id: assetId, data: assetId };
                } catch (e) {
                    console.error('Failed to save audio file asset', e);
                }
            } else if (project.audioFile.id) {
                // Always store the ID for persistence, avoiding transient Blob URLs
                audioRef = { ...project.audioFile, data: project.audioFile.id };
            }
        }

        const projectToSave = {
            ...project,
            pages: pagesWithAssets,
            audioFile: audioRef,
            modifiedAt: Date.now()
        };

        const db = await getDB();
        const sanitized = sanitizeForIDB(projectToSave);
        await db.put('visualProjects', sanitized);
    }

    async loadProject(id: string): Promise<VisualProject | null> {
        const db = await getDB();
        const project = await db.get('visualProjects', id);
        if (!project) return null;

        // Hydrate assets from AssetManager
        const hydratedPages = await Promise.all(project.pages.map(async (page) => {
            if (page.assetId) {
                const url = await AssetManager.getAssetUrl(page.assetId);
                if (url) {
                    return { ...page, data: url };
                }
            } else if (page.data && !page.data.startsWith('data:') && !page.data.startsWith('blob:')) {
                // Treat data as assetId if it's a UUID-like string
                // Try to load
                const url = await AssetManager.getAssetUrl(page.data);
                if (url) return { ...page, assetId: page.data, data: url };
            }
            // Fallback or keep as is
            return page;
        }));

        let audioFile = project.audioFile;
        if (audioFile && audioFile.data && !audioFile.data.startsWith('data:') && !audioFile.data.startsWith('blob:')) {
            // Treat data as assetId if it's not a direct URL
            const url = await AssetManager.getAssetUrl(audioFile.data);
            if (url) {
                audioFile = { ...audioFile, data: url };
            } else {
                // Try if ID is stored in audioFile.id
                const urlFromId = await AssetManager.getAssetUrl(audioFile.id);
                if (urlFromId) audioFile = { ...audioFile, data: urlFromId };
            }
        }

        return { ...project, pages: hydratedPages, audioFile };
    }

    async getAllProjects(): Promise<VisualProject[]> {
        const db = await getDB();
        const projects = await db.getAllFromIndex('visualProjects', 'by-modified');
        return projects.reverse();
    }

    async deleteProject(id: string): Promise<void> {
        const db = await getDB();
        const project = await db.get('visualProjects', id);

        if (project) {
            const assetIds = project.pages
                .map(p => p.assetId)
                .filter((id): id is string => !!id);

            if (project.audioFile?.id) assetIds.push(project.audioFile.id);

            await AssetManager.deleteAssets(assetIds);
        }

        await db.delete('visualProjects', id);
    }

    async duplicateProject(id: string): Promise<VisualProject | undefined> {
        const original = await this.loadProject(id);
        if (!original) return undefined;

        // Deep copy assets
        const newPages = await Promise.all(original.pages.map(async (page) => {
            // Priority 1: Use assetId to get original blob directly from IDB
            // This is safer than fetching from a transient blob: URL
            if (page.assetId) {
                const blob = await AssetManager.getAssetBlob(page.assetId);
                if (blob) {
                    const newAssetId = await AssetManager.saveAsset(blob, `copy-${page.id}`);
                    return {
                        ...page,
                        id: uuidv4(),
                        assetId: newAssetId,
                        data: newAssetId // will be saved as assetId by saveProject
                    };
                }
            }

            // Fallback: If no assetId but we have a data: URL
            if (page.data && page.data.startsWith('data:')) {
                const newAssetId = await AssetManager.saveAsset(page.data, `copy-${page.id}`);
                return { ...page, id: uuidv4(), assetId: newAssetId, data: newAssetId };
            }

            // Fallback: If we only have a blob: URL (unlikely but possible)
            if (page.data && page.data.startsWith('blob:')) {
                try {
                    const res = await fetch(page.data);
                    const blob = await res.blob();
                    const newAssetId = await AssetManager.saveAsset(blob, `copy-${page.id}`);
                    return { ...page, id: uuidv4(), assetId: newAssetId, data: newAssetId };
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                } catch (e) {
                    console.error('Failed to duplicate blob asset', page.id);
                }
            }

            return { ...page, id: uuidv4(), segments: page.segments.map(s => ({ ...s, id: uuidv4() })) };
        }));

        let newAudio = null;
        if (original.audioFile) {
            // Use ID directly if possible
            const audioId = original.audioFile.id;
            let audioBlob: Blob | null = null;

            if (audioId) {
                audioBlob = await AssetManager.getAssetBlob(audioId);
            }

            if (!audioBlob && original.audioFile.data.startsWith('blob:')) {
                try {
                    const res = await fetch(original.audioFile.data);
                    audioBlob = await res.blob();
                } catch { }
            } else if (!audioBlob && original.audioFile.data.startsWith('data:')) {
                try {
                    const res = await fetch(original.audioFile.data);
                    audioBlob = await res.blob();
                } catch { }
            }

            if (audioBlob) {
                const newAssetId = await AssetManager.saveAsset(audioBlob, `copy-audio`);
                newAudio = { ...original.audioFile, id: newAssetId, data: newAssetId };
            }
        }

        const newProject = {
            ...original,
            id: uuidv4(),
            name: `${original.name} (Copy)`,
            createdAt: Date.now(),
            modifiedAt: Date.now(),
            pages: newPages,
            audioFile: newAudio
        };

        // saveProject handles saving the project metadata. The assets are already saved above (as IDs).
        // effectively we just need to persist the project structure now.
        await this.saveProject(newProject);

        // But wait, saveProject takes `data` and checks if it starts with `data:` which it doesn't (it's UUID).
        // So it will save UUID as data.
        // And `loadProject` will see UUID, try to resolve via AssetManager.
        // This works!

        return newProject;
    }

    async exportProject(project: VisualProject): Promise<void> {
        // Web export - hydrate assets to base64
        const pages = await Promise.all(project.pages.map(async (p) => {
            if (p.assetId) {
                const blob = await AssetManager.getAssetBlob(p.assetId);
                if (blob) {
                    const reader = new FileReader();
                    const b64 = await new Promise<string>(resolve => {
                        reader.onload = () => resolve(reader.result as string);
                        reader.readAsDataURL(blob);
                    });
                    return { ...p, data: b64 };
                }
            }
            return p;
        }));

        const portable = { ...project, pages };

        const data = JSON.stringify(portable, null, 2);
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

    async cleanupUnusedAssets(): Promise<void> {
        // Web-specific cleanup is handled via Index.tsx maintenance calling AssetManager directly
        // because it needs active project IDs which it already has access to there.
    }
}
