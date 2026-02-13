// Project Storage Facade
// Delegates to ProjectService (Unified Layer)
// Maintains backward compatibility for imports

import { ProjectService } from '@/core/projects/ProjectService';
import { VisualProject, ImagePage, VisualSegment, ProjectMetadata } from '@/core/projects/models';

export type { VisualProject, ImagePage, VisualSegment, ProjectMetadata };

// ============= Public API =============

export async function saveVisualProject(project: VisualProject): Promise<void> {
  await ProjectService.saveProject(project);
}

export async function loadVisualProject(id: string): Promise<VisualProject | undefined> {
  const project = await ProjectService.loadProject(id);
  return project || undefined;
}

export async function deleteVisualProject(id: string): Promise<void> {
  await ProjectService.deleteProject(id);
}

export async function getAllVisualProjects(): Promise<VisualProject[]> {
  return await ProjectService.getAllProjects();
}

export async function createVisualProject(
  name: string = 'Untitled Visual Project',
  pages: ImagePage[] = [],
  audioFile: VisualProject['audioFile'] = null
): Promise<VisualProject> {
  // We use the service to create the base project, then add the initial pages/audio if provided.
  // Although usually createVisualProject is called with empty pages in the UI,
  // we support the signature.

  const project = await ProjectService.createProject(name);

  if (pages.length > 0 || audioFile) {
    const updated = {
      ...project,
      pages,
      audioFile
    };
    await ProjectService.saveProject(updated);
    return updated;
  }

  return project;
}

export async function duplicateVisualProject(id: string): Promise<VisualProject | undefined> {
  return await ProjectService.duplicateProject(id);
}

export function exportVisualProject(project: VisualProject): Promise<void> {
  return ProjectService.exportProject(project);
}

export async function importVisualProject(file: File): Promise<VisualProject> {
  return await ProjectService.importProject(file);
}

// Auto-save helpers (Platform agnostic)
let autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;

export function scheduleVisualAutoSave(project: VisualProject, delay: number = 3000): void {
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout);
  }

  autoSaveTimeout = setTimeout(async () => {
    await saveVisualProject(project);
  }, delay);
}

export function cancelVisualAutoSave(): void {
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = null;
  }
}
