import { IProjectAdapter } from './types';
import { VisualProject } from './models';
import { NativeProjectAdapter } from './NativeProjectAdapter';
import { WebProjectAdapter } from './WebProjectAdapter';
import { isTauriApp } from '@/core/storage/NativeStorage';

class ProjectServiceImpl implements IProjectAdapter {
    private adapter: IProjectAdapter;

    constructor() {
        this.adapter = isTauriApp() ? new NativeProjectAdapter() : new WebProjectAdapter();
    }

    createProject(name: string) { return this.adapter.createProject(name); }
    saveProject(project: any) { return this.adapter.saveProject(project); }
    loadProject(id: string) { return this.adapter.loadProject(id); }
    getAllProjects() { return this.adapter.getAllProjects(); }
    deleteProject(id: string) { return this.adapter.deleteProject(id); }
    duplicateProject(id: string) { return this.adapter.duplicateProject(id); }
    exportProject(project: any) { return this.adapter.exportProject(project); }
    importProject(file: File) { return this.adapter.importProject(file); }
    cleanupUnusedAssets() { return this.adapter.cleanupUnusedAssets?.(); }
}

export const ProjectService = new ProjectServiceImpl();
