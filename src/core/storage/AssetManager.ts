import { openDB, IDBPDatabase, DBSchema } from 'idb';
import { v4 as uuidv4 } from 'uuid';

const DB_NAME = 'visual-teleprompter-db';
const DB_VERSION = 3;

export interface Asset {
    id: string;
    data: Blob;
    type: string;
    name: string;
}

const MAX_URL_CACHE = 50;
const objectUrlMap = new Map<string, string>();
const cacheQueue: string[] = []; // Tracking IDs for FIFO eviction

interface AssetDB extends DBSchema {
    assets: {
        key: string;
        value: Asset;
    };
}


let dbPromise: Promise<IDBPDatabase<AssetDB>> | null = null;

function getDB(): Promise<IDBPDatabase<AssetDB>> {
    if (!dbPromise) {
        dbPromise = openDB<AssetDB>(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion) {
                if (oldVersion < 3) {
                    if (!db.objectStoreNames.contains('assets')) {
                        db.createObjectStore('assets', { keyPath: 'id' });
                    }
                }
            },
        });
    }
    return dbPromise;
}

export const AssetManager = {
    /**
     * Save a file (Base64 or Blob) to IndexedDB
     */
    async saveAsset(data: string | Blob, name: string = 'asset'): Promise<string> {
        const id = uuidv4();
        let blob: Blob;
        let type: string;

        if (typeof data === 'string') {
            try {
                if (data.startsWith('data:')) {
                    // Optimized path for data URLs: avoid fetch
                    const [header, base64] = data.split(',');
                    const mimeMatch = header.match(/:(.*?);/);
                    type = mimeMatch ? mimeMatch[1] : 'application/octet-stream';

                    const binary = atob(base64);
                    const bytes = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) {
                        bytes[i] = binary.charCodeAt(i);
                    }
                    blob = new Blob([bytes], { type });
                } else {
                    // Fallback for blob URLs or other strings
                    const response = await fetch(data);
                    if (!response.ok) throw new Error(`Fetch failed with status ${response.status}`);
                    blob = await response.blob();
                    type = blob.type;
                }
            } catch (err) {
                console.error('AssetManager: Failed to process data string', err);
                throw new Error(`Failed to process asset data: ${err instanceof Error ? err.message : String(err)}`);
            }
        } else {
            blob = data;
            type = data.type;
        }

        const db = await getDB();
        await db.put('assets', { id, data: blob, type, name });

        return id;
    },

    /**
     * Load a Blob from IndexedDB and return an Object URL
     */
    async getAssetUrl(id: string): Promise<string | null> {
        if (objectUrlMap.has(id)) {
            // Move to end of queue (as it was recently used)
            const idx = cacheQueue.indexOf(id);
            if (idx > -1) cacheQueue.splice(idx, 1);
            cacheQueue.push(id);
            return objectUrlMap.get(id)!;
        }

        const db = await getDB();
        const asset = await db.get('assets', id);

        if (!asset) return null;

        // Manage cache size before adding new
        if (cacheQueue.length >= MAX_URL_CACHE) {
            const oldestId = cacheQueue.shift();
            if (oldestId) {
                const url = objectUrlMap.get(oldestId);
                if (url) URL.revokeObjectURL(url);
                objectUrlMap.delete(oldestId);
            }
        }

        const url = URL.createObjectURL(asset.data);
        objectUrlMap.set(id, url);
        cacheQueue.push(id);
        return url;
    },

    /**
     * Directly get the Blob from IndexedDB
     */
    async getAssetBlob(id: string): Promise<Blob | null> {
        const db = await getDB();
        const asset = await db.get('assets', id);
        return asset ? asset.data : null;
    },

    /**
     * Clean up an Object URL for a specific asset
     */
    revokeAssetUrl(id: string) {
        const url = objectUrlMap.get(id);
        if (url) {
            URL.revokeObjectURL(url);
            objectUrlMap.delete(id);
        }
    },

    /**
     * Delete an asset from IndexedDB and clean up Object URL
     */
    async deleteAsset(id: string): Promise<void> {
        this.revokeAssetUrl(id);
        const db = await getDB();
        await db.delete('assets', id);
    },

    /**
     * Delete multiple assets from IndexedDB
     */
    async deleteAssets(ids: string[]): Promise<void> {
        if (ids.length === 0) return;
        const db = await getDB();
        const tx = db.transaction('assets', 'readwrite');
        await Promise.all([
            ...ids.map((id) => {
                this.revokeAssetUrl(id);
                return tx.store.delete(id);
            }),
            tx.done,
        ]);
    },

    /**
     * Remove assets that are not referenced by any project
     * To be called during app startup or maintenance
     */
    async cleanupOrphanedAssets(activeAssetIds: Set<string>): Promise<number> {
        const db = await getDB();
        const allKeys = await db.getAllKeys('assets');
        const orphans = allKeys.filter(key => !activeAssetIds.has(key as string));

        if (orphans.length > 0) {
            await this.deleteAssets(orphans as string[]);
        }

        return orphans.length;
    },

    /**
     * Revoke all known object URLs
     */
    revokeAll() {
        objectUrlMap.forEach((url) => URL.revokeObjectURL(url));
        objectUrlMap.clear();
    }
};
