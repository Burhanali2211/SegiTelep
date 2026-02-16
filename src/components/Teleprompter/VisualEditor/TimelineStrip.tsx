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

// --- Region Thumbnail Component ---
const RegionThumbnail = memo<{ pages: ImagePage[]; segment: VisualSegment }>(({ pages, segment }) => {
  const page = pages[segment.pageIndex];
  if (!page) return <div className="w-12 h-12 rounded-lg bg-muted/50 shrink-0 animate-pulse" />;

  return (
    <div className="w-10 h-10 rounded-lg bg-muted/30 overflow-hidden shrink-0 border border-border/40 relative shadow-sm group-hover:border-primary/20 transition-colors">
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          transform: `scale(${100 / segment.region.width}, ${100 / segment.region.height})`,
          transformOrigin: `${segment.region.x}% ${segment.region.y}%`,
        }}
      >
        <AssetThumbnail
          assetId={page.assetId}
          className="w-full h-full opacity-90 group-hover:opacity-100 transition-opacity"
        />
      </div>
    </div>
  );
});
RegionThumbnail.displayName = 'RegionThumbnail';

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
    <div className={cn("flex flex-col gap-1", className)}>
      <div
        className="flex items-center justify-between bg-muted/20 rounded-xl border border-border/10 p-1 group/dur hover:border-primary/20 transition-all select-none"
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-all"
          onClick={(e) => { e.stopPropagation(); onAdjust(-1); }}
        >
          <ChevronLeft size={16} />
        </Button>

        <div
          className="flex flex-col items-center px-2 min-w-[70px] cursor-text"
          onDoubleClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
            setTempValue(formatDuration(duration).replace('s', ''));
          }}
        >
          <span className="text-[9px] uppercase font-bold text-muted-foreground/40 tracking-widest leading-none mb-1">Duration</span>
          {isEditing ? (
            <input
              autoFocus
              className="w-12 text-center bg-background/50 border-none outline-none text-sm font-mono font-black text-primary p-0 h-4"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="text-sm font-mono font-black text-primary tabular-nums">
              {formatDuration(duration)}
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-all"
          onClick={(e) => { e.stopPropagation(); onAdjust(1); }}
        >
          <ChevronRight size={16} />
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
  saveState
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

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      // Only capture wheel if this specific segment is selected
      if (isSelected) {
        // Vertical wheel (deltaY) changes duration
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          e.preventDefault();
          e.stopPropagation();
          const delta = e.deltaY < 0 ? 1 : -1;
          handleDurationAdjust(delta);
        }
      }
      // Otherwise, event bubbles up to TimelineStrip for horizontal scrolling
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [isSelected, handleDurationAdjust]);

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
            'group relative flex flex-col gap-1 p-2 rounded-xl border min-w-[210px] w-[210px] shrink-0 cursor-pointer transition-all duration-300',
            // Default State
            'bg-card hover:bg-muted/30 border-border/40 shadow-sm',
            // Selected State
            isSelected && !isPlaying && 'ring-2 ring-primary/20 border-primary bg-primary/5',
            // Playing State
            isPlaying && 'ring-2 ring-green-500/20 border-green-500/50 bg-green-500/5',
            // Hidden State
            segment.isHidden && !isPlaying && !isSelected && 'opacity-60 grayscale bg-muted/20 border-border/20',
            // Hover State (when not selected/playing/hidden)
            !isSelected && !isPlaying && !segment.isHidden && 'hover:border-primary/30 hover:shadow-md'
          )}
        >
          {/* Header */}
          <div className="flex items-start gap-2">
            <RegionThumbnail pages={pages} segment={segment} />

            <div className="flex-1 min-w-0 flex flex-col justify-between h-10 py-0">
              <div className="flex items-center justify-between gap-1">
                <span className={cn(
                  "text-[10px] font-bold truncate transition-colors",
                  isPlaying ? "text-green-600 dark:text-green-400" : "text-foreground"
                )}>
                  {segment.label || 'Untitled'}
                </span>

                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "w-6 h-6 rounded-md transition-all",
                    segment.isHidden ? "text-muted-foreground/40" : "text-primary/60 hover:text-primary hover:bg-primary/10"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSegmentVisibility(segment.id);
                  }}
                >
                  {segment.isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                </Button>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant={isPlaying ? "default" : "secondary"}
                  size="sm"
                  className={cn(
                    "h-4.5 px-1.5 py-0 text-[8px] font-bold rounded-md transition-all",
                    isPlaying ? "bg-green-500 hover:bg-green-600 text-white" : "text-muted-foreground bg-muted hover:text-foreground"
                  )}
                  onClick={(e) => { e.stopPropagation(); onPlay(); }}
                >
                  {isPlaying ? (
                    <>
                      <Pause size={8} className="mr-1 fill-current" /> Pause
                    </>
                  ) : (
                    <>
                      <Play size={8} className="mr-1 fill-current" /> Play
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Smart Timing Controls */}
          <div className="flex flex-col gap-2 pt-2 border-t border-border/30">
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

  const segments = React.useMemo(() => currentPage?.segments || [], [currentPage?.segments]);
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
        {!currentPage
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
          {segments.map((segment) => {
            const isSelected = selectedSegmentIds.has(segment.id);
            const isDragged = draggedId === segment.id;

            return (
              <SegmentCard
                key={segment.id}
                segment={segment}
                pages={pages}
                isSelected={isSelected}
                onSelect={(e) => {
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


