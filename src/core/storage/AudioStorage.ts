// Native Audio Storage for Tauri Desktop Application
// Uses filesystem for unlimited audio storage, falls back to localStorage for web

import { v4 as uuidv4 } from 'uuid';
import { 
  isTauriApp, 
  getAppDataPath, 
  ensureDirectory, 
  readJsonFile, 
  writeJsonFile,
  readFileBytes,
  writeFileBytes,
  deleteFile,
  listFiles,
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

async function getAudioDir(): Promise<string> {
  const appData = await getAppDataPath();
  const audioDir = `${appData}/audio-library`;
  await ensureDirectory(audioDir);
  return audioDir;
}

async function getMetadataPath(): Promise<string> {
  const audioDir = await getAudioDir();
  return `${audioDir}/metadata.json`;
}

async function loadMetadataNative(): Promise<AudioFileMetadata[]> {
  try {
    const metadataPath = await getMetadataPath();
    if (await fileExists(metadataPath)) {
      return await readJsonFile<AudioFileMetadata[]>(metadataPath);
    }
  } catch (error) {
    console.error('Failed to load audio metadata:', error);
  }
  return [];
}

async function saveMetadataNative(metadata: AudioFileMetadata[]): Promise<void> {
  const metadataPath = await getMetadataPath();
  await writeJsonFile(metadataPath, metadata);
}

async function saveAudioFileNative(audioFile: AudioFile): Promise<void> {
  const audioDir = await getAudioDir();
  
  // Save audio binary to file
  const { bytes, mimeType } = dataUrlToBytes(audioFile.data);
  const ext = getExtensionFromMimeType(mimeType);
  const filePath = `${audioDir}/${audioFile.id}.${ext}`;
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
    const bytes = await readFileBytes(meta.filePath);
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

// ============= localStorage Storage (Web Fallback) =============

function saveAudioFilesWeb(files: AudioFile[]): void {
  try {
    localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(files));
  } catch (e) {
    console.error('Failed to save audio files to localStorage:', e);
    throw new Error('Storage quota exceeded. Please delete some audio files.');
  }
}

function loadAudioFilesWeb(): AudioFile[] {
  try {
    const stored = localStorage.getItem(AUDIO_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as AudioFile[];
    }
  } catch (e) {
    console.error('Failed to load audio files from localStorage:', e);
  }
  return [];
}

// ============= Public API (Automatic Platform Detection) =============

export async function saveAudioFile(audioFile: AudioFile): Promise<void> {
  if (isTauriApp()) {
    await saveAudioFileNative(audioFile);
  } else {
    const files = loadAudioFilesWeb();
    const existingIndex = files.findIndex(f => f.id === audioFile.id);
    if (existingIndex >= 0) {
      files[existingIndex] = audioFile;
    } else {
      files.push(audioFile);
    }
    saveAudioFilesWeb(files);
  }
}

export async function loadAudioFile(id: string): Promise<AudioFile | undefined> {
  if (isTauriApp()) {
    return loadAudioFileNative(id);
  } else {
    const files = loadAudioFilesWeb();
    return files.find(f => f.id === id);
  }
}

export async function deleteAudioFile(id: string): Promise<void> {
  if (isTauriApp()) {
    await deleteAudioFileNative(id);
  } else {
    const files = loadAudioFilesWeb();
    const newFiles = files.filter(f => f.id !== id);
    saveAudioFilesWeb(newFiles);
  }
}

export async function getAllAudioFiles(): Promise<AudioFile[]> {
  if (isTauriApp()) {
    return getAllAudioFilesNative();
  } else {
    return loadAudioFilesWeb();
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
    const files = loadAudioFilesWeb();
    const file = files.find(f => f.id === id);
    if (file) {
      file.name = newName;
      saveAudioFilesWeb(files);
    }
  }
}

// Check if running in desktop mode
export function isDesktopAudioStorage(): boolean {
  return isTauriApp();
}
