import { AssetManager } from './AssetManager';
import { loadAudioFile } from './AudioStorage';
import { isTauriApp, convertPathToSrc, getAbsolutePath } from './NativeStorage';

/**
 * AudioResolver provides a unified interface to get a usable URL 
 * for an audio file from any storage source.
 */
export const AudioResolver = {
    /**
     * Resolves an ID or path to a usable URL.
     * Priority:
     * 1. Data URLs / Blob URLs (return as-is)
     * 2. Already-converted asset:// URLs (return as-is)
     * 3. AssetManager (Project-specific assets via IDB)
     * 4. AudioStorage (Global Audio Library via IDB)
     * 5. Native Filesystem (relative path → absolute → asset://)
     */
    async resolve(idOrPath: string, persistentId?: string): Promise<string | null> {
        if (!idOrPath) return null;

        // 1. Direct URLs — already usable
        if (
            idOrPath.startsWith('data:') ||
            idOrPath.startsWith('blob:') ||
            idOrPath.startsWith('asset://')
        ) {
            return idOrPath;
        }

        // 2. Try AssetManager (IDB - Local Project)
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

        // 4. Native Filesystem Path (relative path like "global_assets/abc.mp3")
        // Must resolve to absolute first — tauriConvertFileSrc requires an absolute path
        if (isTauriApp() && (idOrPath.includes('/') || idOrPath.includes('\\'))) {
            try {
                const fullPath = await getAbsolutePath(idOrPath);
                return convertPathToSrc(fullPath);
            } catch {
                // If getAbsolutePath fails, try direct conversion as last resort
                return convertPathToSrc(idOrPath);
            }
        }

        return null;
    }
};
