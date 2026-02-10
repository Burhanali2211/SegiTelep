// Native Audio Storage for Tauri Desktop Application
// Uses filesystem for unlimited audio storage, falls back to IndexedDB for web
// (IndexedDB has ~50MB+ quota vs localStorage ~5MB, fixing storage-full errors)

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  isTauriApp, 
  ensureDirectory, 
  readJsonFile, 
  writeJsonFile,
  readFileBytes,
  writeFileBytes,
  deleteFile,
  dataUrlToBytes,
  bytesToDataUrl,
  getExtensionFromMimeType,
  fileExists,
} from './NativeStorage';
import { AudioFile, AUDIO_STORAGE_KEY } from '@/components/Teleprompter/AudioManager/types';

// Audio file metadata (without binary data for native storage)
interface AudioFileMetadata {
  id: string;
  name: string;
  duration: number;
  size: number;
  type: string;
  createdAt: number;
  filePath: string;
}

// ============= Native Filesystem Storage (Tauri) =============
// Uses relative paths under BaseDirectory.AppData

const AUDIO_DIR = 'audio-library';
const METADATA_PATH = `${AUDIO_DIR}/metadata.json`;

async function ensureAudioDir(): Promise<void> {
  await ensureDirectory(AUDIO_DIR);
}

async function loadMetadataNative(): Promise<AudioFileMetadata[]> {
  try {
    if (await fileExists(METADATA_PATH)) {
      return await readJsonFile<AudioFileMetadata[]>(METADATA_PATH);
    }
  } catch (error) {
    console.error('Failed to load audio metadata:', error);
  }
  return [];
}

async function saveMetadataNative(metadata: AudioFileMetadata[]): Promise<void> {
  await ensureAudioDir();
  await writeJsonFile(METADATA_PATH, metadata);
}

async function saveAudioFileNative(audioFile: AudioFile): Promise<void> {
  await ensureAudioDir();
  
  // Save audio binary to file (relative path)
  const { bytes, mimeType } = dataUrlToBytes(audioFile.data);
  const ext = getExtensionFromMimeType(mimeType);
  const filePath = `${AUDIO_DIR}/${audioFile.id}.${ext}`;
  await writeFileBytes(filePath, bytes);
  
  // Update metadata
  const metadata = await loadMetadataNative();
  const newMetadata: AudioFileMetadata = {
    id: audioFile.id,
    name: audioFile.name,
    duration: audioFile.duration,
    size: audioFile.size,
    type: audioFile.type,
    createdAt: audioFile.createdAt,
    filePath,
  };
  
  const existingIndex = metadata.findIndex(m => m.id === audioFile.id);
  if (existingIndex >= 0) {
    metadata[existingIndex] = newMetadata;
  } else {
    metadata.push(newMetadata);
  }
  
  await saveMetadataNative(metadata);
}

async function loadAudioFileNative(id: string): Promise<AudioFile | undefined> {
  const metadata = await loadMetadataNative();
  const meta = metadata.find(m => m.id === id);
  if (!meta) return undefined;
  
  try {
    // Handle legacy absolute paths - extract relative part
    let filePath = meta.filePath;
    const match = filePath.match(/(?:audio-library\/|projects\/).+$/);
    if (match) filePath = match[0];
    const bytes = await readFileBytes(filePath);
    const dataUrl = bytesToDataUrl(bytes, meta.type);
    
    return {
      id: meta.id,
      name: meta.name,
      data: dataUrl,
      duration: meta.duration,
      size: meta.size,
      type: meta.type,
      createdAt: meta.createdAt,
    };
  } catch (error) {
    console.error('Failed to load audio file:', error);
    return undefined;
  }
}

async function deleteAudioFileNative(id: string): Promise<void> {
  const metadata = await loadMetadataNative();
  const meta = metadata.find(m => m.id === id);
  
  if (meta) {
    try {
      await deleteFile(meta.filePath);
    } catch (error) {
      console.error('Failed to delete audio file:', error);
    }
    
    const newMetadata = metadata.filter(m => m.id !== id);
    await saveMetadataNative(newMetadata);
  }
}

async function getAllAudioFilesNative(): Promise<AudioFile[]> {
  const metadata = await loadMetadataNative();
  
  // Load all files with their binary data
  const files: AudioFile[] = [];
  for (const meta of metadata) {
    try {
      const bytes = await readFileBytes(meta.filePath);
      const dataUrl = bytesToDataUrl(bytes, meta.type);
      
      files.push({
        id: meta.id,
        name: meta.name,
        data: dataUrl,
        duration: meta.duration,
        size: meta.size,
        type: meta.type,
        createdAt: meta.createdAt,
      });
    } catch (error) {
      console.error('Failed to load audio file:', meta.id, error);
    }
  }
  
  return files;
}

// ============= IndexedDB Storage (Web Fallback) =============
// IndexedDB supports hundreds of MB vs localStorage ~5MB - fixes audio upload limits

interface AudioDB extends DBSchema {
  audioFiles: {
    key: string;
    value: AudioFile;
    indexes: { 'by-created': number };
  };
}

const AUDIO_DB_NAME = 'teleprompter-audio-db';
const AUDIO_DB_VERSION = 1;
const MIGRATED_KEY = 'teleprompter_audio_migrated';
let audioDbInstance: IDBPDatabase<AudioDB> | null = null;

async function getAudioDB(): Promise<IDBPDatabase<AudioDB>> {
  if (audioDbInstance) return audioDbInstance;
  audioDbInstance = await openDB<AudioDB>(AUDIO_DB_NAME, AUDIO_DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore('audioFiles', { keyPath: 'id' });
      store.createIndex('by-created', 'createdAt');
    },
  });
  return audioDbInstance;
}

// Migrate legacy localStorage data to IndexedDB (one-time)
async function migrateFromLocalStorageOnce(db: IDBPDatabase<AudioDB>): Promise<void> {
  if (localStorage.getItem(MIGRATED_KEY)) return;
  try {
    const stored = localStorage.getItem(AUDIO_STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(MIGRATED_KEY, '1');
      return;
    }
    const files = JSON.parse(stored) as AudioFile[];
    if (!Array.isArray(files) || files.length === 0) {
      localStorage.setItem(MIGRATED_KEY, '1');
      localStorage.removeItem(AUDIO_STORAGE_KEY);
      return;
    }
    const tx = db.transaction('audioFiles', 'readwrite');
    for (const file of files) {
      if (file?.id && file?.data) {
        await tx.store.put(file);
      }
    }
    await tx.done;
    localStorage.removeItem(AUDIO_STORAGE_KEY);
  } catch {
    // Ignore migration errors
  }
  localStorage.setItem(MIGRATED_KEY, '1');
}

function isQuotaError(e: unknown): boolean {
  if (e instanceof DOMException) {
    return e.name === 'QuotaExceededError' || e.name === 'UnknownError';
  }
  if (e instanceof Error) {
    return e.name === 'QuotaExceededError' || /quota|storage|full/i.test(e.message);
  }
  return false;
}

async function saveAudioFileWeb(audioFile: AudioFile): Promise<void> {
  try {
    const db = await getAudioDB();
    await migrateFromLocalStorageOnce(db);
    await db.put('audioFiles', audioFile);
  } catch (e) {
    if (isQuotaError(e)) {
      throw new Error('Storage limit reached. Delete some audio files or use the desktop app for unlimited storage.');
    }
    throw e;
  }
}

async function loadAudioFileWeb(id: string): Promise<AudioFile | undefined> {
  const db = await getAudioDB();
  await migrateFromLocalStorageOnce(db);
  return db.get('audioFiles', id);
}

async function deleteAudioFileWeb(id: string): Promise<void> {
  const db = await getAudioDB();
  await db.delete('audioFiles', id);
}

async function getAllAudioFilesWeb(): Promise<AudioFile[]> {
  const db = await getAudioDB();
  await migrateFromLocalStorageOnce(db);
  const files = await db.getAll('audioFiles');
  return files.sort((a, b) => a.createdAt - b.createdAt);
}

async function renameAudioFileWeb(id: string, newName: string): Promise<void> {
  const db = await getAudioDB();
  const file = await db.get('audioFiles', id);
  if (file) {
    file.name = newName;
    await db.put('audioFiles', file);
  }
}

// ============= Public API (Automatic Platform Detection) =============

export async function saveAudioFile(audioFile: AudioFile): Promise<void> {
  if (isTauriApp()) {
    await saveAudioFileNative(audioFile);
  } else {
    await saveAudioFileWeb(audioFile);
  }
}

export async function loadAudioFile(id: string): Promise<AudioFile | undefined> {
  if (isTauriApp()) {
    return loadAudioFileNative(id);
  } else {
    return loadAudioFileWeb(id);
  }
}

export async function deleteAudioFile(id: string): Promise<void> {
  if (isTauriApp()) {
    await deleteAudioFileNative(id);
  } else {
    await deleteAudioFileWeb(id);
  }
}

export async function getAllAudioFiles(): Promise<AudioFile[]> {
  if (isTauriApp()) {
    return getAllAudioFilesNative();
  } else {
    return getAllAudioFilesWeb();
  }
}

export async function renameAudioFile(id: string, newName: string): Promise<void> {
  if (isTauriApp()) {
    const metadata = await loadMetadataNative();
    const meta = metadata.find(m => m.id === id);
    if (meta) {
      meta.name = newName;
      await saveMetadataNative(metadata);
    }
  } else {
    await renameAudioFileWeb(id, newName);
  }
}

// Check if running in desktop mode
export function isDesktopAudioStorage(): boolean {
  return isTauriApp();
}
