import React, { memo, useCallback, useState } from 'react';
import { useVisualEditorState, formatTime, parseTime, VisualSegment } from './useVisualEditorState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Plus, 
  Link, 
  Unlink, 
  ChevronLeft, 
  ChevronRight,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineStripProps {
  className?: string;
}

export const TimelineStrip = memo<TimelineStripProps>(({ className }) => {
  const currentPage = useVisualEditorState((s) => s.getCurrentPage());
  const selectedSegmentIds = useVisualEditorState((s) => s.selectedSegmentIds);
  const playbackTime = useVisualEditorState((s) => s.playbackTime);
  const chainTimesMode = useVisualEditorState((s) => s.chainTimesMode);
  
  const updateSegment = useVisualEditorState((s) => s.updateSegment);
  const selectSegment = useVisualEditorState((s) => s.selectSegment);
  const toggleChainMode = useVisualEditorState((s) => s.toggleChainMode);
  const setDrawing = useVisualEditorState((s) => s.setDrawing);
  const isDrawing = useVisualEditorState((s) => s.isDrawing);
  
  const segments = currentPage?.segments || [];
  const selectedSegment = segments.find((s) => selectedSegmentIds.has(s.id));
  
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
  
  return (
    <div className={cn('bg-card border-t border-border', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/50">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isDrawing ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDrawing(!isDrawing)}
            >
              <Plus size={14} className="mr-1" />
              Draw
            </Button>
          </TooltipTrigger>
          <TooltipContent>Toggle segment drawing mode</TooltipContent>
        </Tooltip>
        
        <div className="h-4 w-px bg-border" />
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={chainTimesMode ? 'default' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={toggleChainMode}
            >
              {chainTimesMode ? <Link size={14} /> : <Unlink size={14} />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {chainTimesMode ? 'Chain mode ON - changes shift later segments' : 'Chain mode OFF'}
          </TooltipContent>
        </Tooltip>
        
        <div className="flex-1" />
        
        <span className="text-xs text-muted-foreground">
          {segments.length} segment{segments.length !== 1 ? 's' : ''}
        </span>
      </div>
      
      {/* Segments strip */}
      <div className="flex items-stretch overflow-x-auto p-2 gap-1 min-h-[60px]">
        {segments.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Draw segments on the image above
          </div>
        ) : (
          segments.map((segment) => {
            const isSelected = selectedSegmentIds.has(segment.id);
            const isPlaying = playbackTime >= segment.startTime && playbackTime < segment.endTime;
            
            return (
              <div
                key={segment.id}
                className={cn(
                  'flex flex-col gap-1 p-1.5 rounded border min-w-[140px] cursor-pointer transition-colors',
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
                <div className="flex items-center gap-1 text-xs font-medium truncate">
                  <span className={cn(
                    'w-2 h-2 rounded-full',
                    isPlaying && 'bg-red-500',
                    isSelected && !isPlaying && 'bg-yellow-400',
                    !isSelected && !isPlaying && 'bg-green-500'
                  )} />
                  {segment.label}
                </div>
                
                {/* Time controls - only show for selected */}
                {isSelected && (
                  <div className="flex items-center gap-1 mt-1">
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
                          className="text-[10px] px-1 hover:bg-muted rounded"
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
                        <TooltipContent>Capture current time</TooltipContent>
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
                          className="text-[10px] px-1 hover:bg-muted rounded"
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
                        <TooltipContent>Capture current time</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                )}
                
                {!isSelected && (
                  <div className="text-[10px] text-muted-foreground">
                    {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});

TimelineStrip.displayName = 'TimelineStrip';
