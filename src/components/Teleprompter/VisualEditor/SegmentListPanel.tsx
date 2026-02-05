import React, { memo, useCallback, useEffect, useRef } from 'react';
import { useVisualEditorState, VisualSegment, formatTime } from './useVisualEditorState';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, 
  Eye, 
  EyeOff,
  GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SegmentListPanelProps {
  className?: string;
}

export const SegmentListPanel = memo<SegmentListPanelProps>(({ className }) => {
  const pages = useVisualEditorState((s) => s.pages);
  const currentPageIndex = useVisualEditorState((s) => s.currentPageIndex);
  const selectedSegmentIds = useVisualEditorState((s) => s.selectedSegmentIds);
  const playbackTime = useVisualEditorState((s) => s.playbackTime);
  
  const selectSegment = useVisualEditorState((s) => s.selectSegment);
  const toggleSegmentVisibility = useVisualEditorState((s) => s.toggleSegmentVisibility);
  const setPlaybackTime = useVisualEditorState((s) => s.setPlaybackTime);
  const setPlaying = useVisualEditorState((s) => s.setPlaying);
  const setCurrentPage = useVisualEditorState((s) => s.setCurrentPage);
  
  const activeRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to playing segment
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [playbackTime]);
  
  const handlePlaySegment = useCallback((segment: VisualSegment) => {
    setPlaybackTime(segment.startTime);
    setPlaying(true);
  }, [setPlaybackTime, setPlaying]);
  
  const handleSegmentClick = useCallback((e: React.MouseEvent, segment: VisualSegment, pageIndex: number) => {
    if (pageIndex !== currentPageIndex) {
      setCurrentPage(pageIndex);
    }
    
    if (e.ctrlKey || e.metaKey) {
      selectSegment(segment.id, 'toggle');
    } else if (e.shiftKey) {
      selectSegment(segment.id, 'range');
    } else {
      selectSegment(segment.id, 'single');
    }
  }, [currentPageIndex, setCurrentPage, selectSegment]);
  
  const handleDoubleClick = useCallback((segment: VisualSegment) => {
    handlePlaySegment(segment);
  }, [handlePlaySegment]);
  
  // Group segments by page
  const hasMultiplePages = pages.length > 1;
  
  return (
    <div className={cn('flex flex-col h-full bg-card', className)}>
      <div className="px-3 py-2 border-b border-border">
        <h3 className="text-sm font-medium">Segments</h3>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {pages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Add images to create segments
            </p>
          ) : (
            pages.map((page, pageIndex) => (
              <div key={page.id}>
                {hasMultiplePages && (
                  <div
                    className={cn(
                      'text-xs font-medium text-muted-foreground px-2 py-1 sticky top-0 bg-card',
                      pageIndex === currentPageIndex && 'text-foreground'
                    )}
                  >
                    Page {pageIndex + 1}
                    <span className="ml-1 text-muted-foreground">
                      ({page.segments.length})
                    </span>
                  </div>
                )}
                
                {page.segments.map((segment) => {
                  const isSelected = selectedSegmentIds.has(segment.id);
                  const isPlaying = playbackTime >= segment.startTime && playbackTime < segment.endTime;
                  const isCurrentPage = pageIndex === currentPageIndex;
                  
                  return (
                    <div
                      key={segment.id}
                      ref={isPlaying ? activeRef : undefined}
                      className={cn(
                        'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors group',
                        isPlaying && 'bg-red-500/20 border border-red-500',
                        isSelected && !isPlaying && 'bg-yellow-400/20 border border-yellow-400',
                        !isSelected && !isPlaying && 'hover:bg-muted/50',
                        !isCurrentPage && 'opacity-60'
                      )}
                      onClick={(e) => handleSegmentClick(e, segment, pageIndex)}
                      onDoubleClick={() => handleDoubleClick(segment)}
                    >
                      <GripVertical size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100" />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className={cn(
                            'w-1.5 h-1.5 rounded-full shrink-0',
                            isPlaying && 'bg-red-500',
                            isSelected && !isPlaying && 'bg-yellow-400',
                            !isSelected && !isPlaying && 'bg-green-500'
                          )} />
                          <span className="text-sm truncate">{segment.label}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlaySegment(segment);
                          }}
                        >
                          <Play size={12} />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSegmentVisibility(segment.id);
                          }}
                        >
                          {segment.isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
});

SegmentListPanel.displayName = 'SegmentListPanel';
