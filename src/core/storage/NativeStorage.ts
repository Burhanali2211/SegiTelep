// Native Storage API for Tauri Desktop Application
// Uses @tauri-apps/plugin-fs with BaseDirectory.AppData and relative paths
// Falls back to IndexedDB/localStorage for web preview

import {
  BaseDirectory,
  exists,
  mkdir,
  readFile,
  readDir,
  readTextFile as fsReadTextFile,
  remove,
  writeFile,
  writeTextFile as fsWriteTextFile,
} from '@tauri-apps/plugin-fs';

// Check if we're running in Tauri
export function isTauriApp(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

const APP_DATA_BASE = BaseDirectory.AppData;

// Guard: throw if not in Tauri (for functions that require native fs)
function requireTauri(): void {
  if (!isTauriApp()) {
    throw new Error('Not running in Tauri environment');
  }
}

// Get app data path - for compatibility; returns empty string when not in Tauri
export async function getAppDataPath(): Promise<string> {
  if (!isTauriApp()) return '';
  try {
    const { appDataDir } = await import('@tauri-apps/api/path');
    return appDataDir();
  } catch {
    return '';
  }
}

export async function ensureDirectory(relativePath: string): Promise<void> {
  if (!isTauriApp()) return;
  await mkdir(relativePath, { baseDir: APP_DATA_BASE, recursive: true });
}

export async function readFileBytes(relativePath: string): Promise<Uint8Array> {
  requireTauri();
  return readFile(relativePath, { baseDir: APP_DATA_BASE });
}

export async function writeFileBytes(relativePath: string, contents: Uint8Array): Promise<void> {
  requireTauri();
  await writeFile(relativePath, contents, { baseDir: APP_DATA_BASE });
}

export async function deleteFile(relativePath: string): Promise<void> {
  if (!isTauriApp()) return;
  await remove(relativePath, { baseDir: APP_DATA_BASE });
}

// List entries in directory - returns names of files and subdirectories
export async function listFiles(relativePath: string): Promise<string[]> {
  if (!isTauriApp()) return [];
  const entries = await readDir(relativePath, { baseDir: APP_DATA_BASE });
  return entries.map((e) => e.name);
}

// Remove directory recursively (for project deletion)
export async function removeDirectoryRecursive(relativePath: string): Promise<void> {
  if (!isTauriApp()) return;
  await remove(relativePath, { baseDir: APP_DATA_BASE, recursive: true });
}

export async function fileExists(relativePath: string): Promise<boolean> {
  if (!isTauriApp()) return false;
  return exists(relativePath, { baseDir: APP_DATA_BASE });
}

// Helper to read text file
export async function readTextFile(relativePath: string): Promise<string> {
  requireTauri();
  return fsReadTextFile(relativePath, { baseDir: APP_DATA_BASE });
}

// Helper to write text file
async function writeTextFileToFs(path: string, content: string): Promise<void> {
  requireTauri();
  await fsWriteTextFile(path, content, { baseDir: APP_DATA_BASE });
}

// Helper to read JSON file
export async function readJsonFile<T>(relativePath: string): Promise<T> {
  requireTauri();
  const content = await fsReadTextFile(relativePath, { baseDir: APP_DATA_BASE });
  return JSON.parse(content) as T;
}

// Helper to write JSON file
export async function writeJsonFile<T>(relativePath: string, data: T): Promise<void> {
  const content = JSON.stringify(data, null, 2);
  await writeTextFileToFs(relativePath, content);
}

// Convert base64 data URL to Uint8Array
export function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mimeType: string } {
  const [header, base64Data] = dataUrl.split(',');
  const mimeType = header.match(/:(.*?);/)?.[1] || 'application/octet-stream';
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return { bytes, mimeType };
}

// Convert Uint8Array to base64 data URL
export function bytesToDataUrl(bytes: Uint8Array, mimeType: string): string {
  let binaryString = '';
  for (let i = 0; i < bytes.length; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binaryString);
  return `data:${mimeType};base64,${base64}`;
}

// Get file extension from mime type
export function getExtensionFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/wave': 'wav',
    'audio/ogg': 'ogg',
    'audio/m4a': 'm4a',
    'audio/x-m4a': 'm4a',
    'audio/mp4': 'm4a',
    'audio/aac': 'aac',
    'application/json': 'json',
    'application/pdf': 'pdf',
  };
  return map[mimeType] || 'bin';
}
