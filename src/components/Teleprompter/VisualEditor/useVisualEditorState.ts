import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Region } from '@/types/teleprompter.types';
import type { VisualSegment, ImagePage, SaveStatus } from './types/visualEditor.types';
import { AssetManager } from '@/core/storage/AssetManager';
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
  startupMode: 'welcome' | 'editor';

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
  addPage: (data: string | Blob, isPDF?: boolean) => Promise<void>;
  removePage: (index: number) => void;
  setCurrentPage: (index: number) => void;

  // Actions - Segments
  addSegment: (pageIndex: number, region: Region) => void;
  updateSegment: (id: string, updates: Partial<VisualSegment>) => void;
  deleteSegments: (ids: string[]) => void;
  duplicateSegment: (id: string) => void;
  moveSegmentUp: (id: string) => void;
  moveSegmentDown: (id: string) => void;
  reorderSegment: (id: string, newIndex: number) => void;

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
  setStartupMode: (mode: 'welcome' | 'editor') => void;

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
  }) => Promise<void>;
}

const initialState = {
  projectId: null as string | null,
  projectName: 'Untitled Project',
  lastSaved: null as number | null,
  isDirty: false,
  saveStatus: 'idle' as SaveStatus,
  isLoading: false,
  startupMode: 'welcome' as 'welcome' | 'editor',
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
  setStartupMode: (mode) => set({ startupMode: mode }),
  markDirty: () => set({ isDirty: true }),

  // Load project data (with validation and legacy data migration)
  loadProjectData: async (data) => {
    const rawPages = Array.isArray(data.pages) ? data.pages : [];
    const safePages: ImagePage[] = [];

    // Revoke old URLs before loading new ones
    AssetManager.revokeAll();

    for (const p of rawPages) {
      if (!p || typeof p !== 'object') continue;

      let assetId = p.assetId;

      // Migration: if no assetId but has data (base64)
      if (!assetId && p.data && typeof p.data === 'string' && p.data.startsWith('data:')) {
        assetId = await AssetManager.saveAsset(p.data, `migrated-${p.id}`);
      }

      const segments = Array.isArray(p.segments) ? p.segments : [];
      const safeSegments: VisualSegment[] = segments.map((s: unknown, idx: number) => {
        if (!s || typeof s !== 'object') return null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const src = s as any;
        const r = src.region;
        const region: Region = r && typeof r === 'object'
          ? {
            x: typeof r.x === 'number' ? r.x : 0,
            y: typeof r.y === 'number' ? r.y : 0,
            width: typeof r.width === 'number' ? Math.max(1, r.width) : 10,
            height: typeof r.height === 'number' ? Math.max(1, r.height) : 10,
          }
          : { x: 0, y: 0, width: 10, height: 10 };
        const safeSeg: VisualSegment = {
          id: typeof src.id === 'string' ? src.id : `seg-${idx}`,
          pageIndex: typeof src.pageIndex === 'number' ? src.pageIndex : 0,
          region,
          label: typeof src.label === 'string' ? src.label : `Segment ${idx + 1}`,
          startTime: typeof src.startTime === 'number' ? src.startTime : 0,
          endTime: typeof src.endTime === 'number' ? src.endTime : 5,
          isHidden: !!src.isHidden,
          order: typeof src.order === 'number' ? src.order : idx,
        };
        if (typeof src.color === 'string') safeSeg.color = src.color;
        if (typeof src.notes === 'string') safeSeg.notes = src.notes;
        return safeSeg;
      }).filter((s): s is VisualSegment => s !== null);

      safePages.push({
        id: typeof p.id === 'string' ? p.id : `page-${Date.now()}-${safePages.length}`,
        assetId,
        data: typeof p.data === 'string' ? p.data : undefined,
        segments: safeSegments,
        isPDF: !!p.isPDF
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
      startupMode: 'editor',
    });
  },

  // Pages
  addPage: async (data, isPDF) => {
    const assetId = await AssetManager.saveAsset(data, `page-${Date.now()}`);

    // Create a temporary usage URL for the session/saving
    let dataUrl: string | undefined;
    if (typeof data === 'string') {
      dataUrl = data;
    } else if (data instanceof Blob) {
      dataUrl = URL.createObjectURL(data);
    }

    const newPage: ImagePage = {
      id: uuidv4(),
      assetId,
      data: dataUrl,
      segments: [],
      isPDF,
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
      // Find the segment across all pages
      let editedSegment: VisualSegment | null = null;
      for (const page of state.pages) {
        const s = page.segments.find(seg => seg.id === id);
        if (s) { editedSegment = s; break; }
      }

      if (!editedSegment) return state;

      const oldStart = editedSegment.startTime;
      const oldEnd = editedSegment.endTime;
      const isStartShift = updates.startTime !== undefined;
      const delta = isStartShift ? (updates.startTime! - oldStart) : (updates.endTime !== undefined ? (updates.endTime - oldEnd) : 0);
      const threshold = isStartShift ? oldStart : oldEnd;

      const newPages = state.pages.map((page) => ({
        ...page,
        segments: page.segments.map((s) => {
          if (s.id === id) {
            const nextStart = updates.startTime ?? s.startTime;
            let nextEnd = updates.endTime ?? s.endTime;
            // Shifting start preserves duration in chain mode
            if (chainTimesMode && isStartShift && updates.endTime === undefined) {
              nextEnd = s.endTime + delta;
            }
            if (nextEnd < nextStart) nextEnd = nextStart + 0.1;
            return { ...s, ...updates, startTime: nextStart, endTime: nextEnd };
          }

          if (chainTimesMode && delta !== 0 && s.startTime >= threshold - 0.001) {
            return {
              ...s,
              startTime: Math.max(0, s.startTime + delta),
              endTime: Math.max(0.1, s.endTime + delta),
            };
          }
          return s;
        }),
      }));

      return { pages: newPages, isDirty: true };
    });
  },

  deleteSegments: (ids) => {
    const { chainTimesMode } = get();

    set((state) => {
      // For Ripple Delete (Chain Mode), track durations of deleted segments
      const deletedInfo: { start: number; dur: number }[] = [];
      state.pages.forEach(p => p.segments.forEach(s => {
        if (ids.includes(s.id)) deletedInfo.push({ start: s.startTime, dur: s.endTime - s.startTime });
      }));

      const newPages = state.pages.map((page) => ({
        ...page,
        segments: page.segments
          .filter(s => !ids.includes(s.id))
          .map((s, i) => {
            if (!chainTimesMode) return { ...s, order: i };
            // Ripple: shift back by sum of durations of segments deleted before this one
            const shift = deletedInfo
              .filter(d => d.start < s.startTime)
              .reduce((acc, d) => acc + d.dur, 0);
            return {
              ...s,
              order: i,
              startTime: Math.max(0, s.startTime - shift),
              endTime: Math.max(0.1, s.endTime - shift),
            };
          }),
      }));

      return {
        pages: newPages,
        selectedSegmentIds: new Set(),
        lastSelectedId: null,
        isDirty: true,
      };
    });
  },

  duplicateSegment: (id) => {
    const { chainTimesMode } = get();
    set((state) => {
      let source: VisualSegment | null = null;
      for (const p of state.pages) {
        const s = p.segments.find(seg => seg.id === id);
        if (s) { source = s; break; }
      }
      if (!source) return state;

      const duration = source.endTime - source.startTime;
      const newId = uuidv4();

      const newPages = state.pages.map((page) => {
        const containsSource = page.segments.some(s => s.id === id);

        let updatedSegments = page.segments.map(s => {
          if (chainTimesMode && s.startTime >= source!.endTime - 0.001) {
            return { ...s, startTime: s.startTime + duration, endTime: s.endTime + duration };
          }
          return s;
        });

        if (containsSource) {
          const duplicate: VisualSegment = {
            ...source!,
            id: newId,
            label: `${source!.label} (copy)`,
            startTime: source!.endTime,
            endTime: source!.endTime + duration,
            order: updatedSegments.length,
            region: {
              ...source!.region,
              x: Math.min(source!.region.x + 2, 100 - source!.region.width),
              y: Math.min(source!.region.y + 2, 100 - source!.region.height),
            },
          };
          updatedSegments.push(duplicate);
        }

        return {
          ...page,
          segments: updatedSegments.sort((a, b) => a.startTime - b.startTime).map((s, i) => ({ ...s, order: i }))
        };
      });

      return { pages: newPages, isDirty: true, selectedSegmentIds: new Set([newId]) };
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

  reorderSegment: (id, newIndex) => {
    set((state) => {
      const newPages = state.pages.map((page) => {
        const idx = page.segments.findIndex((s) => s.id === id);
        if (idx === -1) return page;

        const segments = [...page.segments];
        if (newIndex < 0 || newIndex >= segments.length) return page;

        const [moved] = segments.splice(idx, 1);
        segments.splice(newIndex, 0, moved);

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
    const { selectedSegmentIds, chainTimesMode } = get();

    set((state) => {
      // Find the furthest selected segment to determine ripple threshold
      let maxOldStart = -1;
      state.pages.forEach(p => p.segments.forEach(s => {
        if (selectedSegmentIds.has(s.id)) maxOldStart = Math.max(maxOldStart, s.startTime);
      }));

      const newPages = state.pages.map((page) => ({
        ...page,
        segments: page.segments.map(s => {
          if (selectedSegmentIds.has(s.id)) {
            return {
              ...s,
              startTime: Math.max(0, s.startTime + delta),
              endTime: Math.max(0.1, s.endTime + delta),
            };
          }
          // Ripple shift downstream segments
          if (chainTimesMode && delta !== 0 && s.startTime > maxOldStart) {
            return {
              ...s,
              startTime: Math.max(0, s.startTime + delta),
              endTime: Math.max(0.1, s.endTime + delta),
            };
          }
          return s;
        }),
      }));
      return { pages: newPages, isDirty: true };
    });
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
