// Native Audio Storage for Tauri Desktop Application
// Uses filesystem for unlimited audio storage, falls back to IndexedDB for web
// (IndexedDB has ~50MB+ quota vs localStorage ~5MB, fixing storage-full errors)

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  isTauriApp,
  ensureDirectory,
  readJsonFile,
  writeJsonFile,
  atomicWriteJsonFile,
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
  await atomicWriteJsonFile(METADATA_PATH, metadata);
}

async function saveAudioFileNative(audioFile: AudioFile, binaryData?: Blob | ArrayBuffer | Uint8Array): Promise<void> {
  await ensureAudioDir();

  let bytes: Uint8Array;
  let mimeType = audioFile.type;

  if (binaryData) {
    if (binaryData instanceof Blob) {
      bytes = new Uint8Array(await binaryData.arrayBuffer());
    } else if (binaryData instanceof ArrayBuffer) {
      bytes = new Uint8Array(binaryData);
    } else {
      bytes = binaryData;
    }
  } else if (audioFile.data.startsWith('data:')) {
    const converted = dataUrlToBytes(audioFile.data);
    bytes = converted.bytes;
    mimeType = converted.mimeType;
  } else {
    throw new Error('No binary data provided for audio storage');
  }

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
    // 1. Convert relative path to absolute protocol URL for high-performance streaming
    // Instead of reading bytes and converting to dataUrl (slow, memory-heavy),
    // we use convertFileSrc to get a direct URL to the file on disk.

    // Check if we have an absolute path utility
    const { getAbsolutePath, convertPathToSrc } = await import('./NativeStorage');
    const absPath = await getAbsolutePath(meta.filePath);
    const audioUrl = convertPathToSrc(absPath);

    return {
      id: meta.id,
      name: meta.name,
      data: audioUrl, // Direct high-speed asset URL
      duration: meta.duration,
      size: meta.size,
      type: meta.type,
      createdAt: meta.createdAt,
    };
  } catch (error) {
    console.error('Failed to load audio file URL:', error);
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
  const { getAbsolutePath, convertPathToSrc } = await import('./NativeStorage');

  // Load metadata only, generate live asset URLs dynamically
  // This is extremely fast and doesn't consume memory for binaries
  const files: AudioFile[] = await Promise.all(metadata.map(async (meta) => {
    try {
      const absPath = await getAbsolutePath(meta.filePath);
      const audioUrl = convertPathToSrc(absPath);

      return {
        id: meta.id,
        name: meta.name,
        data: audioUrl,
        duration: meta.duration,
        size: meta.size,
        type: meta.type,
        createdAt: meta.createdAt,
      };
    } catch (error) {
      console.error('Failed to map audio file URL:', meta.id, error);
      // Return partial metadata even if path conversion fails
      return {
        id: meta.id,
        name: meta.name,
        data: '',
        duration: meta.duration,
        size: meta.size,
        type: meta.type,
        createdAt: meta.createdAt,
      };
    }
  }));

  return files.sort((a, b) => b.createdAt - a.createdAt);
}

// ============= IndexedDB Storage (Web Fallback) =============
// IndexedDB supports hundreds of MB vs localStorage ~5MB - fixes audio upload limits

interface AudioDB extends DBSchema {
  audioFiles: {
    key: string;
    value: {
      id: string;
      name: string;
      duration: number;
      size: number;
      type: string;
      createdAt: number;
      blob: Blob; // Store binary data as Blob
    };
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
        let blob: Blob;
        if (file.data.startsWith('data:')) {
          const { bytes, mimeType } = dataUrlToBytes(file.data);
          // Use buffer slice to ensure compatibility
          blob = new Blob([bytes.buffer as any], { type: mimeType });
        } else {
          // If already a blob URL (unlikely in localStorage), skip or handle
          continue;
        }

        await tx.store.put({
          id: file.id,
          name: file.name,
          duration: file.duration,
          size: file.size,
          type: file.type,
          createdAt: file.createdAt,
          blob,
        });
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

async function saveAudioFileWeb(audioFile: AudioFile, binaryData?: Blob | ArrayBuffer | Uint8Array): Promise<void> {
  try {
    const db = await getAudioDB();
    await migrateFromLocalStorageOnce(db);

    let blob: Blob;
    if (binaryData) {
      if (binaryData instanceof Blob) {
        blob = binaryData;
      } else {
        // Force cast to any for BlobPart compatibility with different ArrayBuffer versions
        blob = new Blob([binaryData as any], { type: audioFile.type });
      }
    } else if (audioFile.data.startsWith('data:')) {
      const { bytes, mimeType } = dataUrlToBytes(audioFile.data);
      blob = new Blob([bytes.buffer as any], { type: mimeType });
    } else if (audioFile.data.startsWith('blob:')) {
      const res = await fetch(audioFile.data);
      blob = await res.blob();
    } else {
      throw new Error('Invalid audio data format for web storage');
    }

    await db.put('audioFiles', {
      id: audioFile.id,
      name: audioFile.name,
      duration: audioFile.duration,
      size: audioFile.size,
      type: audioFile.type,
      createdAt: audioFile.createdAt,
      blob,
    });
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
  const entry = await db.get('audioFiles', id);
  if (!entry) return undefined;

  return {
    id: entry.id,
    name: entry.name,
    duration: entry.duration,
    size: entry.size,
    type: entry.type,
    createdAt: entry.createdAt,
    data: URL.createObjectURL(entry.blob),
  };
}

async function deleteAudioFileWeb(id: string): Promise<void> {
  const db = await getAudioDB();
  await db.delete('audioFiles', id);
}

async function getAllAudioFilesWeb(): Promise<AudioFile[]> {
  const db = await getAudioDB();
  await migrateFromLocalStorageOnce(db);
  const entries = await db.getAll('audioFiles');

  return entries
    .sort((a, b) => a.createdAt - b.createdAt)
    .map(entry => ({
      id: entry.id,
      name: entry.name,
      duration: entry.duration,
      size: entry.size,
      type: entry.type,
      createdAt: entry.createdAt,
      data: URL.createObjectURL(entry.blob),
    }));
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

export async function saveAudioFile(audioFile: AudioFile, binaryData?: Blob | ArrayBuffer | Uint8Array): Promise<void> {
  if (isTauriApp()) {
    await saveAudioFileNative(audioFile, binaryData);
  } else {
    await saveAudioFileWeb(audioFile, binaryData);
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
