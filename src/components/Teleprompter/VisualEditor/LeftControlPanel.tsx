import React, { memo, useCallback, useRef, useState } from 'react';
import { useVisualEditorState, formatTime, VisualSegment } from './useVisualEditorState';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Plus, 
  Trash2,
  ImageIcon,
  Play,
  Eye,
  EyeOff,
  Copy,
  MousePointer2,
  Pencil,
  Link,
  Unlink,
  ZoomIn,
  ZoomOut,
  Maximize,
  Undo,
  Redo,
  ChevronDown,
  Layers,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUndoRedo } from './useUndoRedo';

interface LeftControlPanelProps {
  className?: string;
}

export const LeftControlPanel = memo<LeftControlPanelProps>(({ className }) => {
  const [toolsOpen, setToolsOpen] = useState(true);
  const [imagesOpen, setImagesOpen] = useState(true);
  const [segmentsOpen, setSegmentsOpen] = useState(true);
  
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

  const currentPage = pages[currentPageIndex];
  const totalSegments = pages.reduce((acc, p) => acc + p.segments.length, 0);
  
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
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* Tools Section */}
          <Collapsible open={toolsOpen} onOpenChange={setToolsOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 rounded hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <Wrench size={12} />
                Tools
              </div>
              <ChevronDown size={14} className={cn('text-muted-foreground transition-transform', toolsOpen && 'rotate-180')} />
            </CollapsibleTrigger>
            
            <CollapsibleContent className="space-y-2 pt-2">
              {/* Tool buttons */}
              <div className="grid grid-cols-3 gap-1 px-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={!isDrawing ? 'default' : 'ghost'}
                      size="sm"
                      className="h-8"
                      onClick={() => setDrawing(false)}
                    >
                      <MousePointer2 size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Select (Esc)</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isDrawing ? 'default' : 'ghost'}
                      size="sm"
                      className="h-8"
                      onClick={() => setDrawing(true)}
                    >
                      <Pencil size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Draw (N)</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={chainTimesMode ? 'default' : 'ghost'}
                      size="sm"
                      className="h-8"
                      onClick={toggleChainMode}
                    >
                      {chainTimesMode ? <Link size={14} /> : <Unlink size={14} />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {chainTimesMode ? 'Chain ON' : 'Chain OFF'}
                  </TooltipContent>
                </Tooltip>
              </div>
              
              {/* Zoom controls */}
              <div className="flex items-center gap-1 px-1 py-1 bg-muted/30 rounded">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setZoom(zoom - 0.25)}
                      disabled={zoom <= 0.5}
                    >
                      <ZoomOut size={12} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Zoom out</TooltipContent>
                </Tooltip>
                
                <span className="text-[10px] font-mono flex-1 text-center text-muted-foreground">
                  {Math.round(zoom * 100)}%
                </span>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setZoom(zoom + 0.25)}
                      disabled={zoom >= 4}
                    >
                      <ZoomIn size={12} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Zoom in</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={resetView}
                    >
                      <Maximize size={12} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Reset</TooltipContent>
                </Tooltip>
              </div>
              
              {/* Undo/Redo */}
              <div className="flex items-center gap-1 px-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 flex-1 text-xs"
                      onClick={undo}
                      disabled={!canUndo}
                    >
                      <Undo size={12} className="mr-1" />
                      Undo
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Ctrl+Z</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 flex-1 text-xs"
                      onClick={redo}
                      disabled={!canRedo}
                    >
                      <Redo size={12} className="mr-1" />
                      Redo
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Ctrl+Shift+Z</TooltipContent>
                </Tooltip>
              </div>
              
              {/* Selection actions */}
              {selectedSegmentIds.size > 0 && (
                <div className="flex items-center gap-1 px-1 py-1 bg-primary/10 rounded">
                  <span className="text-[10px] text-primary flex-1 px-1">
                    {selectedSegmentIds.size} selected
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copySelected()}
                      >
                        <Copy size={12} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy</TooltipContent>
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
                    <TooltipContent>Delete</TooltipContent>
                  </Tooltip>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
          
          {/* Images Section */}
          <Collapsible open={imagesOpen} onOpenChange={setImagesOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 rounded hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <ImageIcon size={12} />
                Images
                {pages.length > 0 && (
                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">{pages.length}</span>
                )}
              </div>
              <ChevronDown size={14} className={cn('text-muted-foreground transition-transform', imagesOpen && 'rotate-180')} />
            </CollapsibleTrigger>
            
            <CollapsibleContent className="pt-2 px-1">
              {pages.length === 0 ? (
                <Button
                  variant="outline"
                  className="w-full h-14 border-dashed flex-col gap-1"
                  onClick={handleAddImage}
                >
                  <Plus size={16} className="text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">Add Image</span>
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-1">
                    {pages.map((page, index) => (
                      <div
                        key={page.id}
                        className={cn(
                          'relative aspect-square rounded border cursor-pointer overflow-hidden group',
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
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-[8px] text-white text-center py-0.5">
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-xs"
                    onClick={handleAddImage}
                  >
                    <Plus size={12} className="mr-1" />
                    Add More
                  </Button>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
          
          {/* Segments Section */}
          <Collapsible open={segmentsOpen} onOpenChange={setSegmentsOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 rounded hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <Layers size={12} />
                Regions
                {totalSegments > 0 && (
                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">{totalSegments}</span>
                )}
              </div>
              <ChevronDown size={14} className={cn('text-muted-foreground transition-transform', segmentsOpen && 'rotate-180')} />
            </CollapsibleTrigger>
            
            <CollapsibleContent className="pt-2">
              {pages.length === 0 ? (
                <p className="text-[10px] text-muted-foreground text-center py-3 px-2">
                  Add an image first
                </p>
              ) : totalSegments === 0 ? (
                <p className="text-[10px] text-muted-foreground text-center py-3 px-2">
                  Draw on image to create regions
                </p>
              ) : (
                <div className="space-y-0.5 px-1">
                  {pages.map((page, pageIndex) => (
                    <React.Fragment key={page.id}>
                      {pages.length > 1 && page.segments.length > 0 && (
                        <div
                          className={cn(
                            'text-[9px] font-medium px-2 py-1 sticky top-0 bg-card',
                            pageIndex === currentPageIndex ? 'text-primary' : 'text-muted-foreground'
                          )}
                        >
                          Image {pageIndex + 1}
                        </div>
                      )}
                      
                      {page.segments.map((segment) => {
                        const isSelected = selectedSegmentIds.has(segment.id);
                        const isPlaying = playbackTime >= segment.startTime && playbackTime < segment.endTime;
                        
                        return (
                          <div
                            key={segment.id}
                            className={cn(
                              'flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer transition-colors group',
                              isPlaying && 'bg-destructive/20 border-l-2 border-destructive',
                              isSelected && !isPlaying && 'bg-primary/20 border-l-2 border-primary',
                              !isSelected && !isPlaying && 'hover:bg-muted/50 border-l-2 border-transparent'
                            )}
                            onClick={(e) => handleSegmentClick(e, segment, pageIndex)}
                            onDoubleClick={() => handlePlaySegment(segment)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] font-medium truncate">{segment.label}</div>
                              <div className="text-[9px] text-muted-foreground font-mono">
                                {formatTime(segment.startTime)} → {formatTime(segment.endTime)}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
                  ))}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  );
});

LeftControlPanel.displayName = 'LeftControlPanel';
