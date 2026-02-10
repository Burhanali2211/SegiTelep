import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useVisualEditorState, formatTime, parseTime, VisualSegment } from './useVisualEditorState';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineStripProps {
  className?: string;
}

export const TimelineStrip = memo<TimelineStripProps>(({ className }) => {
  const isPlaying = useVisualEditorState((s) => s.isPlaying);
  const currentPage = useVisualEditorState((s) => s.getCurrentPage());
  const selectedSegmentIds = useVisualEditorState((s) => s.selectedSegmentIds);
  const playbackTime = useVisualEditorState((s) => s.playbackTime);
  
  const updateSegment = useVisualEditorState((s) => s.updateSegment);
  const selectSegment = useVisualEditorState((s) => s.selectSegment);
  const setPlaybackTime = useVisualEditorState((s) => s.setPlaybackTime);
  const setPlaying = useVisualEditorState((s) => s.setPlaying);
  const duplicateSegment = useVisualEditorState((s) => s.duplicateSegment);
  const deleteSegments = useVisualEditorState((s) => s.deleteSegments);
  const toggleSegmentVisibility = useVisualEditorState((s) => s.toggleSegmentVisibility);
  const { saveState } = useUndoRedo();
  
  const segments = currentPage?.segments || [];
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  // Time input state
  const safeStr = (v: unknown): string => (typeof v === 'string' ? v : '');
  const [editingField, setEditingField] = useState<{ id: string; field: 'start' | 'end' } | null>(null);
  const [editValue, setEditValue] = useState('');
  
  const handleTimeEdit = useCallback((segment: VisualSegment, field: 'start' | 'end') => {
    setEditingField({ id: segment.id, field });
    setEditValue(formatTime(field === 'start' ? segment.startTime : segment.endTime));
  }, []);
  
  const handleTimeSubmit = useCallback(() => {
    if (!editingField) return;
    
    const time = parseTime(editValue);
    updateSegment(editingField.id, {
      [editingField.field === 'start' ? 'startTime' : 'endTime']: time,
    });
    setEditingField(null);
  }, [editingField, editValue, updateSegment]);
  
  const handleTimeAdjust = useCallback((segment: VisualSegment, field: 'start' | 'end', delta: number) => {
    const current = field === 'start' ? segment.startTime : segment.endTime;
    const newTime = Math.max(0, current + delta);
    updateSegment(segment.id, { [field === 'start' ? 'startTime' : 'endTime']: newTime });
  }, [updateSegment]);
  
  const handleCaptureTime = useCallback((segment: VisualSegment, field: 'start' | 'end') => {
    updateSegment(segment.id, { [field === 'start' ? 'startTime' : 'endTime']: playbackTime });
  }, [playbackTime, updateSegment]);
  
  const handlePlaySegment = useCallback((segment: VisualSegment) => {
    if (isPlaying && playbackTime >= segment.startTime && playbackTime < segment.endTime) {
      // Currently playing this segment - pause
      setPlaying(false);
    } else {
      // Start playing this segment
      setPlaybackTime(segment.startTime);
      setPlaying(true);
    }
  }, [isPlaying, playbackTime, setPlaybackTime, setPlaying]);
  
  if (segments.length === 0) {
    return null;
  }
  
  return (
    <div className={cn('bg-card border-t border-border', className)}>
      {/* Segments strip */}
      <div
        ref={stripRef}
        className="flex items-stretch overflow-x-auto p-2 gap-3"
      >
        {segments.map((segment) => {
          const isSelected = selectedSegmentIds.has(segment.id);
          const isPlaying = playbackTime >= segment.startTime && playbackTime < segment.endTime;
          
          return (
            <ContextMenu key={segment.id}>
              <ContextMenuTrigger asChild>
                <div
                  className={cn(
                    'flex flex-col gap-2 p-3 rounded-lg border min-w-[200px] cursor-pointer transition-colors',
                    isPlaying && 'border-red-500 bg-red-500/10',
                    isSelected && !isPlaying && 'border-primary bg-primary/10',
                    !isSelected && !isPlaying && 'border-border bg-muted/30 hover:bg-muted/50'
                  )}
                  onClick={(e) => {
                    if (e.ctrlKey || e.metaKey) {
                      selectSegment(segment.id, 'toggle');
                    } else if (e.shiftKey) {
                      selectSegment(segment.id, 'range');
                    } else {
                      selectSegment(segment.id, 'single');
                    }
                  }}
                >
              {/* Header row: label + play */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'w-2.5 h-2.5 rounded-full shrink-0',
                    isPlaying && 'bg-red-500',
                    isSelected && !isPlaying && 'bg-primary',
                    !isSelected && !isPlaying && 'bg-green-500'
                  )} />
                  <span className="text-sm font-medium truncate max-w-[120px]">{typeof segment.label === 'string' ? segment.label : ''}</span>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlaySegment(segment);
                      }}
                    >
                      {isPlaying && playbackTime >= segment.startTime && playbackTime < segment.endTime ? (
                        <Pause size={14} />
                      ) : (
                        <Play size={14} />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isPlaying && playbackTime >= segment.startTime && playbackTime < segment.endTime ? 'Pause segment' : 'Play segment'}
                  </TooltipContent>
                </Tooltip>
              </div>
              
              {/* Time controls - stacked vertically */}
              <div className="flex flex-col gap-1.5">
                {/* Start time row */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground w-8">Start</span>
                  <div className="flex items-center gap-0.5 flex-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => { e.stopPropagation(); handleTimeAdjust(segment, 'start', -0.1); }}
                        >
                          <ChevronLeft size={12} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>-0.1s</TooltipContent>
                    </Tooltip>
                    
                    {editingField?.id === segment.id && editingField.field === 'start' ? (
                      <Input
                        value={safeStr(editValue)}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleTimeSubmit}
                        onKeyDown={(e) => e.key === 'Enter' && handleTimeSubmit()}
                        className="h-6 w-20 text-xs text-center px-1"
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                    ) : (
                      <button
                        className="h-6 px-2 text-xs hover:bg-muted rounded font-mono border border-border bg-background"
                        onClick={(e) => { e.stopPropagation(); handleTimeEdit(segment, 'start'); }}
                      >
                        {formatTime(segment.startTime)}
                      </button>
                    )}
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => { e.stopPropagation(); handleTimeAdjust(segment, 'start', 0.1); }}
                        >
                          <ChevronRight size={12} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>+0.1s</TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-6 w-6 ml-1"
                          onClick={(e) => { e.stopPropagation(); handleCaptureTime(segment, 'start'); }}
                        >
                          <Target size={12} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Capture current time (S)</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                
                {/* End time row */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground w-8">End</span>
                  <div className="flex items-center gap-0.5 flex-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => { e.stopPropagation(); handleTimeAdjust(segment, 'end', -0.1); }}
                        >
                          <ChevronLeft size={12} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>-0.1s</TooltipContent>
                    </Tooltip>
                    
                    {editingField?.id === segment.id && editingField.field === 'end' ? (
                      <Input
                        value={safeStr(editValue)}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleTimeSubmit}
                        onKeyDown={(e) => e.key === 'Enter' && handleTimeSubmit()}
                        className="h-6 w-20 text-xs text-center px-1"
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                    ) : (
                      <button
                        className="h-6 px-2 text-xs hover:bg-muted rounded font-mono border border-border bg-background"
                        onClick={(e) => { e.stopPropagation(); handleTimeEdit(segment, 'end'); }}
                      >
                        {formatTime(segment.endTime)}
                      </button>
                    )}
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => { e.stopPropagation(); handleTimeAdjust(segment, 'end', 0.1); }}
                        >
                          <ChevronRight size={12} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>+0.1s</TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-6 w-6 ml-1"
                          onClick={(e) => { e.stopPropagation(); handleCaptureTime(segment, 'end'); }}
                        >
                          <Target size={12} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Capture current time (E)</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-48">
                <ContextMenuItem onClick={() => handlePlaySegment(segment)}>
                  {isPlaying && playbackTime >= segment.startTime && playbackTime < segment.endTime ? (
                    <Pause className="mr-2 h-4 w-4" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  {isPlaying && playbackTime >= segment.startTime && playbackTime < segment.endTime ? 'Pause' : 'Play'}
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => { saveState(); duplicateSegment(segment.id); }}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </ContextMenuItem>
                <ContextMenuItem onClick={() => toggleSegmentVisibility(segment.id)}>
                  <EyeOff className="mr-2 h-4 w-4" />
                  Hide
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleCaptureTime(segment, 'start')}>
                  Set start to current time
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleCaptureTime(segment, 'end')}>
                  Set end to current time
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => { saveState(); deleteSegments([segment.id]); }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
      </div>
    </div>
  );
});

TimelineStrip.displayName = 'TimelineStrip';
