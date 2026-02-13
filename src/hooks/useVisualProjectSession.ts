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
const AUTO_SAVE_KEY = 'teleprompter-auto-save';
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

// Get auto-save preference (default: true)
export function getAutoSavePreference(): boolean {
  const stored = localStorage.getItem(AUTO_SAVE_KEY);
  return stored === undefined || stored === null || stored === 'true';
}

// Set auto-save preference
export function setAutoSavePreference(enabled: boolean): void {
  localStorage.setItem(AUTO_SAVE_KEY, String(enabled));
}

// Check if there's a stored session to restore
export function hasStoredSession(): boolean {
  return !!localStorage.getItem(LAST_PROJECT_KEY);
}

export function useVisualProjectSession() {
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRestoredRef = useRef(false);

  // Startup mode state
  // Only subscribe to what we need for UI rendering
  const isDirty = useVisualEditorState((s) => s.isDirty);
  const saveStatus = useVisualEditorState((s) => s.saveStatus);
  const isLoading = useVisualEditorState((s) => s.isLoading);
  const projectId = useVisualEditorState((s) => s.projectId);
  const projectName = useVisualEditorState((s) => s.projectName);
  const startupMode = useVisualEditorState((s) => s.startupMode);
  const setStartupMode = useVisualEditorState((s) => s.setStartupMode);

  const [autoResumeEnabled, setAutoResumeEnabledState] = useState(getAutoResumePreference);
  const [autoSaveEnabled, setAutoSaveEnabledState] = useState(getAutoSavePreference);

  // Initialize startup mode on first mount based on auto-resume
  useEffect(() => {
    if (getAutoResumePreference() && hasStoredSession()) {
      setStartupMode('editor');
    } else {
      setStartupMode('welcome');
    }
  }, [setStartupMode]);

  // Update auto-resume preference
  const setAutoResumeEnabled = useCallback((enabled: boolean) => {
    setAutoResumePreference(enabled);
    setAutoResumeEnabledState(enabled);
  }, []);

  // Update auto-save preference
  const setAutoSaveEnabled = useCallback((enabled: boolean) => {
    setAutoSavePreference(enabled);
    setAutoSaveEnabledState(enabled);
  }, []);

  // Track save attempts and active save operations
  const saveAttemptRef = useRef(0);
  const lastSaveErrorRef = useRef<string | null>(null);
  const isSavingRef = useRef(false);

  // Save project to IndexedDB with retry logic and safe serialization
  const saveProject = useCallback(async (showToast = true, retryCount = 0) => {
    // Prevent concurrent saves
    if (isSavingRef.current && retryCount === 0) {
      return;
    }

    // Escape event context - wait for microtask to ensure no event references are captured
    await new Promise(resolve => setTimeout(resolve, 0));

    // Get fresh state from store - avoids stale closure issues
    const state = useVisualEditorState.getState();
    const { pages, audioFile, projectName, projectId } = state;
    const { setProjectId, setLastSaved, setIsDirty, setSaveStatus } = state;

    if (pages.length === 0) return;

    // Prevent infinite retry loops
    if (retryCount >= MAX_SAVE_RETRIES) {
      console.error(`[Save] Max retries (${MAX_SAVE_RETRIES}) exceeded, aborting`);
      setSaveStatus('error');
      if (showToast && lastSaveErrorRef.current !== 'max_retries') {
        lastSaveErrorRef.current = 'max_retries';
        toast.error('Save failed after multiple attempts. Please try again later.');
      }
      isSavingRef.current = false;
      return;
    }

    isSavingRef.current = true;
    setSaveStatus('saving');

    try {
      // Safely serialize pages to ensure no non-serializable data
      const safePages = safeSerialize(pages);
      const safeAudioFile = audioFile ? safeSerialize(audioFile) : null;

      let id = projectId;

      if (!id) {
        // Double check projectId from fresh state right before creation to avoid race conditions
        const freshId = useVisualEditorState.getState().projectId;
        if (freshId) {
          id = freshId;
        } else {
          const newProject = await createVisualProject(projectName, safePages, safeAudioFile);
          id = newProject.id;
          setProjectId(id);
        }
      }

      // If we have an ID (either existing or just created), perform the save/update
      if (id) {
        // If it was already created by createVisualProject above, saveVisualProject might be redundant 
        // but it ensures the name and latest pages are up to date if they changed during the async call
        const currentProject = id === projectId ? await loadVisualProject(id) : null;
        const project: VisualProject = {
          id,
          name: projectName,
          createdAt: currentProject?.createdAt || Date.now(),
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
      isSavingRef.current = false;

      if (showToast) {
        toast.success('Project saved', { duration: 2000 });
      }

      // Reset to idle after showing saved status
      setTimeout(() => useVisualEditorState.getState().setSaveStatus('idle'), 2000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Save] Attempt ${retryCount + 1} failed:`, errorMessage, error);

      // Check if it's a quota error
      const isQuotaError = error instanceof Error && (
        error.name === 'QuotaExceededError' ||
        errorMessage.includes('quota')
      );

      // Check for data structure errors - don't retry these
      const isDataError = errorMessage.includes('DataCloneError') ||
        errorMessage.includes('circular') ||
        errorMessage.includes('could not be cloned');

      if (isQuotaError) {
        useVisualEditorState.getState().setSaveStatus('error');
        if (lastSaveErrorRef.current !== 'quota') {
          lastSaveErrorRef.current = 'quota';
          toast.error('Storage quota exceeded. Try removing old projects.');
        }
        isSavingRef.current = false;
        return;
      }

      if (isDataError) {
        useVisualEditorState.getState().setSaveStatus('error');
        if (lastSaveErrorRef.current !== 'data_error') {
          lastSaveErrorRef.current = 'data_error';
          toast.error('Save failed: Invalid data structure');
        }
        isSavingRef.current = false;
        return;
      }

      // Retry with exponential backoff for transient errors
      const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 8000);
      setTimeout(() => {
        saveProject(showToast, retryCount + 1);
      }, backoffMs);
    }
  }, []); // No dependencies - uses fresh state from store

  // Schedule auto-save
  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      const state = useVisualEditorState.getState();

      // Skip save if drag is active - reschedule instead
      if (state.isActiveDrag) {
        autoSaveTimeoutRef.current = setTimeout(() => {
          scheduleAutoSave();
        }, AUTO_SAVE_DELAY);
        return;
      }

      if (state.isDirty && state.pages.length > 0) {
        await saveProject(false);
      }
    }, AUTO_SAVE_DELAY);
  }, [saveProject]);

  // Load project
  const loadProject = useCallback(async (id: string) => {
    const { setIsLoading, loadProjectData } = useVisualEditorState.getState();
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

      await loadProjectData({
        projectId: project.id,
        projectName: project.name,
        pages: safeSerialize(project.pages),
        audioFile: project.audioFile ? safeSerialize(project.audioFile) : null,
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
      useVisualEditorState.getState().setIsLoading(false);
    }
  }, []);

  // Restore last session on mount (only if auto-resume is enabled)
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    const restoreSession = async () => {
      const autoResume = getAutoResumePreference();
      const lastProjectId = localStorage.getItem(LAST_PROJECT_KEY);
      const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
      if (!autoResume) return;
      if (!lastProjectId) return;

      // Delay to ensure Tauri/native APIs are ready (fixes desktop app load-after-close)
      await new Promise((r) => setTimeout(r, isTauri ? 400 : 100));

      useVisualEditorState.getState().setIsLoading(true);
      try {
        const success = await loadProject(lastProjectId);
        if (!success) {
          localStorage.removeItem(LAST_PROJECT_KEY);
          useVisualEditorState.getState().reset();
          setStartupMode('welcome');
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error('Session restore failed:', err);
        localStorage.removeItem(LAST_PROJECT_KEY);
        useVisualEditorState.getState().reset();
        setStartupMode('welcome');
      } finally {
        useVisualEditorState.getState().setIsLoading(false);
      }
    };

    restoreSession();
  }, [loadProject, setStartupMode]);

  // Auto-save when dirty (only if auto-save is enabled)
  useEffect(() => {
    if (autoSaveEnabled && isDirty) {
      scheduleAutoSave();
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [autoSaveEnabled, isDirty, scheduleAutoSave]);

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
    const state = useVisualEditorState.getState();
    state.reset();
    state.setProjectName(name);
    state.setProjectId(null);
    state.setLastSaved(null);
    state.setIsDirty(false);
    localStorage.removeItem(LAST_PROJECT_KEY);
    setStartupMode('editor');
    toast.success('New project created');
  }, [setStartupMode]);

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
    autoSaveEnabled,
    setAutoSaveEnabled,
    hasStoredSession: hasStoredSession(),
  };
}

// Get all projects for listing
export async function getRecentProjects(limit = 10): Promise<VisualProject[]> {
  const projects = await getAllVisualProjects();
  return projects.slice(0, limit);
}
