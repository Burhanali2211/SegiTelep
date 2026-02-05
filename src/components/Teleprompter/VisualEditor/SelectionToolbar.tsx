import React, { memo, useCallback } from 'react';
import { useVisualEditorState } from './useVisualEditorState';
import { useUndoRedo } from './useUndoRedo';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Trash2, 
  Copy, 
  ClipboardPaste,
  Square, 
  CheckSquare,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectionToolbarProps {
  className?: string;
}

export const SelectionToolbar = memo<SelectionToolbarProps>(({ className }) => {
  const selectedSegmentIds = useVisualEditorState((s) => s.selectedSegmentIds);
  const clipboard = useVisualEditorState((s) => s.clipboard);
  const currentPage = useVisualEditorState((s) => s.getCurrentPage());
  
  const deleteSegments = useVisualEditorState((s) => s.deleteSegments);
  const copySelected = useVisualEditorState((s) => s.copySelected);
  const paste = useVisualEditorState((s) => s.paste);
  const selectAll = useVisualEditorState((s) => s.selectAll);
  const deselectAll = useVisualEditorState((s) => s.deselectAll);
  const shiftSelectedTimes = useVisualEditorState((s) => s.shiftSelectedTimes);
  const toggleSegmentVisibility = useVisualEditorState((s) => s.toggleSegmentVisibility);
  const setPlaybackTime = useVisualEditorState((s) => s.setPlaybackTime);
  const setPlaying = useVisualEditorState((s) => s.setPlaying);
  
  const { saveState } = useUndoRedo();
  
  const selectedCount = selectedSegmentIds.size;
  const hasSelection = selectedCount > 0;
  
  const selectedSegments = currentPage?.segments.filter(s => selectedSegmentIds.has(s.id)) || [];
  const singleSelected = selectedSegments.length === 1 ? selectedSegments[0] : null;
  
  const handleDelete = useCallback(() => {
    saveState();
    deleteSegments(Array.from(selectedSegmentIds));
  }, [saveState, deleteSegments, selectedSegmentIds]);
  
  const handleCopy = useCallback(() => {
    copySelected();
  }, [copySelected]);
  
  const handlePaste = useCallback(() => {
    saveState();
    paste();
  }, [saveState, paste]);
  
  const handleShift = useCallback((delta: number) => {
    saveState();
    shiftSelectedTimes(delta);
  }, [saveState, shiftSelectedTimes]);
  
  const handleToggleVisibility = useCallback(() => {
    selectedSegmentIds.forEach((id) => {
      toggleSegmentVisibility(id);
    });
  }, [selectedSegmentIds, toggleSegmentVisibility]);
  
  const handlePlaySelection = useCallback(() => {
    if (singleSelected) {
      setPlaybackTime(singleSelected.startTime);
      setPlaying(true);
    }
  }, [singleSelected, setPlaybackTime, setPlaying]);
  
  if (!hasSelection && clipboard.length === 0) return null;
  
  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 bg-card border-t border-border',
      className
    )}>
      {hasSelection && (
        <>
          <span className="text-sm font-medium text-muted-foreground">
            {selectedCount} selected
          </span>
          
          <div className="h-4 w-px bg-border" />
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={handleDelete}>
                <Trash2 size={14} className="mr-1" />
                Delete
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete selected (Del)</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                <Copy size={14} className="mr-1" />
                Copy
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy (Ctrl+C)</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={handleToggleVisibility}>
                <EyeOff size={14} className="mr-1" />
                Hide
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle visibility</TooltipContent>
          </Tooltip>
          
          <div className="h-4 w-px bg-border" />
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={() => handleShift(-1)}>
                <ArrowLeft size={14} className="mr-1" />
                -1s
              </Button>
            </TooltipTrigger>
            <TooltipContent>Shift times back 1 second</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={() => handleShift(1)}>
                <ArrowRight size={14} className="mr-1" />
                +1s
              </Button>
            </TooltipTrigger>
            <TooltipContent>Shift times forward 1 second</TooltipContent>
          </Tooltip>
          
          {singleSelected && (
            <>
              <div className="h-4 w-px bg-border" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={handlePlaySelection}>
                    <Play size={14} className="mr-1" />
                    Play
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Play this segment</TooltipContent>
              </Tooltip>
            </>
          )}
          
          <div className="h-4 w-px bg-border" />
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={deselectAll}>
                <Square size={14} className="mr-1" />
                Deselect
              </Button>
            </TooltipTrigger>
            <TooltipContent>Deselect all (Esc)</TooltipContent>
          </Tooltip>
        </>
      )}
      
      {clipboard.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={handlePaste}>
              <ClipboardPaste size={14} className="mr-1" />
              Paste ({clipboard.length})
            </Button>
          </TooltipTrigger>
          <TooltipContent>Paste (Ctrl+V)</TooltipContent>
        </Tooltip>
      )}
      
      <div className="flex-1" />
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" onClick={selectAll}>
            <CheckSquare size={14} className="mr-1" />
            Select All
          </Button>
        </TooltipTrigger>
        <TooltipContent>Select all (Ctrl+A)</TooltipContent>
      </Tooltip>
    </div>
  );
});

SelectionToolbar.displayName = 'SelectionToolbar';
