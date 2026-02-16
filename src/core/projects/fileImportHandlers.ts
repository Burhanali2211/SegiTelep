import { VisualProject, ImagePage } from './models';
import { ProjectService } from './ProjectService';
import { v4 as uuidv4 } from 'uuid';

export type ImportResult =
    | { type: 'project'; project: VisualProject }
    | { type: 'pdf'; file: File }
    | { type: 'error'; message: string };

/**
 * Handles importing a file by determining its type and performing the appropriate action.
 */
export async function handleFileImport(file: File): Promise<ImportResult> {
    const extension = file.name.split('.').pop()?.toLowerCase();

    // Handle JSON projects
    if (extension === 'json' || file.name.endsWith('.visualprompt.json')) {
        try {
            const project = await ProjectService.importProject(file);
            return { type: 'project', project };
        } catch (e) {
            return { type: 'error', message: 'Invalid project file format' };
        }
    }

    // Handle PDFs (defer to PDF selector UI)
    if (extension === 'pdf') {
        return { type: 'pdf', file };
    }

    // Handle images (direct create)
    if (['png', 'jpg', 'jpeg', 'webp'].includes(extension || '')) {
        try {
            const reader = new FileReader();
            const imageData = await new Promise<string>((resolve, reject) => {
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const projectName = file.name.replace(/\.[^/.]+$/, "");
            const project = await ProjectService.createProject(projectName);

            const page: ImagePage = {
                id: uuidv4(),
                data: imageData,
                segments: []
            };

            project.pages = [page];
            await ProjectService.saveProject(project);

            return { type: 'project', project };
        } catch (e) {
            return { type: 'error', message: 'Failed to process image file' };
        }
    }

    return { type: 'error', message: 'Unsupported file type' };
}

/**
 * Creates a project from a selection of PDF pages.
 */
export async function createProjectFromPDFPages(
    file: File | string,
    pages: { pageNumber: number; imageData: string }[]
): Promise<VisualProject> {
    const fileName = typeof file === 'string' ? file : file.name;
    const projectName = fileName.replace(/\.[^/.]+$/, "");

    const project = await ProjectService.createProject(projectName);

    project.pages = pages.map((page, idx) => ({
        id: uuidv4(),
        name: `Page ${page.pageNumber}`,
        data: page.imageData,
        segments: [],
        isPDF: true,
        order: idx
    }));

    await ProjectService.saveProject(project);
    return project;
}
