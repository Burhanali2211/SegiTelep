import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Project, Segment, ProjectSettings, DEFAULT_SEGMENT } from '@/types/teleprompter.types';
import { saveProject, scheduleAutoSave } from '@/core/storage/ProjectStorage';
import { TeleprompterStore } from '../teleprompterStore';

export interface ProjectSlice {
  project: Project | null;
  isLoading: boolean;
  hasUnsavedChanges: boolean;
  
  setProject: (project: Project | null) => void;
  updateProjectName: (name: string) => void;
  updateSettings: (settings: Partial<ProjectSettings>) => void;
  saveCurrentProject: () => Promise<void>;
  
  addSegment: (segment?: Partial<Segment>) => void;
  updateSegment: (id: string, updates: Partial<Segment>) => void;
  deleteSegment: (id: string) => void;
  duplicateSegment: (id: string) => void;
  reorderSegments: (fromIndex: number, toIndex: number) => void;
}

export const createProjectSlice: StateCreator<
  TeleprompterStore,
  [],
  [],
  ProjectSlice
> = (set, get) => ({
  project: null,
  isLoading: false,
  hasUnsavedChanges: false,

  setProject: (project) => {
    set({ project, hasUnsavedChanges: false });
    // Side effects on other slices handled in implementation
    if (project && project.segments.length > 0) {
      const state = get();
      state.playback.currentSegmentId = project.segments[0].id;
      state.playback.currentSegmentIndex = 0;
      state.playback.speed = project.settings.defaultScrollSpeed;
      state.editor.selectedSegmentId = project.segments[0].id;
      
      // Trigger updates for other slices
      set((s) => ({
         playback: { ...s.playback },
         editor: { ...s.editor }
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
    
    set((state) => ({
      project: updated,
      hasUnsavedChanges: true,
      editor: { ...state.editor, selectedSegmentId: newSegment.id }
    }));
    
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
});
