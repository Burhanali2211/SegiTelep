import React, { memo, useCallback, useState } from 'react';
import { useVisualEditorState, formatTime, parseTime, VisualSegment } from './useVisualEditorState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  ChevronLeft, 
  ChevronRight,
  Target,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineStripProps {
  className?: string;
}

export const TimelineStrip = memo<TimelineStripProps>(({ className }) => {
  const currentPage = useVisualEditorState((s) => s.getCurrentPage());
  const selectedSegmentIds = useVisualEditorState((s) => s.selectedSegmentIds);
  const playbackTime = useVisualEditorState((s) => s.playbackTime);
  
  const updateSegment = useVisualEditorState((s) => s.updateSegment);
  const selectSegment = useVisualEditorState((s) => s.selectSegment);
  const setPlaybackTime = useVisualEditorState((s) => s.setPlaybackTime);
  const setPlaying = useVisualEditorState((s) => s.setPlaying);
  
  const segments = currentPage?.segments || [];
  
  // Time input state
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
    setPlaybackTime(segment.startTime);
    setPlaying(true);
  }, [setPlaybackTime, setPlaying]);
  
  if (segments.length === 0) {
    return null;
  }
  
  return (
    <div className={cn('bg-card border-t border-border', className)}>
      {/* Segments strip */}
      <div className="flex items-stretch overflow-x-auto p-2 gap-1.5">
        {segments.map((segment) => {
          const isSelected = selectedSegmentIds.has(segment.id);
          const isPlaying = playbackTime >= segment.startTime && playbackTime < segment.endTime;
          
          return (
            <div
              key={segment.id}
              className={cn(
                'flex flex-col gap-1 p-2 rounded border min-w-[160px] cursor-pointer transition-colors',
                isPlaying && 'border-red-500 bg-red-500/10',
                isSelected && !isPlaying && 'border-yellow-400 bg-yellow-400/10',
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
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <span className={cn(
                  'w-2 h-2 rounded-full shrink-0',
                  isPlaying && 'bg-red-500',
                  isSelected && !isPlaying && 'bg-yellow-400',
                  !isSelected && !isPlaying && 'bg-green-500'
                )} />
                <span className="truncate flex-1">{segment.label}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlaySegment(segment);
                  }}
                >
                  <Play size={10} />
                </Button>
              </div>
              
              {/* Time controls */}
              <div className="flex items-center gap-1">
                {/* Start time */}
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={(e) => { e.stopPropagation(); handleTimeAdjust(segment, 'start', -0.1); }}
                  >
                    <ChevronLeft size={10} />
                  </Button>
                  
                  {editingField?.id === segment.id && editingField.field === 'start' ? (
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={handleTimeSubmit}
                      onKeyDown={(e) => e.key === 'Enter' && handleTimeSubmit()}
                      className="h-5 w-16 text-[10px] text-center p-0"
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  ) : (
                    <button
                      className="text-[10px] px-1 hover:bg-muted rounded font-mono"
                      onClick={(e) => { e.stopPropagation(); handleTimeEdit(segment, 'start'); }}
                    >
                      {formatTime(segment.startTime)}
                    </button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={(e) => { e.stopPropagation(); handleTimeAdjust(segment, 'start', 0.1); }}
                  >
                    <ChevronRight size={10} />
                  </Button>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={(e) => { e.stopPropagation(); handleCaptureTime(segment, 'start'); }}
                      >
                        <Target size={10} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Set to current time (S)</TooltipContent>
                  </Tooltip>
                </div>
                
                <span className="text-[10px] text-muted-foreground">-</span>
                
                {/* End time */}
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={(e) => { e.stopPropagation(); handleTimeAdjust(segment, 'end', -0.1); }}
                  >
                    <ChevronLeft size={10} />
                  </Button>
                  
                  {editingField?.id === segment.id && editingField.field === 'end' ? (
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={handleTimeSubmit}
                      onKeyDown={(e) => e.key === 'Enter' && handleTimeSubmit()}
                      className="h-5 w-16 text-[10px] text-center p-0"
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  ) : (
                    <button
                      className="text-[10px] px-1 hover:bg-muted rounded font-mono"
                      onClick={(e) => { e.stopPropagation(); handleTimeEdit(segment, 'end'); }}
                    >
                      {formatTime(segment.endTime)}
                    </button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={(e) => { e.stopPropagation(); handleTimeAdjust(segment, 'end', 0.1); }}
                  >
                    <ChevronRight size={10} />
                  </Button>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={(e) => { e.stopPropagation(); handleCaptureTime(segment, 'end'); }}
                      >
                        <Target size={10} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Set to current time (E)</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

TimelineStrip.displayName = 'TimelineStrip';
