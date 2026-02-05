import React, { memo, useCallback } from 'react';
import { useTeleprompterStore } from '@/store/teleprompterStore';
import { Segment } from '@/types/teleprompter.types';
import { 
  GripVertical, 
  Copy, 
  Trash2, 
  MoreVertical,
  FileText,
  Play
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SegmentItemProps {
  segment: Segment;
  isSelected: boolean;
  isPlaying: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const SegmentItem = memo<SegmentItemProps>(({
  segment,
  isSelected,
  isPlaying,
  onSelect,
  onDuplicate,
  onDelete,
}) => {
  const preview = segment.content.slice(0, 80) || 'Empty segment';
  
  return (
    <div
      className={cn(
        'segment-item group',
        isSelected && 'active',
        isPlaying && 'playing'
      )}
      onClick={onSelect}
    >
      <div className="drag-handle">
        <GripVertical size={16} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <FileText size={14} className="text-muted-foreground shrink-0" />
          <span className="font-medium text-sm truncate">{segment.name}</span>
          {isPlaying && (
            <div className="status-dot active ml-auto" />
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {preview}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="speed-badge">{segment.scrollSpeed}px/s</span>
          <span className="text-xs text-muted-foreground">
            {segment.fontSize}px
          </span>
        </div>
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
            <Copy size={14} className="mr-2" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 size={14} className="mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});

SegmentItem.displayName = 'SegmentItem';

interface SegmentListProps {
  onPlaySegment?: (index: number) => void;
}

export const SegmentList = memo<SegmentListProps>(({ onPlaySegment }) => {
  const project = useTeleprompterStore((s) => s.project);
  const selectedSegmentId = useTeleprompterStore((s) => s.editor.selectedSegmentId);
  const currentSegmentId = useTeleprompterStore((s) => s.playback.currentSegmentId);
  const isPlaying = useTeleprompterStore((s) => s.playback.isPlaying);
  
  const selectSegment = useTeleprompterStore((s) => s.selectSegment);
  const addSegment = useTeleprompterStore((s) => s.addSegment);
  const duplicateSegment = useTeleprompterStore((s) => s.duplicateSegment);
  const deleteSegment = useTeleprompterStore((s) => s.deleteSegment);
  const setCurrentSegment = useTeleprompterStore((s) => s.setCurrentSegment);
  
  const handleSelect = useCallback((segmentId: string, index: number) => {
    selectSegment(segmentId);
    setCurrentSegment(index);
  }, [selectSegment, setCurrentSegment]);
  
  const handleAdd = useCallback(() => {
    addSegment({
      content: 'Enter your teleprompter text here...',
    });
  }, [addSegment]);
  
  if (!project) return null;
  
  return (
    <div className="flex flex-col h-full">
      <div className="panel-header">
        <h2 className="text-sm font-semibold">Segments</h2>
        <span className="text-xs text-muted-foreground">
          {project.segments.length} item{project.segments.length !== 1 ? 's' : ''}
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {project.segments.map((segment, index) => (
          <SegmentItem
            key={segment.id}
            segment={segment}
            isSelected={selectedSegmentId === segment.id}
            isPlaying={isPlaying && currentSegmentId === segment.id}
            onSelect={() => handleSelect(segment.id, index)}
            onDuplicate={() => duplicateSegment(segment.id)}
            onDelete={() => deleteSegment(segment.id)}
          />
        ))}
        
        {project.segments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText size={32} className="text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-4">
              No segments yet
            </p>
          </div>
        )}
      </div>
      
      <div className="p-3 border-t border-border">
        <Button
          onClick={handleAdd}
          className="w-full"
          variant="secondary"
        >
          + Add Segment
        </Button>
      </div>
    </div>
  );
});

SegmentList.displayName = 'SegmentList';

export default SegmentList;
