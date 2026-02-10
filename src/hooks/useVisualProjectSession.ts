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
  const [startupMode, setStartupModeState] = useState<StartupMode>(() => {
    // If auto-resume is enabled and there's a stored session, go to editor
    if (getAutoResumePreference() && hasStoredSession()) {
      return 'editor';
    }
    return 'welcome';
  });
  
  const [autoResumeEnabled, setAutoResumeEnabledState] = useState(getAutoResumePreference);
  const [autoSaveEnabled, setAutoSaveEnabledState] = useState(getAutoSavePreference);
  
  // Only subscribe to what we need for UI rendering
  const isDirty = useVisualEditorState((s) => s.isDirty);
  const saveStatus = useVisualEditorState((s) => s.saveStatus);
  const isLoading = useVisualEditorState((s) => s.isLoading);
  const projectId = useVisualEditorState((s) => s.projectId);
  const projectName = useVisualEditorState((s) => s.projectName);
  
  // Update auto-resume preference
  const setAutoResumeEnabled = useCallback((enabled: boolean) => {
    setAutoResumePreference(enabled);
    setAutoResumeEnabledState(enabled);
  }, []);
  
  // Set startup mode
  const setStartupMode = useCallback((mode: StartupMode) => {
    setStartupModeState(mode);
  }, []);

  // Update auto-save preference
  const setAutoSaveEnabled = useCallback((enabled: boolean) => {
    setAutoSavePreference(enabled);
    setAutoSaveEnabledState(enabled);
  }, []);

  // Track save attempts to prevent infinite retry loops
  const saveAttemptRef = useRef(0);
  const lastSaveErrorRef = useRef<string | null>(null);

  // Save project to IndexedDB with retry logic and safe serialization
  const saveProject = useCallback(async (showToast = true, retryCount = 0) => {
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
        return;
      }
      
      if (isDataError) {
        useVisualEditorState.getState().setSaveStatus('error');
        if (lastSaveErrorRef.current !== 'data_error') {
          lastSaveErrorRef.current = 'data_error';
          toast.error('Save failed: Invalid data structure');
        }
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
        console.log('[AutoSave] Skipped - drag active, rescheduling');
        autoSaveTimeoutRef.current = setTimeout(() => {
          scheduleAutoSave();
        }, AUTO_SAVE_DELAY);
        return;
      }
      
      if (state.isDirty && state.pages.length > 0) {
        await saveProject(false);
        console.log('[AutoSave] Project saved');
      }
    }, AUTO_SAVE_DELAY);
  }, [saveProject]);

  // Load project
  const loadProject = useCallback(async (id: string) => {
    const { setIsLoading, loadProjectData } = useVisualEditorState.getState();
    setIsLoading(true);
    
    try {
      const project = await loadVisualProject(id);
      // #region agent log
      // fetch('http://127.0.0.1:7242/ingest/784514f5-0201-4165-905e-642cc13d7946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVisualProjectSession.ts:loadProject',message:'loadVisualProject result',data:{id,found:!!project,pageCount:project?.pages?.length??0},timestamp:Date.now(),hypothesisId:'A,B,C'})}).catch(()=>{});
      // #endregion
      
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
      // #region agent log
      // fetch('http://127.0.0.1:7242/ingest/784514f5-0201-4165-905e-642cc13d7946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVisualProjectSession.ts:restoreSession',message:'restoreSession entry',data:{autoResume,lastProjectId:lastProjectId??null,isTauri},timestamp:Date.now(),hypothesisId:'A,E'})}).catch(()=>{});
      // #endregion
      if (!autoResume) return;
      if (!lastProjectId) return;

      // Delay to ensure Tauri/native APIs are ready (fixes desktop app load-after-close)
      await new Promise((r) => setTimeout(r, isTauri ? 400 : 100));

      useVisualEditorState.getState().setIsLoading(true);
      try {
        const success = await loadProject(lastProjectId);
        // #region agent log
        // fetch('http://127.0.0.1:7242/ingest/784514f5-0201-4165-905e-642cc13d7946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVisualProjectSession.ts:restoreSession',message:'loadProject result',data:{success,lastProjectId},timestamp:Date.now(),hypothesisId:'A,B'})}).catch(()=>{});
        // #endregion
        if (!success) {
          localStorage.removeItem(LAST_PROJECT_KEY);
          useVisualEditorState.getState().reset();
          setStartupMode('welcome');
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        // #region agent log
        // fetch('http://127.0.0.1:7242/ingest/784514f5-0201-4165-905e-642cc13d7946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVisualProjectSession.ts:restoreSession',message:'restoreSession catch',data:{errMsg,lastProjectId},timestamp:Date.now(),hypothesisId:'A,B'})}).catch(()=>{});
        // #endregion
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
