import React, { memo, useEffect } from 'react';
import { useVisualEditorState } from './useVisualEditorState';
import { useUndoRedo } from './useUndoRedo';
import { ImageCanvas } from './ImageCanvas';
import { TimelineStrip } from './TimelineStrip';
import { SelectionToolbar } from './SelectionToolbar';
import { LeftControlPanel } from './LeftControlPanel';
import { AudioWaveform } from './AudioWaveform';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Presentation, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VisualEditorProps {
  className?: string;
  onOpenPreview?: () => void;
}

export const VisualEditor = memo<VisualEditorProps>(({ className, onOpenPreview }) => {
  const zoom = useVisualEditorState((s) => s.zoom);
  const selectedSegmentIds = useVisualEditorState((s) => s.selectedSegmentIds);
  const pages = useVisualEditorState((s) => s.pages);
  const currentPage = useVisualEditorState((s) => s.getCurrentPage());
  
  const setZoom = useVisualEditorState((s) => s.setZoom);
  const showAllSegments = useVisualEditorState((s) => s.showAllSegments);
  const deleteSegments = useVisualEditorState((s) => s.deleteSegments);
  const copySelected = useVisualEditorState((s) => s.copySelected);
  const paste = useVisualEditorState((s) => s.paste);
  const duplicateSegment = useVisualEditorState((s) => s.duplicateSegment);
  const selectAll = useVisualEditorState((s) => s.selectAll);
  const deselectAll = useVisualEditorState((s) => s.deselectAll);
  const setCurrentPage = useVisualEditorState((s) => s.setCurrentPage);
  const currentPageIndex = useVisualEditorState((s) => s.currentPageIndex);
  const setDrawing = useVisualEditorState((s) => s.setDrawing);
  
  const { saveState, undo, redo } = useUndoRedo();
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      const ctrl = e.ctrlKey || e.metaKey;
      
      // New segment (N key)
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setDrawing(true);
        return;
      }
      
      // Delete
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedSegmentIds.size > 0) {
        e.preventDefault();
        saveState();
        deleteSegments(Array.from(selectedSegmentIds));
        return;
      }
      
      // Copy
      if (ctrl && e.key === 'c') {
        e.preventDefault();
        copySelected();
        return;
      }
      
      // Paste
      if (ctrl && e.key === 'v') {
        e.preventDefault();
        saveState();
        paste();
        return;
      }
      
      // Duplicate
      if (ctrl && e.key === 'd' && selectedSegmentIds.size === 1) {
        e.preventDefault();
        saveState();
        duplicateSegment(Array.from(selectedSegmentIds)[0]);
        return;
      }
      
      // Select all
      if (ctrl && e.key === 'a') {
        e.preventDefault();
        selectAll();
        return;
      }
      
      // Deselect
      if (e.key === 'Escape') {
        e.preventDefault();
        deselectAll();
        setDrawing(false);
        return;
      }
      
      // Undo
      if (ctrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      
      // Redo
      if (ctrl && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        redo();
        return;
      }
      
      // Zoom
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoom(zoom + 0.25);
        return;
      }
      
      if (e.key === '-') {
        e.preventDefault();
        setZoom(zoom - 0.25);
        return;
      }
      
      // Page navigation
      if (e.key === 'PageUp') {
        e.preventDefault();
        if (currentPageIndex > 0) {
          setCurrentPage(currentPageIndex - 1);
        }
        return;
      }
      
      if (e.key === 'PageDown') {
        e.preventDefault();
        if (currentPageIndex < pages.length - 1) {
          setCurrentPage(currentPageIndex + 1);
        }
        return;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedSegmentIds, zoom, pages.length, currentPageIndex,
    saveState, deleteSegments, copySelected, paste, duplicateSegment,
    selectAll, deselectAll, undo, redo, setZoom, setCurrentPage, setDrawing,
  ]);
  
  const hasHiddenSegments = currentPage?.segments.some(s => s.isHidden);
  
  return (
    <div className={cn('flex h-full bg-background overflow-hidden', className)}>
      {/* Left Control Panel */}
      <LeftControlPanel className="w-48 shrink-0" />
      
      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header - minimal, just preview and show hidden */}
        <div className="flex items-center justify-end px-3 py-1.5 border-b border-border bg-card gap-2">
          {hasHiddenSegments && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={showAllSegments}
                >
                  <Eye size={14} className="mr-1" />
                  Show Hidden
                </Button>
              </TooltipTrigger>
              <TooltipContent>Show all hidden segments</TooltipContent>
            </Tooltip>
          )}
          
          {onOpenPreview && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={onOpenPreview}>
                  <Presentation size={14} className="mr-1" />
                  Preview
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open teleprompter preview</TooltipContent>
            </Tooltip>
          )}
        </div>
        
        {/* Canvas */}
        <ImageCanvas className="flex-1 min-h-0" />
        
        {/* Audio Waveform */}
        <AudioWaveform />
        
        {/* Timeline Strip */}
        <TimelineStrip />
        
        {/* Selection Toolbar (floating) */}
        <SelectionToolbar />
      </div>
    </div>
  );
});

VisualEditor.displayName = 'VisualEditor';
