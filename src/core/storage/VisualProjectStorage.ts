// Project Storage with Native Filesystem Support
// Uses Tauri native filesystem when available, falls back to IndexedDB for web preview

import { openDB, DBSchema, IDBPDatabase } from 'idb';
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
} from './NativeStorage';
import { ImagePage, VisualSegment } from '@/components/Teleprompter/VisualEditor/useVisualEditorState';

// Project metadata (stored in JSON, without binary data)
export interface ProjectMetadata {
  id: string;
  name: string;
  createdAt: number;
  modifiedAt: number;
  pageCount: number;
  audioFileName: string | null;
}

// Full project with binary data resolved
export interface VisualProject {
  id: string;
  name: string;
  createdAt: number;
  modifiedAt: number;
  pages: ImagePage[];
  audioFile: { id: string; name: string; data: string; duration: number } | null;
}

// IndexedDB schema for web fallback
interface VisualProjectDB extends DBSchema {
  visualProjects: {
    key: string;
    value: VisualProject;
    indexes: { 'by-name': string; 'by-modified': number };
  };
}

const DB_NAME = 'visual-teleprompter-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<VisualProjectDB> | null = null;

async function getDB(): Promise<IDBPDatabase<VisualProjectDB>> {
  if (dbInstance) return dbInstance;
  
  dbInstance = await openDB<VisualProjectDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore('visualProjects', { keyPath: 'id' });
      store.createIndex('by-name', 'name');
      store.createIndex('by-modified', 'modifiedAt');
    },
  });
  
  return dbInstance;
}

// Deep clone helper to ensure data is serializable
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ============= Native Filesystem Storage (Tauri) =============

async function getProjectsDir(): Promise<string> {
  const appData = await getAppDataPath();
  const projectsDir = `${appData}/projects`;
  await ensureDirectory(projectsDir);
  return projectsDir;
}

async function getProjectDir(projectId: string): Promise<string> {
  const projectsDir = await getProjectsDir();
  const projectDir = `${projectsDir}/${projectId}`;
  await ensureDirectory(projectDir);
  await ensureDirectory(`${projectDir}/images`);
  await ensureDirectory(`${projectDir}/audio`);
  return projectDir;
}

async function saveProjectNative(project: VisualProject): Promise<void> {
  const projectDir = await getProjectDir(project.id);
  
  // Save page images to files
  const pagesWithRefs = await Promise.all(project.pages.map(async (page, index) => {
    if (page.data.startsWith('data:')) {
      const { bytes, mimeType } = dataUrlToBytes(page.data);
      const ext = getExtensionFromMimeType(mimeType);
      const imagePath = `${projectDir}/images/page_${index}_${page.id}.${ext}`;
      await writeFileBytes(imagePath, bytes);
      
      return {
        ...page,
        data: `file://${imagePath}`, // Store file reference
        _mimeType: mimeType,
      };
    }
    return page;
  }));
  
  // Save audio file if present
  let audioRef = null;
  if (project.audioFile && project.audioFile.data.startsWith('data:')) {
    const { bytes, mimeType } = dataUrlToBytes(project.audioFile.data);
    const ext = getExtensionFromMimeType(mimeType);
    const audioPath = `${projectDir}/audio/${project.audioFile.id}.${ext}`;
    await writeFileBytes(audioPath, bytes);
    
    audioRef = {
      id: project.audioFile.id,
      name: project.audioFile.name,
      path: audioPath,
      duration: project.audioFile.duration,
      mimeType,
    };
  }
  
  // Save project metadata
  const metadata = {
    id: project.id,
    name: project.name,
    createdAt: project.createdAt,
    modifiedAt: Date.now(),
    pages: pagesWithRefs.map(p => ({
      ...p,
      segments: p.segments, // Keep segments in metadata
    })),
    audioFile: audioRef,
  };
  
  await writeJsonFile(`${projectDir}/project.json`, metadata);
}

async function loadProjectNative(projectId: string): Promise<VisualProject | undefined> {
  try {
    const projectDir = await getProjectDir(projectId);
    const metadata = await readJsonFile<any>(`${projectDir}/project.json`);
    
    // Load page images from files
    const pages = await Promise.all(metadata.pages.map(async (page: any) => {
      if (page.data.startsWith('file://')) {
        const filePath = page.data.replace('file://', '');
        const bytes = await readFileBytes(filePath);
        const mimeType = page._mimeType || 'image/jpeg';
        const dataUrl = bytesToDataUrl(bytes, mimeType);
        return { ...page, data: dataUrl };
      }
      return page;
    }));
    
    // Load audio file if present
    let audioFile = null;
    if (metadata.audioFile) {
      const bytes = await readFileBytes(metadata.audioFile.path);
      const dataUrl = bytesToDataUrl(bytes, metadata.audioFile.mimeType);
      audioFile = {
        id: metadata.audioFile.id,
        name: metadata.audioFile.name,
        data: dataUrl,
        duration: metadata.audioFile.duration,
      };
    }
    
    return {
      id: metadata.id,
      name: metadata.name,
      createdAt: metadata.createdAt,
      modifiedAt: metadata.modifiedAt,
      pages,
      audioFile,
    };
  } catch (error) {
    console.error('Failed to load project:', error);
    return undefined;
  }
}

async function deleteProjectNative(projectId: string): Promise<void> {
  const projectsDir = await getProjectsDir();
  const projectDir = `${projectsDir}/${projectId}`;
  
  // Delete project directory recursively
  try {
    const files = await listFiles(projectDir);
    for (const file of files) {
      await deleteFile(file);
    }
    // Note: Tauri's fs API doesn't have rmdir, files deletion is enough
  } catch (error) {
    console.error('Failed to delete project directory:', error);
  }
}

async function getAllProjectsNative(): Promise<VisualProject[]> {
  try {
    const projectsDir = await getProjectsDir();
    const dirs = await listFiles(projectsDir);
    
    const projects: VisualProject[] = [];
    for (const dir of dirs) {
      try {
        const metadata = await readJsonFile<any>(`${dir}/project.json`);
        // Return lightweight metadata without loading images
        projects.push({
          id: metadata.id,
          name: metadata.name,
          createdAt: metadata.createdAt,
          modifiedAt: metadata.modifiedAt,
          pages: [], // Don't load full pages for listing
          audioFile: null,
        });
      } catch {
        // Skip invalid directories
      }
    }
    
    return projects.sort((a, b) => b.modifiedAt - a.modifiedAt);
  } catch {
    return [];
  }
}

// ============= IndexedDB Storage (Web Fallback) =============

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

async function saveProjectWeb(project: VisualProject): Promise<void> {
  const db = await getDB();
  // Sanitize to ensure no non-cloneable objects reach IndexedDB
  const sanitized = sanitizeForIDB({
    ...project,
    modifiedAt: Date.now(),
  });
  await db.put('visualProjects', sanitized);
}

async function loadProjectWeb(id: string): Promise<VisualProject | undefined> {
  const db = await getDB();
  return db.get('visualProjects', id);
}

async function deleteProjectWeb(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('visualProjects', id);
}

async function getAllProjectsWeb(): Promise<VisualProject[]> {
  const db = await getDB();
  const projects = await db.getAllFromIndex('visualProjects', 'by-modified');
  return projects.reverse();
}

// ============= Public API (Automatic Platform Detection) =============

export async function saveVisualProject(project: VisualProject): Promise<void> {
  if (isTauriApp()) {
    await saveProjectNative(project);
  } else {
    await saveProjectWeb(project);
  }
}

export async function loadVisualProject(id: string): Promise<VisualProject | undefined> {
  if (isTauriApp()) {
    return loadProjectNative(id);
  } else {
    return loadProjectWeb(id);
  }
}

export async function deleteVisualProject(id: string): Promise<void> {
  if (isTauriApp()) {
    await deleteProjectNative(id);
  } else {
    await deleteProjectWeb(id);
  }
}

export async function getAllVisualProjects(): Promise<VisualProject[]> {
  if (isTauriApp()) {
    return getAllProjectsNative();
  } else {
    return getAllProjectsWeb();
  }
}

export async function createVisualProject(
  name: string = 'Untitled Visual Project',
  pages: ImagePage[] = [],
  audioFile: VisualProject['audioFile'] = null
): Promise<VisualProject> {
  const project: VisualProject = {
    id: uuidv4(),
    name,
    createdAt: Date.now(),
    modifiedAt: Date.now(),
    pages,
    audioFile,
  };
  
  await saveVisualProject(project);
  return project;
}

export async function duplicateVisualProject(id: string): Promise<VisualProject | undefined> {
  const original = await loadVisualProject(id);
  if (!original) return undefined;
  
  const duplicate: VisualProject = {
    ...original,
    id: uuidv4(),
    name: `${original.name} (Copy)`,
    createdAt: Date.now(),
    modifiedAt: Date.now(),
    pages: original.pages.map(page => ({
      ...page,
      id: uuidv4(),
      segments: page.segments.map(seg => ({
        ...seg,
        id: uuidv4(),
      })),
    })),
  };
  
  await saveVisualProject(duplicate);
  return duplicate;
}

// Export as JSON file
export function exportVisualProject(project: VisualProject): void {
  const data = JSON.stringify(project, null, 2);
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

// Import from JSON file
export async function importVisualProject(file: File): Promise<VisualProject> {
  const text = await file.text();
  const data = JSON.parse(text) as VisualProject;
  
  const project: VisualProject = {
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
  
  await saveVisualProject(project);
  return project;
}

// Auto-save with debounce
let autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;

export function scheduleVisualAutoSave(project: VisualProject, delay: number = 3000): void {
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout);
  }
  
  autoSaveTimeout = setTimeout(async () => {
    await saveVisualProject(project);
    console.log('[AutoSave] Visual project saved:', project.name);
  }, delay);
}

export function cancelVisualAutoSave(): void {
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = null;
  }
}

// Check if running in desktop mode
export function isDesktopApp(): boolean {
  return isTauriApp();
}
