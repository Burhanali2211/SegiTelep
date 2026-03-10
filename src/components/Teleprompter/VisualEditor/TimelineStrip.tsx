import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useVisualEditorState, formatTime, VisualSegment, ImagePage } from './useVisualEditorState';
import { parseTime, formatDuration } from './utils/formatTime';
import { AssetThumbnail } from './components/AssetThumbnail';
import { useUndoRedo } from './useUndoRedo';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  MoreVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';


// --- Compact Time Adjuster ---
const TimePillAdjuster = memo<{
  value: number;
  onAdjust: (delta: number) => void;
  label: string;
  className?: string;
}>(({ value, onAdjust, label, className }) => {
  const [isActive, setIsActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsActive(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [isActive]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isActive) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY < 0 ? 1 : -1;
      onAdjust(delta);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [isActive, onAdjust]);

  return (
    <div
      ref={containerRef}
      onClick={(e) => {
        e.stopPropagation();
        setIsActive(true);
      }}
      className={cn(
        "flex items-center transition-all select-none cursor-pointer rounded-sm px-1.5 py-1",
        isActive
          ? "bg-primary text-primary-foreground shadow-[0_0_12px_rgba(var(--primary),0.6)] border border-primary/20"
          : "text-white/80 hover:text-white hover:bg-white/5",
        className
      )}
    >
      <span className={cn(
        "font-black text-[12px] tabular-nums tracking-tight transition-colors",
        isActive ? "text-white" : "text-white/90"
      )}>
        {formatTime(value)}
      </span>
    </div>
  );
});

// --- Duration Adjuster Component ---
const DurationAdjuster = memo<{
  duration: number;
  onAdjust: (delta: number) => void;
  className?: string;
}>(({ duration, onAdjust, className }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(Math.round(duration).toString());


  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const val = parseTime(tempValue);
      if (!isNaN(val)) {
        onAdjust(val - duration);
      }
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setTempValue(formatDuration(duration));
    }
  };

  const handleBlur = () => {
    const val = parseTime(tempValue);
    if (!isNaN(val)) {
      onAdjust(val - duration);
    }
    setIsEditing(false);
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <div
        className="flex items-center justify-between bg-muted/20 rounded-lg border border-border/5 p-0.5 group/dur hover:border-primary/20 transition-all select-none"
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-all"
          onClick={(e) => { e.stopPropagation(); onAdjust(-1); }}
        >
          <ChevronLeft size={14} />
        </Button>

        <div
          className="flex items-center gap-1.5 px-2 cursor-text h-6"
          onDoubleClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
            setTempValue(formatDuration(duration).replace('s', ''));
          }}
        >
          <span className="text-[8px] uppercase font-bold text-muted-foreground/30 tracking-tight leading-none">Dur</span>
          {isEditing ? (
            <input
              autoFocus
              className="w-8 text-center bg-transparent border-none outline-none text-[11px] font-mono font-black text-primary p-0 h-4"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="text-[11px] font-mono font-black text-primary tabular-nums">
              {formatDuration(duration)}
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded-md text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-all"
          onClick={(e) => { e.stopPropagation(); onAdjust(1); }}
        >
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
});
DurationAdjuster.displayName = 'DurationAdjuster';

// --- Segment Card Component ---
const SegmentCard = memo<{
  segment: VisualSegment;
  pages: ImagePage[];
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onPlay: () => void;
  updateSegment: (id: string, updates: Partial<VisualSegment>) => void;
  saveState: () => void;
  duplicateSegment: (id: string) => void;
  deleteSegments: (ids: string[]) => void;
  toggleSegmentVisibility: (id: string) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  pageLabel?: string;
  isOnCurrentPage?: boolean;
  globalNum: number;
  totalSegmentsCount: number;
}>(({
  segment,
  pages,
  isSelected,
  onSelect,
  onPlay,
  updateSegment,
  duplicateSegment,
  deleteSegments,
  toggleSegmentVisibility,
  onDragStart,
  onDragOver,
  onDrop,
  saveState,
  pageLabel,
  isOnCurrentPage = true,
  globalNum,
}) => {
  const duration = segment.endTime - segment.startTime;

  const isPlaying = useVisualEditorState(s =>
    s.isPlaying && s.playbackTime >= segment.startTime && s.playbackTime < segment.endTime
  );

  const cardRef = useRef<HTMLDivElement>(null);

  const handleDurationAdjust = useCallback((delta: number) => {
    saveState();
    const currentDuration = segment.endTime - segment.startTime;
    const newDuration = Math.max(0.1, currentDuration + delta);
    updateSegment(segment.id, { endTime: segment.startTime + newDuration });
  }, [segment.id, segment.startTime, segment.endTime, updateSegment, saveState]);


  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={cardRef}
          draggable
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onClick={onSelect}
          className={cn(
            'group relative flex flex-col gap-1.5 p-1.5 rounded-lg border min-w-[200px] w-[200px] shrink-0 cursor-pointer transition-all duration-300',
            // Default State
            'bg-card hover:bg-muted/30 border-border/40 shadow-sm',
            // Selected State
            isSelected && !isPlaying && 'ring-2 ring-primary/20 border-primary bg-primary/5',
            // Playing State
            isPlaying && 'ring-2 ring-green-500/20 border-green-500/50 bg-green-500/5',
            // Hidden State
            segment.isHidden && !isPlaying && !isSelected && 'opacity-60 grayscale bg-muted/20 border-border/20',
            // Other-page dim
            !isOnCurrentPage && !isSelected && !isPlaying && 'opacity-70',
            // Hover State (when not selected/playing/hidden)
            !isSelected && !isPlaying && !segment.isHidden && 'hover:border-primary/30 hover:shadow-md'
          )}
        >
          {/* Header */}
          <div className="flex flex-col gap-1">
            <div className="w-full flex items-center justify-between py-0 gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className={cn(
                  "flex items-center justify-center w-7 h-7 rounded-full bg-white text-[12px] font-black shrink-0 transition-all duration-300 shadow-sm text-black",
                  isPlaying && "ring-2 ring-destructive/40"
                )}>
                  {globalNum}
                </div>
                {typeof segment.label === 'string' && !segment.label.startsWith('Segment') && segment.label && (
                  <span className={cn(
                    "text-[10px] font-bold truncate transition-colors flex-1",
                    isPlaying ? "text-green-600 dark:text-green-400" : "text-foreground"
                  )}>
                    {segment.label}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {pageLabel && (
                  <span className={cn(
                    'text-[8px] font-bold px-1 py-0.5 rounded leading-none tracking-wide',
                    isOnCurrentPage
                      ? 'bg-primary/15 text-primary'
                      : 'bg-muted-foreground/20 text-muted-foreground'
                  )}>
                    {pageLabel}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "w-6 h-6 rounded-md transition-all",
                    isPlaying ? "text-green-600 bg-green-500/10 hover:bg-green-500/20" : "text-primary/60 hover:text-primary hover:bg-primary/10"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlay();
                  }}
                >
                  {isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" className="ml-0.5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "w-6 h-6 rounded-md transition-all",
                    segment.isHidden ? "text-muted-foreground/40" : "text-primary/60 hover:text-primary hover:bg-primary/10"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    saveState();
                    toggleSegmentVisibility(segment.id);
                  }}
                >
                  {segment.isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between mt-1 px-1 mb-1 gap-1">
              <TimePillAdjuster
                value={segment.startTime}
                label="Start"
                onAdjust={(delta) => {
                  saveState();
                  const newStart = Math.max(0, segment.startTime + delta);
                  if (newStart < segment.endTime) {
                    updateSegment(segment.id, { startTime: newStart });
                  }
                }}
              />
              <span className="opacity-30 text-[9px] font-normal">to</span>
              <TimePillAdjuster
                value={segment.endTime}
                label="End"
                onAdjust={(delta) => {
                  saveState();
                  const newEnd = segment.endTime + delta;
                  if (newEnd > segment.startTime) {
                    updateSegment(segment.id, { endTime: newEnd });
                  }
                }}
              />
            </div>
          </div>

          {/* Smart Timing Controls */}
          <div className="flex flex-col pt-1.5 border-t border-border/20">
            <DurationAdjuster
              duration={duration}
              onAdjust={handleDurationAdjust}
            />
          </div>

          {/* Selection Overlay (Subtle) */}
          {isSelected && (
            <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-primary/10 pointer-events-none" />
          )}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-56">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/30 -mx-1 -mt-1 mb-1 rounded-t-sm">
          {segment.label || 'Segment Options'}
        </div>
        <ContextMenuItem onClick={onPlay}>
          {isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
          {isPlaying ? 'Pause Segment' : 'Play Segment'}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => { saveState(); duplicateSegment(segment.id); }}>
          <Copy className="mr-2 h-4 w-4" />
          Duplicate Segment
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          className="text-destructive focus:text-destructive focus:bg-destructive/10"
          onClick={() => { saveState(); deleteSegments([segment.id]); }}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Segment
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
});
SegmentCard.displayName = 'SegmentCard';


interface TimelineStripProps {
  className?: string;
}

export const TimelineStrip = memo<TimelineStripProps>(({ className }) => {
  const currentPage = useVisualEditorState((s) => s.getCurrentPage());
  const pages = useVisualEditorState((s) => s.pages);
  const currentPageIndex = useVisualEditorState((s) => s.currentPageIndex);
  const setCurrentPage = useVisualEditorState((s) => s.setCurrentPage);
  const selectedSegmentIds = useVisualEditorState((s) => s.selectedSegmentIds);

  const updateSegment = useVisualEditorState((s) => s.updateSegment);
  const selectSegment = useVisualEditorState((s) => s.selectSegment);
  const setPlaybackTime = useVisualEditorState((s) => s.setPlaybackTime);
  const setPlaying = useVisualEditorState((s) => s.setPlaying);
  const duplicateSegment = useVisualEditorState((s) => s.duplicateSegment);
  const deleteSegments = useVisualEditorState((s) => s.deleteSegments);
  const toggleSegmentVisibility = useVisualEditorState((s) => s.toggleSegmentVisibility);
  const reorderSegment = useVisualEditorState((s) => s.reorderSegment);
  const setShowPlayer = useVisualEditorState((s) => s.setShowPlayer);
  const defaultDuration = useVisualEditorState((s) => s.defaultDuration);
  const setDefaultDuration = useVisualEditorState((s) => s.setDefaultDuration);
  const { saveState } = useUndoRedo();

  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Show ALL segments across ALL pages so user sees full project layout.
  // Segments are sorted globally by startTime.
  const segments = React.useMemo(() => {
    return pages
      .flatMap((page, pageIdx) =>
        page.segments.map(s => ({ ...s, _pageIdx: pageIdx }))
      )
      .sort((a, b) => a.startTime - b.startTime);
  }, [pages]);
  const stripRef = useRef<HTMLDivElement>(null);

  // Horizontal scroll on wheel
  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      // If a child (like a selected SegmentCard) already handled this event, ignore it
      if (e.defaultPrevented) return;

      // If there's horizontal overflow, allow wheel to scroll it
      if (el.scrollWidth > el.clientWidth) {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          e.preventDefault();
          el.scrollLeft += e.deltaY;
        }
      }
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  const handlePlaySegment = useCallback((segment: VisualSegment) => {
    // Note: We need to get current play state from the store directly or computed carefully
    const state = useVisualEditorState.getState();
    const isSegmentPlaying = state.isPlaying && state.playbackTime >= segment.startTime && state.playbackTime < segment.endTime;

    if (isSegmentPlaying) {
      setPlaying(false);
    } else {
      setPlaybackTime(segment.startTime);
      setPlaying(true);
    }
  }, [setPlaybackTime, setPlaying]);

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedId(id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) return;

    const sourceIndex = segments.findIndex(s => s.id === sourceId);
    const targetIndex = segments.findIndex(s => s.id === targetId);

    if (sourceIndex !== -1 && targetIndex !== -1) {
      saveState();
      reorderSegment(sourceId, targetIndex);
    }
    setDraggedId(null);
  }, [segments, saveState, reorderSegment]);

  if (segments.length === 0) {
    return (
      <div className={cn('bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border p-8 text-center text-muted-foreground text-sm', className)}>
        {pages.length === 0
          ? "Add an image or PDF from the sidebar to start creating regions."
          : "No segments yet. Create one by dragging on the canvas."
        }
      </div>
    );
  }

  return (
    <div
      className={cn('bg-background border-t border-border w-full min-w-0 relative shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] overflow-hidden shrink-0', className)}
      style={{ maxWidth: '100%' }}
    >
      <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

      {/* Segments strip - Scrollable Container */}
      <div
        ref={stripRef}
        className="w-full h-full overflow-x-auto scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent hover:scrollbar-thumb-primary/50 transition-colors bg-transparent relative"
        style={{ touchAction: 'pan-x' }}
      >
        {/* Flex Content - Forced to width of content to enable scrolling */}
        <div className="flex items-center p-2 gap-2 w-max min-w-full">
          {segments.map((segment, index) => {
            const isSelected = selectedSegmentIds.has(segment.id);
            const isDragged = draggedId === segment.id;
            const segPageIdx = (segment as typeof segment & { _pageIdx: number })._pageIdx;
            const isOnCurrentPage = segPageIdx === currentPageIndex;

            return (
              <SegmentCard
                key={segment.id}
                segment={segment}
                pages={pages}
                isSelected={isSelected}
                globalNum={index + 1}
                totalSegmentsCount={segments.length}
                onSelect={(e) => {
                  // Navigate to the page this segment lives on
                  if (segPageIdx !== currentPageIndex) {
                    setCurrentPage(segPageIdx);
                  }
                  if (e.ctrlKey || e.metaKey) {
                    selectSegment(segment.id, 'toggle');
                  } else if (e.shiftKey) {
                    selectSegment(segment.id, 'range');
                  } else {
                    selectSegment(segment.id, 'single');
                  }
                }}
                onPlay={() => handlePlaySegment(segment)}
                updateSegment={updateSegment}
                saveState={saveState}
                duplicateSegment={duplicateSegment}
                deleteSegments={deleteSegments}
                toggleSegmentVisibility={toggleSegmentVisibility}
                onDragStart={(e) => handleDragStart(e, segment.id)}
                onDragOver={(e) => handleDragOver(e, segment.id)}
                onDrop={(e) => handleDrop(e, segment.id)}
                pageLabel={pages.length > 1 ? `P${segPageIdx + 1}` : undefined}
                isOnCurrentPage={isOnCurrentPage}
              />
            );
          })}
          {/* Spacer for right aesthetics */}
          <div className="w-4 shrink-0" />
        </div>
      </div>
    </div>
  );
});

TimelineStrip.displayName = 'TimelineStrip';
