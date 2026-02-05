import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Project, DEFAULT_PROJECT_SETTINGS } from '@/types/teleprompter.types';
import { v4 as uuidv4 } from 'uuid';

interface TeleprompterDB extends DBSchema {
  projects: {
    key: string;
    value: Project;
    indexes: { 'by-name': string; 'by-modified': number };
  };
}

const DB_NAME = 'teleprompter-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<TeleprompterDB> | null = null;

async function getDB(): Promise<IDBPDatabase<TeleprompterDB>> {
  if (dbInstance) return dbInstance;
  
  dbInstance = await openDB<TeleprompterDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
      projectStore.createIndex('by-name', 'name');
      projectStore.createIndex('by-modified', 'modifiedAt');
    },
  });
  
  return dbInstance;
}

export async function saveProject(project: Project): Promise<void> {
  const db = await getDB();
  const updatedProject = {
    ...project,
    modifiedAt: Date.now(),
  };
  await db.put('projects', updatedProject);
}

export async function loadProject(id: string): Promise<Project | undefined> {
  const db = await getDB();
  return db.get('projects', id);
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('projects', id);
}

export async function getAllProjects(): Promise<Project[]> {
  const db = await getDB();
  const projects = await db.getAllFromIndex('projects', 'by-modified');
  return projects.reverse(); // Most recent first
}

export async function createProject(name: string = 'Untitled Project'): Promise<Project> {
  const project: Project = {
    id: uuidv4(),
    name,
    createdAt: Date.now(),
    modifiedAt: Date.now(),
    segments: [],
    settings: { ...DEFAULT_PROJECT_SETTINGS },
  };
  
  await saveProject(project);
  return project;
}

export async function duplicateProject(id: string): Promise<Project | undefined> {
  const original = await loadProject(id);
  if (!original) return undefined;
  
  const duplicate: Project = {
    ...original,
    id: uuidv4(),
    name: `${original.name} (Copy)`,
    createdAt: Date.now(),
    modifiedAt: Date.now(),
    segments: original.segments.map(seg => ({
      ...seg,
      id: uuidv4(),
    })),
  };
  
  await saveProject(duplicate);
  return duplicate;
}

// Export project as JSON file
export function exportProject(project: Project): void {
  const data = JSON.stringify(project, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name.replace(/[^a-z0-9]/gi, '_')}.teleprompt.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Import project from JSON file
export async function importProject(file: File): Promise<Project> {
  const text = await file.text();
  const data = JSON.parse(text) as Project;
  
  // Generate new IDs to avoid conflicts
  const project: Project = {
    ...data,
    id: uuidv4(),
    name: data.name || 'Imported Project',
    createdAt: Date.now(),
    modifiedAt: Date.now(),
    settings: {
      ...DEFAULT_PROJECT_SETTINGS,
      ...data.settings,
    },
    segments: (data.segments || []).map(seg => ({
      ...seg,
      id: uuidv4(),
    })),
  };
  
  await saveProject(project);
  return project;
}

// Auto-save functionality
let autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;

export function scheduleAutoSave(project: Project, delay: number = 5000): void {
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout);
  }
  
  autoSaveTimeout = setTimeout(async () => {
    await saveProject(project);
    console.log('[AutoSave] Project saved:', project.name);
  }, delay);
}

export function cancelAutoSave(): void {
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = null;
  }
}
