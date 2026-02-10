// Project Storage with Native Filesystem Support
// Uses Tauri native filesystem when available, falls back to IndexedDB for web preview

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import { 
  isTauriApp, 
  ensureDirectory, 
  readJsonFile, 
  writeJsonFile,
  readFileBytes,
  writeFileBytes,
  removeDirectoryRecursive,
  listFiles,
  fileExists,
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
// Uses relative paths under BaseDirectory.AppData

const PROJECTS_DIR = 'projects';

async function getProjectDir(projectId: string): Promise<string> {
  const projectDir = `${PROJECTS_DIR}/${projectId}`;
  await ensureDirectory(projectDir);
  await ensureDirectory(`${projectDir}/images`);
  await ensureDirectory(`${projectDir}/audio`);
  return projectDir;
}

async function saveProjectNative(project: VisualProject): Promise<void> {
  const projectDir = await getProjectDir(project.id);
  
  // Save page images to files (store relative path in metadata)
  const pagesWithRefs = await Promise.all(project.pages.map(async (page, index) => {
    if (page.data.startsWith('data:')) {
      const { bytes, mimeType } = dataUrlToBytes(page.data);
      const ext = getExtensionFromMimeType(mimeType);
      const imagePath = `${projectDir}/images/page_${index}_${page.id}.${ext}`;
      await writeFileBytes(imagePath, bytes);
      
      return {
        ...page,
        data: imagePath, // Store relative path
        _mimeType: mimeType,
      };
    }
    if (page.data.startsWith('blob:')) {
      try {
        const res = await fetch(page.data);
        const blob = await res.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.onerror = reject;
          r.readAsDataURL(blob);
        });
        const { bytes, mimeType } = dataUrlToBytes(dataUrl);
        const ext = getExtensionFromMimeType(mimeType);
        const imagePath = `${projectDir}/images/page_${index}_${page.id}.${ext}`;
        await writeFileBytes(imagePath, bytes);
        return {
          ...page,
          data: imagePath,
          _mimeType: mimeType,
        };
      } catch {
        return page;
      }
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
    // #region agent log
    // fetch('http://127.0.0.1:7242/ingest/784514f5-0201-4165-905e-642cc13d7946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VisualProjectStorage.ts:loadProjectNative',message:'loadProjectNative entry',data:{projectId,isTauri:isTauriApp()},timestamp:Date.now(),hypothesisId:'A,B'})}).catch(()=>{});
    // #endregion
    const projectDir = `${PROJECTS_DIR}/${projectId}`;
    const projectJsonPath = `${projectDir}/project.json`;
    if (!(await fileExists(projectJsonPath))) return undefined;
    await ensureDirectory(projectDir);
    await ensureDirectory(`${projectDir}/images`);
    await ensureDirectory(`${projectDir}/audio`);
    const metadata = await readJsonFile<any>(projectJsonPath);

    if (!metadata || !metadata.id || !metadata.name) {
      console.error('Invalid project metadata:', metadata);
      return undefined;
    }

    const rawPages = Array.isArray(metadata.pages) ? metadata.pages : [];
    const pages: ImagePage[] = [];

    for (let i = 0; i < rawPages.length; i++) {
      const page = rawPages[i];
      if (!page || typeof page !== 'object') continue;

      try {
        const dataVal = page.data;
        if (typeof dataVal === 'string' && dataVal.startsWith('blob:')) continue;
        const isFileRef = typeof dataVal === 'string' && (
          dataVal.startsWith('file://') ||
          (!dataVal.startsWith('data:') && dataVal.includes('/'))
        );

        if (isFileRef) {
          let filePath = dataVal.startsWith('file://') ? dataVal.replace('file://', '') : dataVal;
          const match = filePath.match(/projects\/.+$/);
          const relativePath = match ? match[0] : filePath;
          const bytes = await readFileBytes(relativePath);
          const mimeType = page._mimeType || 'image/jpeg';
          const dataUrl = bytesToDataUrl(bytes, mimeType);
          pages.push(sanitizePage({ ...page, data: dataUrl }));
        } else if (typeof dataVal === 'string' && dataVal.startsWith('data:')) {
          pages.push(sanitizePage(page));
        }
      } catch (err) {
        console.warn(`Failed to load page ${i}, skipping:`, err);
      }
    }

    let audioFile: VisualProject['audioFile'] = null;
    if (metadata.audioFile && typeof metadata.audioFile === 'object' && metadata.audioFile.path) {
      try {
        let audioPath = metadata.audioFile.path;
        const match = String(audioPath).match(/projects\/.+$/);
        if (match) audioPath = match[0];
        const bytes = await readFileBytes(audioPath);
        const dataUrl = bytesToDataUrl(bytes, metadata.audioFile.mimeType || 'audio/mpeg');
        audioFile = {
          id: metadata.audioFile.id || 'audio',
          name: metadata.audioFile.name || 'Audio',
          data: dataUrl,
          duration: typeof metadata.audioFile.duration === 'number' ? metadata.audioFile.duration : 0,
        };
      } catch (err) {
        console.warn('Failed to load audio file, continuing without:', err);
      }
    }

    return {
      id: metadata.id,
      name: metadata.name,
      createdAt: typeof metadata.createdAt === 'number' ? metadata.createdAt : Date.now(),
      modifiedAt: typeof metadata.modifiedAt === 'number' ? metadata.modifiedAt : Date.now(),
      pages,
      audioFile,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    // #region agent log
    // fetch('http://127.0.0.1:7242/ingest/784514f5-0201-4165-905e-642cc13d7946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VisualProjectStorage.ts:loadProjectNative',message:'loadProjectNative catch',data:{errMsg,projectId},timestamp:Date.now(),hypothesisId:'A,B'})}).catch(()=>{});
    // #endregion
    console.error('Failed to load project:', error);
    return undefined;
  }
}

function sanitizePage(page: any): ImagePage {
  const segments = Array.isArray(page.segments) ? page.segments : [];
  const sanitizedSegments = segments.map((s: any, idx: number) => {
    if (!s || typeof s !== 'object') return null;
    const region = s.region && typeof s.region === 'object'
      ? {
          x: typeof s.region.x === 'number' ? s.region.x : 0,
          y: typeof s.region.y === 'number' ? s.region.y : 0,
          width: typeof s.region.width === 'number' ? Math.max(1, s.region.width) : 10,
          height: typeof s.region.height === 'number' ? Math.max(1, s.region.height) : 10,
        }
      : { x: 0, y: 0, width: 10, height: 10 };
    return {
      id: typeof s.id === 'string' ? s.id : `seg-${idx}`,
      pageIndex: typeof s.pageIndex === 'number' ? s.pageIndex : 0,
      region,
      label: typeof s.label === 'string' ? s.label : `Segment ${idx + 1}`,
      startTime: typeof s.startTime === 'number' ? s.startTime : 0,
      endTime: typeof s.endTime === 'number' ? s.endTime : 5,
      isHidden: !!s.isHidden,
      order: typeof s.order === 'number' ? s.order : idx,
    };
  }).filter(Boolean);

  return {
    id: typeof page.id === 'string' ? page.id : `page-${Date.now()}`,
    data: typeof page.data === 'string' ? page.data : '',
    segments: sanitizedSegments,
  };
}

async function deleteProjectNative(projectId: string): Promise<void> {
  const projectDir = `${PROJECTS_DIR}/${projectId}`;
  try {
    await removeDirectoryRecursive(projectDir);
  } catch (error) {
    console.error('Failed to delete project directory:', error);
  }
}

async function getAllProjectsNative(): Promise<VisualProject[]> {
  try {
    await ensureDirectory(PROJECTS_DIR);
    const entries = await listFiles(PROJECTS_DIR);
    
    const projects: VisualProject[] = [];
    for (const dirName of entries) {
      try {
        const metadata = await readJsonFile<any>(`${PROJECTS_DIR}/${dirName}/project.json`);
        // Load first page thumbnail for project list (optional)
        let thumbnailData: string | null = null;
        if (metadata.pages?.length > 0) {
          const firstPage = metadata.pages[0];
          if (firstPage?.data && !firstPage.data.startsWith('data:')) {
            try {
              let imgPath = firstPage.data.startsWith('file://') ? firstPage.data.replace('file://', '') : firstPage.data;
              const match = imgPath.match(/projects\/.+$/);
              imgPath = match ? match[0] : imgPath;
              const bytes = await readFileBytes(imgPath);
              thumbnailData = bytesToDataUrl(bytes, firstPage._mimeType || 'image/jpeg');
            } catch {
              // Ignore thumbnail load errors
            }
          } else if (firstPage?.data?.startsWith('data:')) {
            thumbnailData = firstPage.data;
          }
        }
        projects.push({
          id: typeof metadata.id === 'string' ? metadata.id : dirName,
          name: typeof metadata.name === 'string' ? metadata.name : 'Untitled',
          createdAt: typeof metadata.createdAt === 'number' ? metadata.createdAt : Date.now(),
          modifiedAt: typeof metadata.modifiedAt === 'number' ? metadata.modifiedAt : Date.now(),
          pages: thumbnailData ? [{ id: 'thumb', data: thumbnailData, segments: [] }] : [],
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
    audioFile: original.audioFile, // Preserve audio when duplicating
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
