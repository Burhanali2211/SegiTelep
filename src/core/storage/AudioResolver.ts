import { AssetManager } from './AssetManager';
import { loadAudioFile } from './AudioStorage';
import { isTauriApp, convertPathToSrc } from './NativeStorage';

/**
 * AudioResolver provides a unified interface to get a usable URL 
 * for an audio file from any storage source.
 */
export const AudioResolver = {
    /**
     * Resolves an ID or path to a usable URL.
     * Priority:
     * 1. Data URLs / Blob URLs (return as-is)
     * 2. AssetManager (Project-specific assets)
     * 3. AudioStorage (Global Audio Library)
     * 4. Native Filesystem (if path provided)
     */
    async resolve(idOrPath: string, persistentId?: string): Promise<string | null> {
        if (!idOrPath) return null;

        // 1. Direct URLs
        if (idOrPath.startsWith('data:') || idOrPath.startsWith('blob:')) {
            return idOrPath;
        }

        // 2. Try AssetManager (Local Project)
        const projectUrl = await AssetManager.getAssetUrl(idOrPath);
        if (projectUrl) return projectUrl;

        // Also try persistentId if provided
        if (persistentId) {
            const projectUrlFromId = await AssetManager.getAssetUrl(persistentId);
            if (projectUrlFromId) return projectUrlFromId;
        }

        // 3. Try AudioStorage (Global Library)
        const libraryFile = await loadAudioFile(idOrPath);
        if (libraryFile && libraryFile.data) return libraryFile.data;

        if (persistentId) {
            const libraryFileFromId = await loadAudioFile(persistentId);
            if (libraryFileFromId && libraryFileFromId.data) return libraryFileFromId.data;
        }

        // 4. Native Filesystem Path
        if (isTauriApp() && (idOrPath.includes('/') || idOrPath.includes('\\'))) {
            return convertPathToSrc(idOrPath);
        }

        return null;
    }
};
