import { VisualProject } from './models';

export interface ProjectMetadata {
    id: string;
    name: string;
    createdAt: number;
    modifiedAt: number;
    pageCount: number;
}

export interface IProjectAdapter {
    createProject(name: string): Promise<VisualProject>;
    saveProject(project: VisualProject): Promise<void>;
    loadProject(id: string): Promise<VisualProject | null>;
    getAllProjects(): Promise<VisualProject[]>;
    deleteProject(id: string): Promise<void>;
    duplicateProject(id: string): Promise<VisualProject | undefined>;
    exportProject(project: VisualProject): Promise<void>;
    importProject(file: File): Promise<VisualProject>;
}
