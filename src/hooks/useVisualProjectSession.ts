import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useVisualEditorState, ImagePage } from '@/components/Teleprompter/VisualEditor/useVisualEditorState';
import {
  saveVisualProject,
  loadVisualProject,
  createVisualProject,
  getAllVisualProjects,
  VisualProject,
} from '@/core/storage/VisualProjectStorage';

const LAST_PROJECT_KEY = 'lastVisualProjectId';
const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour
const AUTO_SAVE_DELAY = 3000; // 3 seconds

export function useVisualProjectSession() {
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRestoredRef = useRef(false);
  
  const projectId = useVisualEditorState((s) => s.projectId);
  const projectName = useVisualEditorState((s) => s.projectName);
  const pages = useVisualEditorState((s) => s.pages);
  const audioFile = useVisualEditorState((s) => s.audioFile);
  const isDirty = useVisualEditorState((s) => s.isDirty);
  const saveStatus = useVisualEditorState((s) => s.saveStatus);
  const isLoading = useVisualEditorState((s) => s.isLoading);
  
  const setProjectId = useVisualEditorState((s) => s.setProjectId);
  const setProjectName = useVisualEditorState((s) => s.setProjectName);
  const setLastSaved = useVisualEditorState((s) => s.setLastSaved);
  const setIsDirty = useVisualEditorState((s) => s.setIsDirty);
  const setSaveStatus = useVisualEditorState((s) => s.setSaveStatus);
  const setIsLoading = useVisualEditorState((s) => s.setIsLoading);
  const loadProjectData = useVisualEditorState((s) => s.loadProjectData);
  const reset = useVisualEditorState((s) => s.reset);

  // Save project to IndexedDB
  const saveProject = useCallback(async (showToast = true) => {
    if (pages.length === 0) return;
    
    setSaveStatus('saving');
    
    try {
      let id = projectId;
      
      if (!id) {
        const newProject = await createVisualProject(projectName, pages, audioFile);
        id = newProject.id;
        setProjectId(id);
      } else {
        const project: VisualProject = {
          id,
          name: projectName,
          createdAt: Date.now(),
          modifiedAt: Date.now(),
          pages,
          audioFile,
        };
        await saveVisualProject(project);
      }
      
      // Persist last project ID
      localStorage.setItem(LAST_PROJECT_KEY, id);
      
      const now = Date.now();
      setLastSaved(now);
      setIsDirty(false);
      setSaveStatus('saved');
      
      if (showToast) {
        toast.success('Project saved', { duration: 2000 });
      }
      
      // Reset to idle after showing saved status
      setTimeout(() => setSaveStatus('idle'), 2000);
      
    } catch (error) {
      console.error('Failed to save project:', error);
      setSaveStatus('error');
      toast.error('Failed to save project');
    }
  }, [projectId, projectName, pages, audioFile, setProjectId, setLastSaved, setIsDirty, setSaveStatus]);

  // Schedule auto-save
  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    autoSaveTimeoutRef.current = setTimeout(async () => {
      if (useVisualEditorState.getState().isDirty && useVisualEditorState.getState().pages.length > 0) {
        await saveProject(false);
        console.log('[AutoSave] Project saved');
      }
    }, AUTO_SAVE_DELAY);
  }, [saveProject]);

  // Load project
  const loadProject = useCallback(async (id: string) => {
    setIsLoading(true);
    
    try {
      const project = await loadVisualProject(id);
      
      if (!project) {
        toast.error('Project not found');
        setIsLoading(false);
        return false;
      }
      
      // Check if session is stale (older than 1 hour)
      const isStale = Date.now() - project.modifiedAt > SESSION_TIMEOUT_MS;
      
      loadProjectData({
        projectId: project.id,
        projectName: project.name,
        pages: project.pages,
        audioFile: project.audioFile,
        lastSaved: project.modifiedAt,
      });
      
      localStorage.setItem(LAST_PROJECT_KEY, project.id);
      
      if (isStale) {
        toast.warning('Restored session older than 1 hour', {
          description: 'Consider saving your work frequently.',
          duration: 5000,
        });
      } else {
        toast.success(`Restored: ${project.name}`, { duration: 2000 });
      }
      
      return true;
    } catch (error) {
      console.error('Failed to load project:', error);
      toast.error('Failed to load project');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadProjectData, setIsLoading]);

  // Restore last session on mount
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;
    
    const restoreSession = async () => {
      const lastProjectId = localStorage.getItem(LAST_PROJECT_KEY);
      
      if (lastProjectId) {
        setIsLoading(true);
        const success = await loadProject(lastProjectId);
        
        if (!success) {
          // Clear invalid project ID
          localStorage.removeItem(LAST_PROJECT_KEY);
        }
        setIsLoading(false);
      }
    };
    
    restoreSession();
  }, [loadProject, setIsLoading]);

  // Auto-save when dirty
  useEffect(() => {
    if (isDirty) {
      scheduleAutoSave();
    }
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [isDirty, scheduleAutoSave]);

  // beforeunload warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Create new project
  const createNewProject = useCallback(async (name = 'Untitled Project') => {
    reset();
    setProjectName(name);
    setProjectId(null);
    setLastSaved(null);
    setIsDirty(false);
    localStorage.removeItem(LAST_PROJECT_KEY);
    toast.success('New project created');
  }, [reset, setProjectName, setProjectId, setLastSaved, setIsDirty]);

  return {
    saveProject,
    loadProject,
    createNewProject,
    projectId,
    projectName,
    isDirty,
    saveStatus,
    isLoading,
  };
}

// Get all projects for listing
export async function getRecentProjects(limit = 10): Promise<VisualProject[]> {
  const projects = await getAllVisualProjects();
  return projects.slice(0, limit);
}
