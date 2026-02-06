import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Region } from '@/types/teleprompter.types';

export interface VisualSegment {
  id: string;
  pageIndex: number;
  region: Region;
  label: string;
  startTime: number; // seconds with centiseconds
  endTime: number;
  isHidden: boolean;
  order: number;
}

export interface ImagePage {
  id: string;
  data: string; // base64 data URL
  segments: VisualSegment[];
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface VisualEditorState {
  // Project metadata
  projectId: string | null;
  projectName: string;
  lastSaved: number | null;
  isDirty: boolean;
  saveStatus: SaveStatus;
  isLoading: boolean;
  
  // Pages and segments
  pages: ImagePage[];
  currentPageIndex: number;
  
  // Selection
  selectedSegmentIds: Set<string>;
  lastSelectedId: string | null;
  
  // Clipboard
  clipboard: VisualSegment[];
  
  // View controls
  zoom: number;
  pan: { x: number; y: number };
  
  // Drawing
  isDrawing: boolean;
  
  // Playback
  playbackTime: number;
  isPlaying: boolean;
  playbackSpeed: number;
  
  // Chain mode
  chainTimesMode: boolean;
  
  // Audio
  audioFile: { id: string; name: string; data: string; duration: number } | null;
  
  // Aspect ratio constraint for drawing
  aspectRatioConstraint: string | null; // null = free, "16:9", "4:3", "1:1", "9:16", "custom"
  customAspectRatio: { width: number; height: number };
  
  // Actions - Project
  setProjectId: (id: string | null) => void;
  setProjectName: (name: string) => void;
  setLastSaved: (timestamp: number | null) => void;
  setIsDirty: (dirty: boolean) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setIsLoading: (loading: boolean) => void;
  markDirty: () => void;
  
  // Actions - Pages
  addPage: (data: string) => void;
  removePage: (index: number) => void;
  setCurrentPage: (index: number) => void;
  
  // Actions - Segments
  addSegment: (pageIndex: number, region: Region) => void;
  updateSegment: (id: string, updates: Partial<VisualSegment>) => void;
  deleteSegments: (ids: string[]) => void;
  duplicateSegment: (id: string) => void;
  
  // Actions - Selection
  selectSegment: (id: string, mode: 'single' | 'toggle' | 'range') => void;
  selectAll: () => void;
  deselectAll: () => void;
  
  // Actions - Clipboard
  copySelected: () => void;
  paste: () => void;
  
  // Actions - View
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  resetView: () => void;
  
  // Actions - Drawing
  setDrawing: (isDrawing: boolean) => void;
  
  // Actions - Playback
  setPlaybackTime: (time: number) => void;
  setPlaying: (isPlaying: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  
  // Actions - Chain mode
  toggleChainMode: () => void;
  
  // Actions - Visibility
  toggleSegmentVisibility: (id: string) => void;
  showAllSegments: () => void;
  
  // Actions - Time shifting
  shiftSelectedTimes: (delta: number) => void;
  
  // Actions - Audio
  setAudioFile: (file: { id: string; name: string; data: string; duration: number } | null) => void;
  
  // Actions - Aspect ratio
  setAspectRatioConstraint: (ratio: string | null) => void;
  setCustomAspectRatio: (ratio: { width: number; height: number }) => void;
  
  // Helpers
  getCurrentPage: () => ImagePage | undefined;
  getSelectedSegments: () => VisualSegment[];
  getVisibleSegments: () => VisualSegment[];
  getAllSegmentsOrdered: () => VisualSegment[];
  
  // Reset
  reset: () => void;
  
  // Load project data
  loadProjectData: (data: { 
    projectId: string; 
    projectName: string; 
    pages: ImagePage[]; 
    audioFile: { id: string; name: string; data: string; duration: number } | null;
    lastSaved: number;
  }) => void;
}

const initialState = {
  projectId: null as string | null,
  projectName: 'Untitled Project',
  lastSaved: null as number | null,
  isDirty: false,
  saveStatus: 'idle' as SaveStatus,
  isLoading: false,
  pages: [] as ImagePage[],
  currentPageIndex: 0,
  selectedSegmentIds: new Set<string>(),
  lastSelectedId: null as string | null,
  clipboard: [] as VisualSegment[],
  zoom: 1,
  pan: { x: 0, y: 0 },
  isDrawing: false,
  playbackTime: 0,
  isPlaying: false,
  playbackSpeed: 1,
  chainTimesMode: false,
  audioFile: null as { id: string; name: string; data: string; duration: number } | null,
  aspectRatioConstraint: '16:9' as string | null,
  customAspectRatio: { width: 1280, height: 720 },
};

export const useVisualEditorState = create<VisualEditorState>((set, get) => ({
  ...initialState,
  
  // Project metadata actions
  setProjectId: (id) => set({ projectId: id }),
  setProjectName: (name) => set({ projectName: name, isDirty: true }),
  setLastSaved: (timestamp) => set({ lastSaved: timestamp }),
  setIsDirty: (dirty) => set({ isDirty: dirty }),
  setSaveStatus: (status) => set({ saveStatus: status }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  markDirty: () => set({ isDirty: true }),
  
  // Load project data
  loadProjectData: (data) => {
    set({
      projectId: data.projectId,
      projectName: data.projectName,
      pages: data.pages,
      audioFile: data.audioFile,
      lastSaved: data.lastSaved,
      isDirty: false,
      saveStatus: 'idle',
      isLoading: false,
      currentPageIndex: 0,
      selectedSegmentIds: new Set(),
      lastSelectedId: null,
    });
  },
  
  // Pages
  addPage: (data) => {
    const newPage: ImagePage = {
      id: uuidv4(),
      data,
      segments: [],
    };
    set((state) => ({
      pages: [...state.pages, newPage],
      currentPageIndex: state.pages.length,
      isDirty: true,
    }));
  },
  
  removePage: (index) => {
    set((state) => {
      const newPages = state.pages.filter((_, i) => i !== index);
      return {
        pages: newPages,
        currentPageIndex: Math.min(state.currentPageIndex, newPages.length - 1),
        isDirty: true,
      };
    });
  },
  
  setCurrentPage: (index) => {
    set({ currentPageIndex: index, selectedSegmentIds: new Set() });
  },
  
  // Segments
  addSegment: (pageIndex, region) => {
    const { pages, audioFile } = get();
    const page = pages[pageIndex];
    if (!page) return;
    
    const existingSegments = page.segments;
    const lastEndTime = existingSegments.length > 0
      ? Math.max(...existingSegments.map(s => s.endTime))
      : 0;
    
    const newSegment: VisualSegment = {
      id: uuidv4(),
      pageIndex,
      region,
      label: `Segment ${existingSegments.length + 1}`,
      startTime: lastEndTime,
      endTime: lastEndTime + 5, // Default 5 second duration
      isHidden: false,
      order: existingSegments.length,
    };
    
    set((state) => ({
      pages: state.pages.map((p, i) =>
        i === pageIndex
          ? { ...p, segments: [...p.segments, newSegment] }
          : p
      ),
      selectedSegmentIds: new Set([newSegment.id]),
      lastSelectedId: newSegment.id,
      isDirty: true,
    }));
  },
  
  updateSegment: (id, updates) => {
    const { chainTimesMode } = get();
    
    set((state) => {
      const newPages = state.pages.map((page) => {
        const segmentIndex = page.segments.findIndex(s => s.id === id);
        if (segmentIndex === -1) return page;
        
        const segment = page.segments[segmentIndex];
        const updatedSegment = { ...segment, ...updates };
        
        let newSegments = [...page.segments];
        newSegments[segmentIndex] = updatedSegment;
        
        // Chain mode: shift subsequent segments when endTime changes
        if (chainTimesMode && updates.endTime !== undefined && updates.endTime !== segment.endTime) {
          const delta = updates.endTime - segment.endTime;
          newSegments = newSegments.map((s, i) => {
            if (i > segmentIndex) {
              return { ...s, startTime: s.startTime + delta, endTime: s.endTime + delta };
            }
            return s;
          });
        }
        
        return { ...page, segments: newSegments };
      });
      
      return { pages: newPages, isDirty: true };
    });
  },
  
  deleteSegments: (ids) => {
    set((state) => ({
      pages: state.pages.map((page) => ({
        ...page,
        segments: page.segments
          .filter(s => !ids.includes(s.id))
          .map((s, i) => ({ ...s, order: i })),
      })),
      selectedSegmentIds: new Set(),
      lastSelectedId: null,
      isDirty: true,
    }));
  },
  
  duplicateSegment: (id) => {
    set((state) => {
      const newPages = state.pages.map((page) => {
        const segment = page.segments.find(s => s.id === id);
        if (!segment) return page;
        
        const duplicate: VisualSegment = {
          ...segment,
          id: uuidv4(),
          label: `${segment.label} (copy)`,
          order: page.segments.length,
          // Offset region slightly
          region: {
            ...segment.region,
            x: Math.min(segment.region.x + 2, 100 - segment.region.width),
            y: Math.min(segment.region.y + 2, 100 - segment.region.height),
          },
        };
        
        return { ...page, segments: [...page.segments, duplicate] };
      });
      
      return { pages: newPages };
    });
  },
  
  // Selection
  selectSegment: (id, mode) => {
    set((state) => {
      const currentPage = state.pages[state.currentPageIndex];
      if (!currentPage) return state;
      
      const newSelected = new Set(state.selectedSegmentIds);
      
      if (mode === 'single') {
        newSelected.clear();
        newSelected.add(id);
      } else if (mode === 'toggle') {
        if (newSelected.has(id)) {
          newSelected.delete(id);
        } else {
          newSelected.add(id);
        }
      } else if (mode === 'range' && state.lastSelectedId) {
        // Range select
        const segments = currentPage.segments;
        const lastIndex = segments.findIndex(s => s.id === state.lastSelectedId);
        const currentIndex = segments.findIndex(s => s.id === id);
        
        if (lastIndex !== -1 && currentIndex !== -1) {
          const start = Math.min(lastIndex, currentIndex);
          const end = Math.max(lastIndex, currentIndex);
          for (let i = start; i <= end; i++) {
            newSelected.add(segments[i].id);
          }
        }
      }
      
      return {
        selectedSegmentIds: newSelected,
        lastSelectedId: id,
      };
    });
  },
  
  selectAll: () => {
    const { pages, currentPageIndex } = get();
    const currentPage = pages[currentPageIndex];
    if (!currentPage) return;
    
    set({
      selectedSegmentIds: new Set(currentPage.segments.map(s => s.id)),
    });
  },
  
  deselectAll: () => {
    set({ selectedSegmentIds: new Set(), lastSelectedId: null });
  },
  
  // Clipboard
  copySelected: () => {
    const { selectedSegmentIds, pages, currentPageIndex } = get();
    const currentPage = pages[currentPageIndex];
    if (!currentPage) return;
    
    const selected = currentPage.segments.filter(s => selectedSegmentIds.has(s.id));
    set({ clipboard: selected });
  },
  
  paste: () => {
    const { clipboard, pages, currentPageIndex } = get();
    if (clipboard.length === 0) return;
    
    const currentPage = pages[currentPageIndex];
    if (!currentPage) return;
    
    const newSegments = clipboard.map((seg, i) => ({
      ...seg,
      id: uuidv4(),
      pageIndex: currentPageIndex,
      label: `${seg.label} (pasted)`,
      order: currentPage.segments.length + i,
      region: {
        ...seg.region,
        x: Math.min(seg.region.x + 5, 100 - seg.region.width),
        y: Math.min(seg.region.y + 5, 100 - seg.region.height),
      },
    }));
    
    set((state) => ({
      pages: state.pages.map((p, i) =>
        i === currentPageIndex
          ? { ...p, segments: [...p.segments, ...newSegments] }
          : p
      ),
      selectedSegmentIds: new Set(newSegments.map(s => s.id)),
    }));
  },
  
  // View
  setZoom: (zoom) => {
    set({ zoom: Math.max(0.5, Math.min(4, zoom)) });
  },
  
  setPan: (pan) => {
    set({ pan });
  },
  
  resetView: () => {
    set({ zoom: 1, pan: { x: 0, y: 0 } });
  },
  
  // Drawing
  setDrawing: (isDrawing) => {
    set({ isDrawing });
  },
  
  // Playback
  setPlaybackTime: (time) => {
    set({ playbackTime: time });
  },
  
  setPlaying: (isPlaying) => {
    set({ isPlaying });
  },
  
  setPlaybackSpeed: (speed) => {
    set({ playbackSpeed: speed });
  },
  
  // Chain mode
  toggleChainMode: () => {
    set((state) => ({ chainTimesMode: !state.chainTimesMode }));
  },
  
  // Visibility
  toggleSegmentVisibility: (id) => {
    set((state) => ({
      pages: state.pages.map((page) => ({
        ...page,
        segments: page.segments.map(s =>
          s.id === id ? { ...s, isHidden: !s.isHidden } : s
        ),
      })),
    }));
  },
  
  showAllSegments: () => {
    set((state) => ({
      pages: state.pages.map((page) => ({
        ...page,
        segments: page.segments.map(s => ({ ...s, isHidden: false })),
      })),
    }));
  },
  
  // Time shifting
  shiftSelectedTimes: (delta) => {
    const { selectedSegmentIds } = get();
    
    set((state) => ({
      pages: state.pages.map((page) => ({
        ...page,
        segments: page.segments.map(s => {
          if (!selectedSegmentIds.has(s.id)) return s;
          return {
            ...s,
            startTime: Math.max(0, s.startTime + delta),
            endTime: Math.max(delta > 0 ? s.endTime + delta : s.startTime + 0.1, s.endTime + delta),
          };
        }),
      })),
    }));
  },
  
  // Audio
  setAudioFile: (file) => {
    set({ audioFile: file, isDirty: true });
  },
  
  // Aspect ratio
  setAspectRatioConstraint: (ratio) => {
    set({ aspectRatioConstraint: ratio });
  },
  
  setCustomAspectRatio: (ratio) => {
    set({ customAspectRatio: ratio });
  },
  
  // Helpers
  getCurrentPage: () => {
    const { pages, currentPageIndex } = get();
    return pages[currentPageIndex];
  },
  
  getSelectedSegments: () => {
    const { pages, currentPageIndex, selectedSegmentIds } = get();
    const currentPage = pages[currentPageIndex];
    if (!currentPage) return [];
    return currentPage.segments.filter(s => selectedSegmentIds.has(s.id));
  },
  
  getVisibleSegments: () => {
    const { pages, currentPageIndex } = get();
    const currentPage = pages[currentPageIndex];
    if (!currentPage) return [];
    return currentPage.segments.filter(s => !s.isHidden);
  },
  
  getAllSegmentsOrdered: () => {
    const { pages } = get();
    return pages
      .flatMap((page, pageIndex) =>
        page.segments.map(s => ({ ...s, pageIndex }))
      )
      .sort((a, b) => a.startTime - b.startTime);
  },
  
  // Reset
  reset: () => {
    set({
      ...initialState,
      selectedSegmentIds: new Set<string>(),
    });
  },
}));

// Time formatting utilities
export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const centis = Math.round((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
};

export const parseTime = (timeStr: string): number => {
  const match = timeStr.match(/^(\d+):(\d{2})\.(\d{2})$/);
  if (!match) return 0;
  const [, mins, secs, centis] = match;
  return parseInt(mins) * 60 + parseInt(secs) + parseInt(centis) / 100;
};
