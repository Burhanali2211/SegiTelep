// Native Storage API for Tauri Desktop Application
// Provides native filesystem access when running as desktop app,
// with fallback to IndexedDB for web preview

// Check if we're running in Tauri
export function isTauriApp(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

// Lazy import Tauri API to avoid errors in web mode
async function getTauriInvoke() {
  if (!isTauriApp()) {
    throw new Error('Not running in Tauri environment');
  }
  const { invoke } = await import('@tauri-apps/api/tauri');
  return invoke;
}

export async function getAppDataPath(): Promise<string> {
  const invoke = await getTauriInvoke();
  return invoke('get_app_data_path') as Promise<string>;
}

export async function ensureDirectory(path: string): Promise<void> {
  if (!isTauriApp()) {
    return; // No-op in browser
  }
  const invoke = await getTauriInvoke();
  await invoke('ensure_directory', { path });
}

export async function readFileBytes(path: string): Promise<Uint8Array> {
  const invoke = await getTauriInvoke();
  const bytes = await invoke('read_file_bytes', { path }) as number[];
  return new Uint8Array(bytes);
}

export async function writeFileBytes(path: string, contents: Uint8Array): Promise<void> {
  const invoke = await getTauriInvoke();
  await invoke('write_file_bytes', { 
    path, 
    contents: Array.from(contents) 
  });
}

export async function deleteFile(path: string): Promise<void> {
  const invoke = await getTauriInvoke();
  await invoke('delete_file', { path });
}

export async function listFiles(path: string): Promise<string[]> {
  const invoke = await getTauriInvoke();
  return invoke('list_files', { path }) as Promise<string[]>;
}

export async function fileExists(path: string): Promise<boolean> {
  if (!isTauriApp()) {
    return false;
  }
  const invoke = await getTauriInvoke();
  return invoke('file_exists', { path }) as Promise<boolean>;
}

// Helper to read text file
export async function readTextFile(path: string): Promise<string> {
  const bytes = await readFileBytes(path);
  return new TextDecoder().decode(bytes);
}

// Helper to write text file
export async function writeTextFile(path: string, content: string): Promise<void> {
  const bytes = new TextEncoder().encode(content);
  await writeFileBytes(path, bytes);
}

// Helper to read JSON file
export async function readJsonFile<T>(path: string): Promise<T> {
  const content = await readTextFile(path);
  return JSON.parse(content) as T;
}

// Helper to write JSON file
export async function writeJsonFile<T>(path: string, data: T): Promise<void> {
  const content = JSON.stringify(data, null, 2);
  await writeTextFile(path, content);
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
  };
  return map[mimeType] || 'bin';
}
