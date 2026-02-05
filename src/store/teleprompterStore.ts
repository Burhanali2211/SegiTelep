import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  Project,
  Segment,
  ProjectSettings,
  PlaybackState,
  EditorState,
  DEFAULT_PROJECT_SETTINGS,
  DEFAULT_SEGMENT,
} from '@/types/teleprompter.types';
import { saveProject, scheduleAutoSave } from '@/core/storage/ProjectStorage';

interface TeleprompterStore {
  // Project state
  project: Project | null;
  isLoading: boolean;
  hasUnsavedChanges: boolean;
  
  // Playback state
  playback: PlaybackState;
  
  // Editor state
  editor: EditorState;
  
  // Actions - Project
  setProject: (project: Project | null) => void;
  updateProjectName: (name: string) => void;
  updateSettings: (settings: Partial<ProjectSettings>) => void;
  saveCurrentProject: () => Promise<void>;
  
  // Actions - Segments
  addSegment: (segment?: Partial<Segment>) => void;
  updateSegment: (id: string, updates: Partial<Segment>) => void;
  deleteSegment: (id: string) => void;
  duplicateSegment: (id: string) => void;
  reorderSegments: (fromIndex: number, toIndex: number) => void;
  
  // Actions - Playback
  play: () => void;
  pause: () => void;
  stop: () => void;
  nextSegment: () => void;
  prevSegment: () => void;
  setCurrentSegment: (index: number) => void;
  setSpeed: (speed: number) => void;
  setScrollOffset: (offset: number) => void;
  setProgress: (progress: number) => void;
  toggleMirror: () => void;
  
  // Actions - Editor
  selectSegment: (id: string | null) => void;
  setEditing: (isEditing: boolean) => void;
  setDragging: (isDragging: boolean, segmentId?: string | null) => void;
}

export const useTeleprompterStore = create<TeleprompterStore>((set, get) => ({
  // Initial state
  project: null,
  isLoading: false,
  hasUnsavedChanges: false,
  
  playback: {
    isPlaying: false,
    isPaused: false,
    currentSegmentId: null,
    currentSegmentIndex: 0,
    scrollOffset: 0,
    totalHeight: 0,
    progress: 0,
    speed: 100,
    startTime: null,
    elapsedTime: 0,
  },
  
  editor: {
    selectedSegmentId: null,
    isEditing: false,
    isDragging: false,
    draggedSegmentId: null,
  },
  
  // Project actions
  setProject: (project) => {
    set({ project, hasUnsavedChanges: false });
    if (project && project.segments.length > 0) {
      set((state) => ({
        playback: {
          ...state.playback,
          currentSegmentId: project.segments[0].id,
          currentSegmentIndex: 0,
          speed: project.settings.defaultScrollSpeed,
        },
        editor: {
          ...state.editor,
          selectedSegmentId: project.segments[0].id,
        },
      }));
    }
  },
  
  updateProjectName: (name) => {
    const { project } = get();
    if (!project) return;
    
    const updated = { ...project, name };
    set({ project: updated, hasUnsavedChanges: true });
    scheduleAutoSave(updated);
  },
  
  updateSettings: (settings) => {
    const { project } = get();
    if (!project) return;
    
    const updated = {
      ...project,
      settings: { ...project.settings, ...settings },
    };
    set({ project: updated, hasUnsavedChanges: true });
    scheduleAutoSave(updated);
  },
  
  saveCurrentProject: async () => {
    const { project } = get();
    if (!project) return;
    
    set({ isLoading: true });
    await saveProject(project);
    set({ isLoading: false, hasUnsavedChanges: false });
  },
  
  // Segment actions
  addSegment: (segment = {}) => {
    const { project } = get();
    if (!project) return;
    
    const newSegment: Segment = {
      ...DEFAULT_SEGMENT,
      id: uuidv4(),
      name: `Segment ${project.segments.length + 1}`,
      order: project.segments.length,
      scrollSpeed: project.settings.defaultScrollSpeed,
      fontSize: project.settings.defaultFontSize,
      fontFamily: project.settings.defaultFontFamily,
      textColor: project.settings.defaultTextColor,
      lineHeight: project.settings.defaultLineHeight,
      mirror: project.settings.mirrorMode,
      ...segment,
    };
    
    const updated = {
      ...project,
      segments: [...project.segments, newSegment],
    };
    
    set({
      project: updated,
      hasUnsavedChanges: true,
      editor: { ...get().editor, selectedSegmentId: newSegment.id },
    });
    
    // Set as current if first segment
    if (updated.segments.length === 1) {
      set((state) => ({
        playback: {
          ...state.playback,
          currentSegmentId: newSegment.id,
          currentSegmentIndex: 0,
        },
      }));
    }
    
    scheduleAutoSave(updated);
  },
  
  updateSegment: (id, updates) => {
    const { project } = get();
    if (!project) return;
    
    const updated = {
      ...project,
      segments: project.segments.map((seg) =>
        seg.id === id ? { ...seg, ...updates } : seg
      ),
    };
    
    set({ project: updated, hasUnsavedChanges: true });
    scheduleAutoSave(updated);
  },
  
  deleteSegment: (id) => {
    const { project, playback, editor } = get();
    if (!project) return;
    
    const newSegments = project.segments
      .filter((seg) => seg.id !== id)
      .map((seg, index) => ({ ...seg, order: index }));
    
    const updated = { ...project, segments: newSegments };
    
    // Update selection and playback if needed
    let newSelectedId = editor.selectedSegmentId;
    let newCurrentId = playback.currentSegmentId;
    let newCurrentIndex = playback.currentSegmentIndex;
    
    if (editor.selectedSegmentId === id) {
      newSelectedId = newSegments[0]?.id || null;
    }
    
    if (playback.currentSegmentId === id) {
      newCurrentIndex = Math.max(0, playback.currentSegmentIndex - 1);
      newCurrentId = newSegments[newCurrentIndex]?.id || null;
    }
    
    set({
      project: updated,
      hasUnsavedChanges: true,
      editor: { ...editor, selectedSegmentId: newSelectedId },
      playback: {
        ...playback,
        currentSegmentId: newCurrentId,
        currentSegmentIndex: newCurrentIndex,
      },
    });
    
    scheduleAutoSave(updated);
  },
  
  duplicateSegment: (id) => {
    const { project } = get();
    if (!project) return;
    
    const original = project.segments.find((seg) => seg.id === id);
    if (!original) return;
    
    const duplicate: Segment = {
      ...original,
      id: uuidv4(),
      name: `${original.name} (Copy)`,
      order: project.segments.length,
    };
    
    const updated = {
      ...project,
      segments: [...project.segments, duplicate],
    };
    
    set({ project: updated, hasUnsavedChanges: true });
    scheduleAutoSave(updated);
  },
  
  reorderSegments: (fromIndex, toIndex) => {
    const { project } = get();
    if (!project) return;
    
    const segments = [...project.segments];
    const [moved] = segments.splice(fromIndex, 1);
    segments.splice(toIndex, 0, moved);
    
    const reordered = segments.map((seg, index) => ({ ...seg, order: index }));
    const updated = { ...project, segments: reordered };
    
    set({ project: updated, hasUnsavedChanges: true });
    scheduleAutoSave(updated);
  },
  
  // Playback actions
  play: () => {
    const { project, playback } = get();
    if (!project || project.segments.length === 0) return;
    
    set({
      playback: {
        ...playback,
        isPlaying: true,
        isPaused: false,
        startTime: Date.now(),
      },
    });
  },
  
  pause: () => {
    set((state) => ({
      playback: {
        ...state.playback,
        isPaused: true,
      },
    }));
  },
  
  stop: () => {
    set((state) => ({
      playback: {
        ...state.playback,
        isPlaying: false,
        isPaused: false,
        scrollOffset: 0,
        progress: 0,
        startTime: null,
        elapsedTime: 0,
      },
    }));
  },
  
  nextSegment: () => {
    const { project, playback } = get();
    if (!project) return;
    
    const nextIndex = Math.min(playback.currentSegmentIndex + 1, project.segments.length - 1);
    const nextSegment = project.segments[nextIndex];
    
    if (nextSegment) {
      set({
        playback: {
          ...playback,
          currentSegmentId: nextSegment.id,
          currentSegmentIndex: nextIndex,
          scrollOffset: 0,
          progress: 0,
        },
      });
    }
  },
  
  prevSegment: () => {
    const { project, playback } = get();
    if (!project) return;
    
    const prevIndex = Math.max(playback.currentSegmentIndex - 1, 0);
    const prevSegment = project.segments[prevIndex];
    
    if (prevSegment) {
      set({
        playback: {
          ...playback,
          currentSegmentId: prevSegment.id,
          currentSegmentIndex: prevIndex,
          scrollOffset: 0,
          progress: 0,
        },
      });
    }
  },
  
  setCurrentSegment: (index) => {
    const { project, playback } = get();
    if (!project || index < 0 || index >= project.segments.length) return;
    
    const segment = project.segments[index];
    set({
      playback: {
        ...playback,
        currentSegmentId: segment.id,
        currentSegmentIndex: index,
        scrollOffset: 0,
        progress: 0,
      },
    });
  },
  
  setSpeed: (speed) => {
    set((state) => ({
      playback: {
        ...state.playback,
        speed: Math.max(20, Math.min(500, speed)),
      },
    }));
  },
  
  setScrollOffset: (offset) => {
    set((state) => ({
      playback: { ...state.playback, scrollOffset: offset },
    }));
  },
  
  setProgress: (progress) => {
    set((state) => ({
      playback: { ...state.playback, progress },
    }));
  },
  
  toggleMirror: () => {
    const { project } = get();
    if (!project) return;
    
    const updated = {
      ...project,
      settings: {
        ...project.settings,
        mirrorMode: !project.settings.mirrorMode,
      },
    };
    
    set({ project: updated, hasUnsavedChanges: true });
    scheduleAutoSave(updated);
  },
  
  // Editor actions
  selectSegment: (id) => {
    set((state) => ({
      editor: { ...state.editor, selectedSegmentId: id },
    }));
  },
  
  setEditing: (isEditing) => {
    set((state) => ({
      editor: { ...state.editor, isEditing },
    }));
  },
  
  setDragging: (isDragging, segmentId = null) => {
    set((state) => ({
      editor: {
        ...state.editor,
        isDragging,
        draggedSegmentId: segmentId,
      },
    }));
  },
}));
