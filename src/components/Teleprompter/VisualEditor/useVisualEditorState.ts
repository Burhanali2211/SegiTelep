import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Region } from '@/types/teleprompter.types';
import type { VisualSegment, ImagePage, SaveStatus } from './types/visualEditor.types';
import { formatTime, parseTime } from './utils/formatTime';

export type { VisualSegment, ImagePage, SaveStatus };

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
  
  // Drag state (for save locking)
  isActiveDrag: boolean;
  
  // Playback
  playbackTime: number;
  isPlaying: boolean;
  playbackSpeed: number;
  
  // Chain mode
  chainTimesMode: boolean;
  
  // Audio
  audioFile: { id: string; name: string; data: string; duration: number } | null;
  
  // Fullscreen player
  showPlayer: boolean;
  
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
  addPage: (data: string, isPDF?: boolean) => void;
  removePage: (index: number) => void;
  setCurrentPage: (index: number) => void;
  
  // Actions - Segments
  addSegment: (pageIndex: number, region: Region) => void;
  updateSegment: (id: string, updates: Partial<VisualSegment>) => void;
  deleteSegments: (ids: string[]) => void;
  duplicateSegment: (id: string) => void;
  moveSegmentUp: (id: string) => void;
  moveSegmentDown: (id: string) => void;
  
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
  setActiveDrag: (active: boolean) => void;
  
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
  spaceEvenlySelected: (startTime: number, endTime: number) => void;
  setDurationForSelected: (duration: number) => void;
  alignSelectedToGrid: (gridSeconds: number) => void;
  
  // Actions - Audio
  setAudioFile: (file: { id: string; name: string; data: string; duration: number } | null) => void;
  
  // Actions - Fullscreen player
  setShowPlayer: (show: boolean) => void;
  
  // Actions - Aspect ratio
  setAspectRatioConstraint: (ratio: string | null) => void;
  setCustomAspectRatio: (ratio: { width: number; height: number }) => void;
  applyAspectRatioToSelected: (ratio: string | null) => void;
  
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
  isActiveDrag: false,
  playbackTime: 0,
  isPlaying: false,
  playbackSpeed: 1,
  chainTimesMode: false,
  audioFile: null as { id: string; name: string; data: string; duration: number } | null,
  showPlayer: false,
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
  
  // Load project data (with validation to prevent crashes from malformed data)
  loadProjectData: (data) => {
    // #region agent log
    const pageCount = Array.isArray(data.pages) ? data.pages.length : 0;
    const d0 = Array.isArray(data.pages) ? data.pages[0]?.data : undefined;
    const firstPageDataKind = typeof d0 === 'string' ? (d0.startsWith('data:') ? 'dataUrl' : d0.startsWith('blob:') ? 'blob' : 'path') : 'none';
    // fetch('http://127.0.0.1:7242/ingest/784514f5-0201-4165-905e-642cc13d7946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVisualEditorState.ts:loadProjectData',message:'loadProjectData entry',data:{projectId:data.projectId,pageCount,firstPageDataKind},timestamp:Date.now(),hypothesisId:'C,D'})}).catch(()=>{});
    // #endregion
    const rawPages = Array.isArray(data.pages) ? data.pages : [];
    const safePages: ImagePage[] = [];
    for (const p of rawPages) {
      if (!p || typeof p !== 'object' || typeof p.data !== 'string') continue;
      const segments = Array.isArray(p.segments) ? p.segments : [];
      const safeSegments: VisualSegment[] = segments.map((s: any, idx: number) => {
        if (!s || typeof s !== 'object') return null;
        const r = s.region;
        const region: Region = r && typeof r === 'object'
          ? {
              x: typeof r.x === 'number' ? r.x : 0,
              y: typeof r.y === 'number' ? r.y : 0,
              width: typeof r.width === 'number' ? Math.max(1, r.width) : 10,
              height: typeof r.height === 'number' ? Math.max(1, r.height) : 10,
            }
          : { x: 0, y: 0, width: 10, height: 10 };
        return {
          id: typeof s.id === 'string' ? s.id : `seg-${idx}`,
          pageIndex: typeof s.pageIndex === 'number' ? s.pageIndex : 0,
          region,
          label: typeof s.label === 'string' ? s.label : `Segment ${idx + 1}`,
          startTime: typeof s.startTime === 'number' ? s.startTime : 0,
          endTime: typeof s.endTime === 'number' ? s.endTime : 5,
          isHidden: !!s.isHidden,
          order: typeof s.order === 'number' ? s.order : idx,
          color: typeof s.color === 'string' ? s.color : undefined,
          notes: typeof s.notes === 'string' ? s.notes : undefined,
        };
      }).filter((x): x is VisualSegment => x !== null);
      safePages.push({
        id: typeof p.id === 'string' ? p.id : `page-${Date.now()}-${safePages.length}`,
        data: p.data,
        segments: safeSegments,
      });
    }
    set({
      projectId: data.projectId || null,
      projectName: typeof data.projectName === 'string' ? data.projectName : 'Untitled Project',
      pages: safePages,
      audioFile: data.audioFile && typeof data.audioFile === 'object' && data.audioFile.data
        ? data.audioFile
        : null,
      lastSaved: typeof data.lastSaved === 'number' ? data.lastSaved : null,
      isDirty: false,
      saveStatus: 'idle',
      isLoading: false,
      currentPageIndex: 0,
      selectedSegmentIds: new Set(),
      lastSelectedId: null,
      showPlayer: false,
    });
  },
  
  // Pages
  addPage: (data, isPDF) => {
    const newPage: ImagePage = {
      id: uuidv4(),
      data,
      segments: [],
      isPDF, // Set the isPDF flag
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
    // Reset view state when switching pages for consistent experience
    set({ 
      currentPageIndex: index, 
      selectedSegmentIds: new Set(),
      zoom: 1,
      pan: { x: 0, y: 0 },
    });
  },
  
  // Segments
  addSegment: (pageIndex, region) => {
    const { pages } = get();
    const page = pages[pageIndex];
    if (!page) return;
    
    // Calculate global segment count across ALL pages
    const totalGlobalSegments = pages.reduce((acc, p) => acc + p.segments.length, 0);
    
    // Find the last end time across ALL pages (for continuity)
    let lastEndTime = 0;
    pages.forEach(p => {
      p.segments.forEach(s => {
        if (s.endTime > lastEndTime) {
          lastEndTime = s.endTime;
        }
      });
    });
    
    const newSegment: VisualSegment = {
      id: uuidv4(),
      pageIndex,
      region,
      label: `Segment ${totalGlobalSegments + 1}`,
      startTime: lastEndTime,
      endTime: lastEndTime + 5, // Default 5 second duration
      isHidden: false,
      order: page.segments.length,
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
  
  moveSegmentUp: (id) => {
    set((state) => {
      const newPages = state.pages.map((page) => {
        const idx = page.segments.findIndex(s => s.id === id);
        if (idx <= 0) return page;
        
        const segments = [...page.segments];
        [segments[idx - 1], segments[idx]] = [segments[idx], segments[idx - 1]];
        return {
          ...page,
          segments: segments.map((s, i) => ({ ...s, order: i })),
        };
      });
      return { pages: newPages, isDirty: true };
    });
  },
  
  moveSegmentDown: (id) => {
    set((state) => {
      const newPages = state.pages.map((page) => {
        const idx = page.segments.findIndex(s => s.id === id);
        if (idx < 0 || idx >= page.segments.length - 1) return page;
        
        const segments = [...page.segments];
        [segments[idx], segments[idx + 1]] = [segments[idx + 1], segments[idx]];
        return {
          ...page,
          segments: segments.map((s, i) => ({ ...s, order: i })),
        };
      });
      return { pages: newPages, isDirty: true };
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
  
  setActiveDrag: (active) => {
    set({ isActiveDrag: active });
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
  
  spaceEvenlySelected: (startTime, endTime) => {
    const { selectedSegmentIds, getAllSegmentsOrdered } = get();
    const ordered = getAllSegmentsOrdered().filter(s => selectedSegmentIds.has(s.id));
    if (ordered.length === 0) return;
    
    const totalDuration = endTime - startTime;
    const durationPer = totalDuration / ordered.length;
    
    set((state) => {
      const newPages = state.pages.map((page) => ({
        ...page,
        segments: page.segments.map((s) => {
          if (!selectedSegmentIds.has(s.id)) return s;
          const idx = ordered.findIndex(o => o.id === s.id);
          const newStart = startTime + idx * durationPer;
          const newEnd = newStart + durationPer;
          return { ...s, startTime: newStart, endTime: newEnd };
        }),
      }));
      return { pages: newPages, isDirty: true };
    });
  },
  
  setDurationForSelected: (duration) => {
    const { selectedSegmentIds } = get();
    
    set((state) => ({
      pages: state.pages.map((page) => ({
        ...page,
        segments: page.segments.map((s) => {
          if (!selectedSegmentIds.has(s.id)) return s;
          return {
            ...s,
            endTime: s.startTime + duration,
          };
        }),
      })),
      isDirty: true,
    }));
  },
  
  alignSelectedToGrid: (gridSeconds) => {
    const { selectedSegmentIds } = get();
    const round = (t: number) => Math.round(t / gridSeconds) * gridSeconds;
    
    set((state) => ({
      pages: state.pages.map((page) => ({
        ...page,
        segments: page.segments.map((s) => {
          if (!selectedSegmentIds.has(s.id)) return s;
          const start = round(s.startTime);
          const end = round(s.endTime);
          return {
            ...s,
            startTime: Math.max(0, start),
            endTime: Math.max(start + 0.1, end),
          };
        }),
      })),
      isDirty: true,
    }));
  },
  
  // Audio
  setAudioFile: (file) => {
    set({ audioFile: file, isDirty: true });
  },

  setShowPlayer: (show) => set({ showPlayer: show }),
  
  // Aspect ratio
  setAspectRatioConstraint: (ratio) => {
    set({ aspectRatioConstraint: ratio });
  },
  
  setCustomAspectRatio: (ratio) => {
    set({ customAspectRatio: ratio });
  },

  applyAspectRatioToSelected: (ratio) => {
    const { selectedSegmentIds, customAspectRatio } = get();
    if (selectedSegmentIds.size === 0 || !ratio) return;

    const ratioVal = (() => {
      if (ratio === 'auto-detect') {
        const w = typeof screen !== 'undefined' ? screen.width : 1920;
        const h = typeof screen !== 'undefined' ? screen.height : 1080;
        return w / Math.max(1, h);
      }
      const presets: Record<string, number> = {
        '16:9': 16 / 9, '4:3': 4 / 3, '1:1': 1,
        '9:16': 9 / 16, '3:4': 3 / 4, '21:9': 21 / 9,
      };
      if (presets[ratio]) return presets[ratio];
      if (ratio === 'custom' && customAspectRatio) {
        return customAspectRatio.width / customAspectRatio.height;
      }
      return null;
    })();
    if (ratioVal === null) return;

    set((state) => ({
      pages: state.pages.map((page) => ({
        ...page,
        segments: page.segments.map((s) => {
          if (!selectedSegmentIds.has(s.id)) return s;
          const r = s.region;
          const cx = r.x + r.width / 2;
          const cy = r.y + r.height / 2;
          const maxHalfW = Math.min(cx, 100 - cx);
          const maxHalfH = Math.min(cy, 100 - cy);
          let halfW: number, halfH: number;
          const halfW1 = maxHalfW;
          const halfH1 = Math.min(maxHalfH, halfW1 / ratioVal);
          const halfH2 = maxHalfH;
          const halfW2 = Math.min(maxHalfW, halfH2 * ratioVal);
          if (halfW1 * halfH1 >= halfW2 * halfH2) {
            halfW = halfW1;
            halfH = halfH1;
          } else {
            halfW = halfW2;
            halfH = halfH2;
          }
          const minHalf = 1;
          halfW = Math.max(minHalf, halfW);
          halfH = Math.max(minHalf, halfH);
          const newRegion = {
            x: Math.max(0, Math.min(100 - halfW * 2, cx - halfW)),
            y: Math.max(0, Math.min(100 - halfH * 2, cy - halfH)),
            width: halfW * 2,
            height: halfH * 2,
          };
          return { ...s, region: newRegion };
        }),
      })),
      isDirty: true,
    }));
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

export { formatTime, parseTime } from './utils/formatTime';
