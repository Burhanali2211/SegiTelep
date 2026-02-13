import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useVisualEditorState, formatTime, parseTime, VisualSegment, ImagePage } from './useVisualEditorState';
import { AssetThumbnail } from './components/AssetThumbnail';
import { useUndoRedo } from './useUndoRedo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  ChevronLeft,
  ChevronRight,
  Target,
  Play,
  Pause,
  Copy,
  EyeOff,
  Trash2,
  Clock,
  MoreVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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

// --- Time Control Component ---
const TimeControl = memo<{
  label: string;
  time: number;
  isActive: boolean;
  onEdit: () => void;
  onAdjust: (delta: number) => void;
  onCapture: () => void;
  isEditing: boolean;
  editValue: string;
  onEditChange: (val: string) => void;
  onEditSubmit: () => void;
}>(({
  label,
  time,
  isActive, // actively playing/current
  onEdit,
  onAdjust,
  onCapture,
  isEditing,
  editValue,
  onEditChange,
  onEditSubmit
}) => {
  return (
    <div className="flex items-center justify-between gap-1 group/time py-0.5">
      <span className="text-[9px] text-muted-foreground/60 w-8 font-bold uppercase tracking-tighter">{label}</span>

      <div className="flex-1 flex items-center justify-between bg-muted/20 rounded-lg border border-border/10 px-1 py-0.5 group-hover/time:border-primary/20 group-hover/time:bg-muted/40 transition-all">
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-4 text-muted-foreground/40 hover:text-primary hover:bg-transparent transition-colors p-0"
          onClick={(e) => { e.stopPropagation(); onAdjust(-1); }}
        >
          <ChevronLeft size={12} />
        </Button>

        {isEditing ? (
          <Input
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            onBlur={onEditSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onEditSubmit();
              if (e.key === 'Escape') onEditSubmit(); // or just blur
            }}
            className="h-4 w-16 text-[10px] text-center p-0 bg-transparent border-none focus-visible:ring-0 font-mono font-bold text-primary"
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        ) : (
          <div
            className={cn(
              "h-4 flex items-center justify-center min-w-[54px] px-1 font-mono text-[11px] cursor-pointer hover:text-primary transition-all tabular-nums",
              isActive ? "text-primary font-bold" : "text-foreground/80"
            )}
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
          >
            {formatTime(time)}
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-4 text-muted-foreground/40 hover:text-primary hover:bg-transparent transition-colors p-0"
          onClick={(e) => { e.stopPropagation(); onAdjust(1); }}
        >
          <ChevronRight size={12} />
        </Button>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground/40 hover:text-primary hover:bg-primary/10 rounded-full transition-all"
            onClick={(e) => { e.stopPropagation(); onCapture(); }}
          >
            <Target size={12} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-[10px] py-1 px-2">Set to playhead</TooltipContent>
      </Tooltip>
    </div>
  );
});
TimeControl.displayName = 'TimeControl';


// --- Segment Card Component ---
const SegmentCard = memo<{
  segment: VisualSegment;
  pages: ImagePage[];
  isSelected: boolean;
  isPlaying: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onPlay: () => void;
  playbackTime: number;
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
  isPlaying,
  onSelect,
  onPlay,
  playbackTime,
  updateSegment,
  duplicateSegment,
  deleteSegments,
  toggleSegmentVisibility,
  onDragStart,
  onDragOver,
  onDrop,
  saveState
}) => {
  const [editingField, setEditingField] = useState<'start' | 'end' | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleTimeEdit = (field: 'start' | 'end') => {
    setEditingField(field);
    setEditValue(formatTime(field === 'start' ? segment.startTime : segment.endTime));
  };

  const handleTimeSubmit = () => {
    if (!editingField) return;
    const time = parseTime(editValue);
    updateSegment(segment.id, {
      [editingField === 'start' ? 'startTime' : 'endTime']: time,
    });
    setEditingField(null);
  };

  const handleTimeAdjust = (field: 'start' | 'end', delta: number) => {
    const current = field === 'start' ? segment.startTime : segment.endTime;
    const newTime = Math.max(0, current + delta);
    updateSegment(segment.id, { [field === 'start' ? 'startTime' : 'endTime']: newTime });
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
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
            // Hover State (when not selected)
            !isSelected && !isPlaying && 'hover:border-primary/30 hover:shadow-md'
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

                {/* Status Indicator */}
                <div className={cn(
                  "w-1 h-1 rounded-full shrink-0 transition-all duration-500",
                  isPlaying ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" :
                    isSelected ? "bg-primary" : "bg-muted-foreground/30"
                )} />
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

          {/* Time Controls */}
          <div className="flex flex-col gap-1 pt-2 border-t border-border/30">
            <TimeControl
              label="Start"
              time={segment.startTime}
              isActive={isPlaying}
              onEdit={() => handleTimeEdit('start')}
              onAdjust={(d) => handleTimeAdjust('start', d)}
              onCapture={() => updateSegment(segment.id, { startTime: playbackTime })}
              isEditing={editingField === 'start'}
              editValue={editValue}
              onEditChange={setEditValue}
              onEditSubmit={handleTimeSubmit}
            />
            <TimeControl
              label="End"
              time={segment.endTime}
              isActive={isPlaying}
              onEdit={() => handleTimeEdit('end')}
              onAdjust={(d) => handleTimeAdjust('end', d)}
              onCapture={() => updateSegment(segment.id, { endTime: playbackTime })}
              isEditing={editingField === 'end'}
              editValue={editValue}
              onEditChange={setEditValue}
              onEditSubmit={handleTimeSubmit}
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
        <ContextMenuItem onClick={() => toggleSegmentVisibility(segment.id)}>
          <EyeOff className="mr-2 h-4 w-4" />
          Hide Segment
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => updateSegment(segment.id, { startTime: playbackTime })}>
          <Target className="mr-2 h-4 w-4" /> Set Start to Current
        </ContextMenuItem>
        <ContextMenuItem onClick={() => updateSegment(segment.id, { endTime: playbackTime })}>
          <Target className="mr-2 h-4 w-4" /> Set End to Current
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
  const isPlayingGlobal = useVisualEditorState((s) => s.isPlaying);
  const currentPage = useVisualEditorState((s) => s.getCurrentPage());
  const pages = useVisualEditorState((s) => s.pages);
  const selectedSegmentIds = useVisualEditorState((s) => s.selectedSegmentIds);
  const playbackTime = useVisualEditorState((s) => s.playbackTime);

  const updateSegment = useVisualEditorState((s) => s.updateSegment);
  const selectSegment = useVisualEditorState((s) => s.selectSegment);
  const setPlaybackTime = useVisualEditorState((s) => s.setPlaybackTime);
  const setPlaying = useVisualEditorState((s) => s.setPlaying);
  const duplicateSegment = useVisualEditorState((s) => s.duplicateSegment);
  const deleteSegments = useVisualEditorState((s) => s.deleteSegments);
  const toggleSegmentVisibility = useVisualEditorState((s) => s.toggleSegmentVisibility);
  const reorderSegment = useVisualEditorState((s) => s.reorderSegment);
  const { saveState } = useUndoRedo();

  const [draggedId, setDraggedId] = useState<string | null>(null);

  const segments = React.useMemo(() => currentPage?.segments || [], [currentPage?.segments]);
  const stripRef = useRef<HTMLDivElement>(null);

  // Horizontal scroll on wheel
  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
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
    const isSegmentPlaying = isPlayingGlobal && playbackTime >= segment.startTime && playbackTime < segment.endTime;
    if (isSegmentPlaying) {
      setPlaying(false);
    } else {
      setPlaybackTime(segment.startTime);
      setPlaying(true);
    }
  }, [isPlayingGlobal, playbackTime, setPlaybackTime, setPlaying]);

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
        No segments yet. Create one by dragging on the canvas.
      </div>
    );
  }

  return (
    <div
      className={cn('bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border w-full min-w-0 relative shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] overflow-hidden shrink-0', className)}
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
            const isPlaying = isPlayingGlobal && playbackTime >= segment.startTime && playbackTime < segment.endTime;
            const isDragged = draggedId === segment.id;

            return (
              <SegmentCard
                key={segment.id}
                segment={segment}
                pages={pages}
                isSelected={isSelected}
                isPlaying={isPlaying}
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
                playbackTime={playbackTime}
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


