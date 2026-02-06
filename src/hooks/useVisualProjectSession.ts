import { useEffect, useRef, useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useVisualEditorState, ImagePage } from '@/components/Teleprompter/VisualEditor/useVisualEditorState';
import {
  saveVisualProject,
  loadVisualProject,
  createVisualProject,
  getAllVisualProjects,
  VisualProject,
} from '@/core/storage/VisualProjectStorage';
import { safeSerialize } from '@/utils/serializationHelpers';

const LAST_PROJECT_KEY = 'lastVisualProjectId';
const STARTUP_MODE_KEY = 'teleprompter-startup-mode';
const AUTO_RESUME_KEY = 'teleprompter-auto-resume';
const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour
const AUTO_SAVE_DELAY = 3000; // 3 seconds
const MAX_SAVE_RETRIES = 3;

export type StartupMode = 'welcome' | 'editor';

// Get auto-resume preference from localStorage
export function getAutoResumePreference(): boolean {
  const stored = localStorage.getItem(AUTO_RESUME_KEY);
  return stored === 'true';
}

// Set auto-resume preference
export function setAutoResumePreference(enabled: boolean): void {
  localStorage.setItem(AUTO_RESUME_KEY, String(enabled));
}

// Check if there's a stored session to restore
export function hasStoredSession(): boolean {
  return !!localStorage.getItem(LAST_PROJECT_KEY);
}

export function useVisualProjectSession() {
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRestoredRef = useRef(false);
  
  // Startup mode state
  const [startupMode, setStartupModeState] = useState<StartupMode>(() => {
    // If auto-resume is enabled and there's a stored session, go to editor
    if (getAutoResumePreference() && hasStoredSession()) {
      return 'editor';
    }
    return 'welcome';
  });
  
  const [autoResumeEnabled, setAutoResumeEnabledState] = useState(getAutoResumePreference);
  
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
  
  // Update auto-resume preference
  const setAutoResumeEnabled = useCallback((enabled: boolean) => {
    setAutoResumePreference(enabled);
    setAutoResumeEnabledState(enabled);
  }, []);
  
  // Set startup mode
  const setStartupMode = useCallback((mode: StartupMode) => {
    setStartupModeState(mode);
  }, []);

  // Track save attempts to prevent infinite retry loops
  const saveAttemptRef = useRef(0);
  const lastSaveErrorRef = useRef<string | null>(null);

  // Save project to IndexedDB with retry logic and safe serialization
  const saveProject = useCallback(async (showToast = true, retryCount = 0) => {
    if (pages.length === 0) return;
    
    // Prevent infinite retry loops
    if (retryCount >= MAX_SAVE_RETRIES) {
      console.error(`[Save] Max retries (${MAX_SAVE_RETRIES}) exceeded, aborting`);
      setSaveStatus('error');
      if (showToast && lastSaveErrorRef.current !== 'max_retries') {
        lastSaveErrorRef.current = 'max_retries';
        toast.error('Save failed after multiple attempts. Please try again later.');
      }
      return;
    }
    
    setSaveStatus('saving');
    
    try {
      // Safely serialize pages to ensure no non-serializable data
      const safePages = safeSerialize(pages);
      const safeAudioFile = audioFile ? safeSerialize(audioFile) : null;
      
      let id = projectId;
      
      if (!id) {
        const newProject = await createVisualProject(projectName, safePages, safeAudioFile);
        id = newProject.id;
        setProjectId(id);
      } else {
        const project: VisualProject = {
          id,
          name: projectName,
          createdAt: Date.now(),
          modifiedAt: Date.now(),
          pages: safePages,
          audioFile: safeAudioFile,
        };
        await saveVisualProject(project);
      }
      
      // Persist last project ID
      localStorage.setItem(LAST_PROJECT_KEY, id);
      
      const now = Date.now();
      setLastSaved(now);
      setIsDirty(false);
      setSaveStatus('saved');
      saveAttemptRef.current = 0;
      lastSaveErrorRef.current = null;
      
      if (showToast) {
        toast.success('Project saved', { duration: 2000 });
      }
      
      // Reset to idle after showing saved status
      setTimeout(() => setSaveStatus('idle'), 2000);
      
    } catch (error) {
      console.error(`[Save] Attempt ${retryCount + 1} failed:`, error);
      
      // Check if it's a quota error
      const isQuotaError = error instanceof Error && (
        error.name === 'QuotaExceededError' ||
        error.message.includes('quota')
      );
      
      if (isQuotaError) {
        setSaveStatus('error');
        if (lastSaveErrorRef.current !== 'quota') {
          lastSaveErrorRef.current = 'quota';
          toast.error('Storage quota exceeded. Try removing old projects.');
        }
        return;
      }
      
      // Retry with exponential backoff for transient errors
      const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 8000);
      setTimeout(() => {
        saveProject(showToast, retryCount + 1);
      }, backoffMs);
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

  // Restore last session on mount (only if auto-resume is enabled)
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;
    
    const restoreSession = async () => {
      // Only auto-restore if auto-resume is enabled
      if (!getAutoResumePreference()) {
        return;
      }
      
      const lastProjectId = localStorage.getItem(LAST_PROJECT_KEY);
      
      if (lastProjectId) {
        setIsLoading(true);
        const success = await loadProject(lastProjectId);
        
        if (!success) {
          // Clear invalid project ID
          localStorage.removeItem(LAST_PROJECT_KEY);
          setStartupMode('welcome');
        }
        setIsLoading(false);
      }
    };
    
    restoreSession();
  }, [loadProject, setIsLoading, setStartupMode]);

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
    setStartupMode('editor');
    toast.success('New project created');
  }, [reset, setProjectName, setProjectId, setLastSaved, setIsDirty, setStartupMode]);
  
  // Load project and switch to editor mode
  const loadProjectAndEdit = useCallback(async (id: string) => {
    const success = await loadProject(id);
    if (success) {
      setStartupMode('editor');
    }
    return success;
  }, [loadProject, setStartupMode]);

  return {
    saveProject,
    loadProject,
    loadProjectAndEdit,
    createNewProject,
    projectId,
    projectName,
    isDirty,
    saveStatus,
    isLoading,
    startupMode,
    setStartupMode,
    autoResumeEnabled,
    setAutoResumeEnabled,
    hasStoredSession: hasStoredSession(),
  };
}

// Get all projects for listing
export async function getRecentProjects(limit = 10): Promise<VisualProject[]> {
  const projects = await getAllVisualProjects();
  return projects.slice(0, limit);
}
