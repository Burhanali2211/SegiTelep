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
      <div className="flex items-stretch overflow-x-auto p-2 gap-3">
        {segments.map((segment) => {
          const isSelected = selectedSegmentIds.has(segment.id);
          const isPlaying = playbackTime >= segment.startTime && playbackTime < segment.endTime;
          
          return (
            <div
              key={segment.id}
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
                  <span className="text-sm font-medium truncate max-w-[120px]">{segment.label}</span>
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
                      <Play size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Play segment</TooltipContent>
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
                        value={editValue}
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
                        value={editValue}
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
          );
        })}
      </div>
    </div>
  );
});

TimelineStrip.displayName = 'TimelineStrip';
