import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Project } from '@/types/teleprompter.types';
import { UserProfile } from '@/types/user.types';

export interface TeleprompterDB extends DBSchema {
    projects: {
        key: string;
        value: Project;
        indexes: { 'by-name': string; 'by-modified': number };
    };
    assets: {
        key: string;
        value: { id: string; data: Blob; type: string; name: string };
    };
    user_profile: {
        key: string;
        value: UserProfile;
    };
}

export const DB_NAME = 'teleprompter-db';
export const DB_VERSION = 4;

let dbInstance: IDBPDatabase<TeleprompterDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<TeleprompterDB>> {
    if (dbInstance) return dbInstance;

    dbInstance = await openDB<TeleprompterDB>(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion) {
            if (oldVersion < 1) {
                const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
                projectStore.createIndex('by-name', 'name');
                projectStore.createIndex('by-modified', 'modifiedAt');
            }

            if (oldVersion < 3) {
                if (!db.objectStoreNames.contains('assets')) {
                    db.createObjectStore('assets', { keyPath: 'id' });
                }
            }

            if (oldVersion < 4) {
                if (!db.objectStoreNames.contains('user_profile')) {
                    db.createObjectStore('user_profile', { keyPath: 'id' });
                }
            }
        },
    });

    return dbInstance;
}
