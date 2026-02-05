import React, { memo, useEffect, useCallback } from 'react';
import { useVisualEditorState } from './useVisualEditorState';
import { useUndoRedo } from './useUndoRedo';
import { ImageCanvas } from './ImageCanvas';
import { TimelineStrip } from './TimelineStrip';
import { SelectionToolbar } from './SelectionToolbar';
import { PageNavigator } from './PageNavigator';
import { SegmentListPanel } from './SegmentListPanel';
import { AudioWaveform } from './AudioWaveform';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  Undo,
  Redo,
  Eye,
  Presentation,
} from 'lucide-react';
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
  const resetView = useVisualEditorState((s) => s.resetView);
  const showAllSegments = useVisualEditorState((s) => s.showAllSegments);
  const deleteSegments = useVisualEditorState((s) => s.deleteSegments);
  const copySelected = useVisualEditorState((s) => s.copySelected);
  const paste = useVisualEditorState((s) => s.paste);
  const duplicateSegment = useVisualEditorState((s) => s.duplicateSegment);
  const selectAll = useVisualEditorState((s) => s.selectAll);
  const deselectAll = useVisualEditorState((s) => s.deselectAll);
  const setCurrentPage = useVisualEditorState((s) => s.setCurrentPage);
  const currentPageIndex = useVisualEditorState((s) => s.currentPageIndex);
  
  const { saveState, undo, redo, canUndo, canRedo } = useUndoRedo();
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      const ctrl = e.ctrlKey || e.metaKey;
      
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
      
      // Space for play/pause handled by AudioWaveform
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedSegmentIds, zoom, pages.length, currentPageIndex,
    saveState, deleteSegments, copySelected, paste, duplicateSegment,
    selectAll, deselectAll, undo, redo, setZoom, setCurrentPage,
  ]);
  
  const hasHiddenSegments = currentPage?.segments.some(s => s.isHidden);
  
  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Header toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card">
        <PageNavigator />
        
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setZoom(zoom - 0.25)}
                  disabled={zoom <= 0.5}
                >
                  <ZoomOut size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom out (-)</TooltipContent>
            </Tooltip>
            
            <span className="text-xs font-mono w-10 text-center">
              {Math.round(zoom * 100)}%
            </span>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setZoom(zoom + 0.25)}
                  disabled={zoom >= 4}
                >
                  <ZoomIn size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom in (+)</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={resetView}
                >
                  <Maximize size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset view</TooltipContent>
            </Tooltip>
          </div>
          
          <div className="h-4 w-px bg-border" />
          
          {/* Undo/Redo */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={undo}
                disabled={!canUndo}
              >
                <Undo size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={redo}
                disabled={!canRedo}
              >
                <Redo size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
          </Tooltip>
          
          {hasHiddenSegments && (
            <>
              <div className="h-4 w-px bg-border" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={showAllSegments}
                  >
                    <Eye size={14} className="mr-1" />
                    Show All
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Show all hidden segments</TooltipContent>
              </Tooltip>
            </>
          )}
          
          <div className="h-4 w-px bg-border" />
          
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
      </div>
      
      {/* Main content area */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Canvas area */}
        <div className="flex-1 flex flex-col min-w-0">
          <ImageCanvas className="flex-1 min-h-0" />
          <AudioWaveform />
          <TimelineStrip />
          <SelectionToolbar />
        </div>
        
        {/* Segment list sidebar */}
        <div className="w-56 border-l border-border shrink-0">
          <SegmentListPanel className="h-full" />
        </div>
      </div>
    </div>
  );
});

VisualEditor.displayName = 'VisualEditor';
