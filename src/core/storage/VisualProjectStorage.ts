import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import { ImagePage, VisualSegment } from '@/components/Teleprompter/VisualEditor/useVisualEditorState';

export interface VisualProject {
  id: string;
  name: string;
  createdAt: number;
  modifiedAt: number;
  pages: ImagePage[];
  audioFile: { id: string; name: string; data: string; duration: number } | null;
}

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

// Deep clone helper to ensure data is serializable for IndexedDB
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export async function saveVisualProject(project: VisualProject): Promise<void> {
  const db = await getDB();
  // Deep clone to ensure no non-serializable objects (like PointerEvent) are included
  const updated = deepClone({
    ...project,
    modifiedAt: Date.now(),
  });
  await db.put('visualProjects', updated);
}

export async function loadVisualProject(id: string): Promise<VisualProject | undefined> {
  const db = await getDB();
  return db.get('visualProjects', id);
}

export async function deleteVisualProject(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('visualProjects', id);
}

export async function getAllVisualProjects(): Promise<VisualProject[]> {
  const db = await getDB();
  const projects = await db.getAllFromIndex('visualProjects', 'by-modified');
  return projects.reverse();
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

// Export as JSON
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

// Import from JSON
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

// Auto-save
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
