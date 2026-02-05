import React, { memo, useCallback, useRef } from 'react';
import { useVisualEditorState, formatTime, VisualSegment } from './useVisualEditorState';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Plus, 
  Trash2,
  ImageIcon,
  Play,
  Eye,
  EyeOff,
  Copy,
  Scissors,
  MousePointer2,
  Pencil,
  Link,
  Unlink,
  ZoomIn,
  ZoomOut,
  Maximize,
  Undo,
  Redo,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUndoRedo } from './useUndoRedo';

interface LeftControlPanelProps {
  className?: string;
}

export const LeftControlPanel = memo<LeftControlPanelProps>(({ className }) => {
  const pages = useVisualEditorState((s) => s.pages);
  const currentPageIndex = useVisualEditorState((s) => s.currentPageIndex);
  const selectedSegmentIds = useVisualEditorState((s) => s.selectedSegmentIds);
  const playbackTime = useVisualEditorState((s) => s.playbackTime);
  const isDrawing = useVisualEditorState((s) => s.isDrawing);
  const chainTimesMode = useVisualEditorState((s) => s.chainTimesMode);
  const zoom = useVisualEditorState((s) => s.zoom);
  
  const addPage = useVisualEditorState((s) => s.addPage);
  const removePage = useVisualEditorState((s) => s.removePage);
  const setCurrentPage = useVisualEditorState((s) => s.setCurrentPage);
  const selectSegment = useVisualEditorState((s) => s.selectSegment);
  const toggleSegmentVisibility = useVisualEditorState((s) => s.toggleSegmentVisibility);
  const setPlaybackTime = useVisualEditorState((s) => s.setPlaybackTime);
  const setPlaying = useVisualEditorState((s) => s.setPlaying);
  const setDrawing = useVisualEditorState((s) => s.setDrawing);
  const toggleChainMode = useVisualEditorState((s) => s.toggleChainMode);
  const copySelected = useVisualEditorState((s) => s.copySelected);
  const deleteSegments = useVisualEditorState((s) => s.deleteSegments);
  const setZoom = useVisualEditorState((s) => s.setZoom);
  const resetView = useVisualEditorState((s) => s.resetView);
  
  const { undo, redo, canUndo, canRedo, saveState } = useUndoRedo();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleAddImage = useCallback(() => {
    fileInputRef.current?.click();
  }, []);
  
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const data = event.target?.result as string;
        if (data) {
          addPage(data);
        }
      };
      reader.readAsDataURL(file);
    });
    
    e.target.value = '';
  }, [addPage]);
  
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
  
  const handleDeleteSelected = useCallback(() => {
    if (selectedSegmentIds.size > 0) {
      saveState();
      deleteSegments(Array.from(selectedSegmentIds));
    }
  }, [selectedSegmentIds, saveState, deleteSegments]);
  
  const handleCopySelected = useCallback(() => {
    copySelected();
  }, [copySelected]);
  
  const currentPage = pages[currentPageIndex];
  const hasMultiplePages = pages.length > 1;
  
  return (
    <div className={cn('flex flex-col h-full bg-card border-r border-border', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      
      {/* Tools Section */}
      <div className="p-2 border-b border-border space-y-2">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
          Tools
        </div>
        
        <div className="grid grid-cols-3 gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={!isDrawing ? 'default' : 'outline'}
                size="icon"
                className="h-8 w-full"
                onClick={() => setDrawing(false)}
              >
                <MousePointer2 size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Select tool</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isDrawing ? 'default' : 'outline'}
                size="icon"
                className="h-8 w-full"
                onClick={() => setDrawing(true)}
              >
                <Pencil size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Draw segment (N)</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={chainTimesMode ? 'default' : 'outline'}
                size="icon"
                className="h-8 w-full"
                onClick={toggleChainMode}
              >
                {chainTimesMode ? <Link size={16} /> : <Unlink size={16} />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {chainTimesMode ? 'Chain mode ON' : 'Chain mode OFF'}
            </TooltipContent>
          </Tooltip>
        </div>
        
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
          
          <span className="text-xs font-mono flex-1 text-center">
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
        
        {/* Undo/Redo */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 flex-1"
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
                className="h-7 flex-1"
                onClick={redo}
                disabled={!canRedo}
              >
                <Redo size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
          </Tooltip>
        </div>
        
        {/* Selection actions */}
        {selectedSegmentIds.size > 0 && (
          <div className="flex items-center gap-1 pt-1 border-t border-border/50">
            <span className="text-xs text-muted-foreground flex-1">
              {selectedSegmentIds.size} selected
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleCopySelected}
                >
                  <Copy size={12} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy (Ctrl+C)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={handleDeleteSelected}
                >
                  <Trash2 size={12} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete (Del)</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
      
      {/* Images Section */}
      <div className="p-2 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Images
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleAddImage}>
                <Plus size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add image</TooltipContent>
          </Tooltip>
        </div>
        
        {pages.length === 0 ? (
          <Button
            variant="outline"
            className="w-full h-16 border-dashed"
            onClick={handleAddImage}
          >
            <ImageIcon size={20} className="mr-2 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Add Image</span>
          </Button>
        ) : (
          <div className="flex gap-1 overflow-x-auto pb-1">
            {pages.map((page, index) => (
              <div
                key={page.id}
                className={cn(
                  'relative shrink-0 w-12 h-12 rounded border cursor-pointer overflow-hidden group',
                  index === currentPageIndex 
                    ? 'border-primary ring-1 ring-primary' 
                    : 'border-border hover:border-muted-foreground'
                )}
                onClick={() => setCurrentPage(index)}
              >
                <img
                  src={page.data}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[9px] text-white text-center py-0.5">
                  {page.segments.length}
                </div>
                {pages.length > 1 && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-0 right-0 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      removePage(index);
                    }}
                  >
                    <Trash2 size={8} />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Segments Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-2 py-1.5 border-b border-border/50">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Segments {currentPage && `(${currentPage.segments.length})`}
          </span>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-1 space-y-0.5">
            {pages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4 px-2">
                Add an image to create segments
              </p>
            ) : currentPage?.segments.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4 px-2">
                Draw on the image to create segments
              </p>
            ) : (
              pages.map((page, pageIndex) => (
                <React.Fragment key={page.id}>
                  {hasMultiplePages && page.segments.length > 0 && (
                    <div
                      className={cn(
                        'text-[10px] font-medium text-muted-foreground px-2 py-0.5 sticky top-0 bg-card',
                        pageIndex === currentPageIndex && 'text-foreground'
                      )}
                    >
                      Image {pageIndex + 1}
                    </div>
                  )}
                  
                  {page.segments.map((segment) => {
                    const isSelected = selectedSegmentIds.has(segment.id);
                    const isPlaying = playbackTime >= segment.startTime && playbackTime < segment.endTime;
                    const isCurrentPage = pageIndex === currentPageIndex;
                    
                    return (
                      <div
                        key={segment.id}
                        className={cn(
                          'flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer transition-colors group',
                          isPlaying && 'bg-red-500/20 border border-red-500',
                          isSelected && !isPlaying && 'bg-yellow-400/20 border border-yellow-400',
                          !isSelected && !isPlaying && 'hover:bg-muted/50 border border-transparent',
                          !isCurrentPage && 'opacity-50'
                        )}
                        onClick={(e) => handleSegmentClick(e, segment, pageIndex)}
                        onDoubleClick={() => handlePlaySegment(segment)}
                      >
                        <span className={cn(
                          'w-1.5 h-1.5 rounded-full shrink-0',
                          isPlaying && 'bg-red-500',
                          isSelected && !isPlaying && 'bg-yellow-400',
                          !isSelected && !isPlaying && 'bg-green-500'
                        )} />
                        
                        <div className="flex-1 min-w-0">
                          <div className="text-xs truncate">{segment.label}</div>
                          <div className="text-[9px] text-muted-foreground">
                            {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlaySegment(segment);
                            }}
                          >
                            <Play size={10} />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSegmentVisibility(segment.id);
                            }}
                          >
                            {segment.isHidden ? <EyeOff size={10} /> : <Eye size={10} />}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </React.Fragment>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
});

LeftControlPanel.displayName = 'LeftControlPanel';
