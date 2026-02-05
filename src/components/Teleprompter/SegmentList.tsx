import React, { memo, useCallback, useState } from 'react';
import { useTeleprompterStore } from '@/store/teleprompterStore';
import { Segment, isVisualSegment } from '@/types/teleprompter.types';
import { 
  GripVertical, 
  Copy, 
  Trash2, 
  MoreVertical,
  FileText,
  Image,
  FileImage,
  Music,
  Plus,
  Crop,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ImageSegmentEditor } from './ImageSegmentEditor';
import { PdfSegmentEditor } from './PdfSegmentEditor';
import { AudioManager } from './AudioManager';

interface SegmentItemProps {
  segment: Segment;
  index: number;
  isSelected: boolean;
  isPlaying: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  dragOverIndex: number | null;
}

const SegmentItem = memo<SegmentItemProps>(({
  segment,
  index,
  isSelected,
  isPlaying,
  onSelect,
  onDuplicate,
  onDelete,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
  dragOverIndex,
}) => {
  const isVisualType = isVisualSegment(segment);
  const preview = isVisualType
    ? `${segment.type === 'image' ? 'Image' : segment.type === 'image-region' ? 'Region' : 'PDF'} - ${segment.duration}s`
    : (segment.content?.slice(0, 80) || 'Empty segment');
  
  const SegmentIcon = segment.type === 'image' ? Image : 
    segment.type === 'image-region' ? Crop : 
    segment.type === 'pdf-page' ? FileImage : FileText;
  
  return (
    <div
      className={cn(
        'segment-item group',
        isSelected && 'active',
        isPlaying && 'playing',
        isDragging && 'opacity-50',
        dragOverIndex === index && 'border-t-2 border-primary'
      )}
      onClick={onSelect}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(index);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        onDragOver(index);
      }}
      onDragEnd={onDragEnd}
    >
      <div className="drag-handle cursor-grab active:cursor-grabbing">
        <GripVertical size={16} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <SegmentIcon size={14} className="text-muted-foreground shrink-0" />
          <span className="font-medium text-sm truncate">{segment.name}</span>
          {isPlaying && (
            <div className="status-dot active ml-auto" />
          )}
        </div>
        {isVisualType && segment.content?.startsWith('data:') ? (
          <div className="w-12 h-8 rounded overflow-hidden bg-muted">
            <img src={segment.content} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground truncate">
            {preview}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          {isVisualType ? (
            <span className="text-xs text-muted-foreground">{segment.duration}s</span>
          ) : (
            <>
              <span className="speed-badge">{segment.scrollSpeed}px/s</span>
              <span className="text-xs text-muted-foreground">
                {segment.fontSize}px
              </span>
            </>
          )}
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
  editorType?: 'text' | 'visual';
}

export const SegmentList = memo<SegmentListProps>(({ onPlaySegment, editorType = 'text' }) => {
  const project = useTeleprompterStore((s) => s.project);
  const selectedSegmentId = useTeleprompterStore((s) => s.editor.selectedSegmentId);
  const currentSegmentId = useTeleprompterStore((s) => s.playback.currentSegmentId);
  const isPlaying = useTeleprompterStore((s) => s.playback.isPlaying);
  
  const selectSegment = useTeleprompterStore((s) => s.selectSegment);
  const addSegment = useTeleprompterStore((s) => s.addSegment);
  const duplicateSegment = useTeleprompterStore((s) => s.duplicateSegment);
  const deleteSegment = useTeleprompterStore((s) => s.deleteSegment);
  const setCurrentSegment = useTeleprompterStore((s) => s.setCurrentSegment);
  const reorderSegments = useTeleprompterStore((s) => s.reorderSegments);
  
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [showPdfEditor, setShowPdfEditor] = useState(false);
  const [showAudioManager, setShowAudioManager] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  const handleSelect = useCallback((segmentId: string, index: number) => {
    selectSegment(segmentId);
    setCurrentSegment(index);
  }, [selectSegment, setCurrentSegment]);
  
  const handleAddText = useCallback(() => {
    addSegment({
      type: 'text',
      content: 'Enter your teleprompter text here...',
    });
  }, [addSegment]);
  
  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);
  
  const handleDragOver = useCallback((index: number) => {
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  }, [draggedIndex]);
  
  const handleDragEnd = useCallback(() => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      reorderSegments(draggedIndex, dragOverIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex, dragOverIndex, reorderSegments]);
  
  if (!project) return null;
  
  // Show all segments - filtering is now optional display, playback still uses all
  const segments = project.segments;
  
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="panel-header shrink-0">
        <h2 className="text-sm font-semibold">Segments</h2>
        <span className="text-xs text-muted-foreground">
          {segments.length} item{segments.length !== 1 ? 's' : ''}
        </span>
      </div>
      
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
        {segments.map((segment, index) => (
          <SegmentItem
            key={segment.id}
            segment={segment}
            index={index}
            isSelected={selectedSegmentId === segment.id}
            isPlaying={isPlaying && currentSegmentId === segment.id}
            onSelect={() => handleSelect(segment.id, index)}
            onDuplicate={() => duplicateSegment(segment.id)}
            onDelete={() => deleteSegment(segment.id)}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            isDragging={draggedIndex === index}
            dragOverIndex={dragOverIndex}
          />
        ))}
        
        {segments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText size={32} className="text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-4">
              No segments yet
            </p>
          </div>
        )}
      </div>
      
      <div className="p-3 border-t border-border space-y-2 shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="w-full" variant="secondary">
              <Plus size={16} className="mr-2" />
              Add Segment
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-48">
            <DropdownMenuItem onClick={handleAddText}>
              <FileText size={16} className="mr-2" />
              Text Segment
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowImageEditor(true)}>
              <Image size={16} className="mr-2" />
              Image Segment
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowPdfEditor(true)}>
              <FileImage size={16} className="mr-2" />
              PDF Pages
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowAudioManager(true)}>
              <Music size={16} className="mr-2" />
              Audio Library
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Dialogs */}
      <ImageSegmentEditor open={showImageEditor} onOpenChange={setShowImageEditor} />
      <PdfSegmentEditor open={showPdfEditor} onOpenChange={setShowPdfEditor} />
      <AudioManager open={showAudioManager} onOpenChange={setShowAudioManager} />
    </div>
  );
});

SegmentList.displayName = 'SegmentList';

export default SegmentList;
