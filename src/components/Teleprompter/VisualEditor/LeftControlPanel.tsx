import React, { memo, useCallback, useRef } from 'react';
import { useVisualEditorState, formatTime, VisualSegment } from './useVisualEditorState';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Trash2,
  ImagePlus,
  Play,
  Eye,
  EyeOff,
  Copy,
  MousePointer2,
  PenTool,
  Link2,
  Link2Off,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Undo2,
  Redo2,
  Layers3,
  Clock,
  GripVertical,
  Upload,
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

  const currentPage = pages[currentPageIndex];
  const totalSegments = pages.reduce((acc, p) => acc + p.segments.length, 0);
  
  // Tool button component for consistency
  const ToolButton = ({ 
    active, 
    onClick, 
    icon: Icon, 
    tooltip,
    shortcut,
    variant = 'default'
  }: { 
    active?: boolean; 
    onClick: () => void; 
    icon: React.ElementType; 
    tooltip: string;
    shortcut?: string;
    variant?: 'default' | 'accent';
  }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            'relative flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200',
            'hover:scale-105 active:scale-95',
            active 
              ? variant === 'accent'
                ? 'bg-accent text-accent-foreground shadow-md shadow-accent/25'
                : 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Icon size={16} strokeWidth={1.5} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="flex items-center gap-2">
        {tooltip}
        {shortcut && (
          <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded font-mono">
            {shortcut}
          </kbd>
        )}
      </TooltipContent>
    </Tooltip>
  );
  
  return (
    <div className={cn(
      'flex flex-col h-full bg-gradient-to-b from-card to-card/95',
      'border-r border-border/50 shadow-xl shadow-black/5',
      className
    )}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      
      {/* Tools Section - Fixed */}
      <div className="p-3 space-y-3">
        {/* Primary Tools */}
        <div className="flex items-center justify-center gap-1.5">
          <ToolButton
            active={!isDrawing}
            onClick={() => setDrawing(false)}
            icon={MousePointer2}
            tooltip="Select"
            shortcut="Esc"
          />
          <ToolButton
            active={isDrawing}
            onClick={() => setDrawing(true)}
            icon={PenTool}
            tooltip="Draw Region"
            shortcut="N"
          />
          <ToolButton
            active={chainTimesMode}
            onClick={toggleChainMode}
            icon={chainTimesMode ? Link2 : Link2Off}
            tooltip={chainTimesMode ? 'Chain Mode ON' : 'Chain Mode OFF'}
            variant="accent"
          />
        </div>
        
        {/* Zoom Controls */}
        <div className="flex items-center gap-1 p-1.5 bg-muted/30 rounded-lg">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setZoom(zoom - 0.25)}
                disabled={zoom <= 0.5}
                className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-30 transition-colors"
              >
                <ZoomOut size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Zoom Out (-)</TooltipContent>
          </Tooltip>
          
          <div className="flex-1 text-center">
            <span className="text-xs font-medium tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
          </div>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setZoom(zoom + 0.25)}
                disabled={zoom >= 4}
                className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-30 transition-colors"
              >
                <ZoomIn size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Zoom In (+)</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={resetView}
                className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <Maximize2 size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Fit to View</TooltipContent>
          </Tooltip>
        </div>
        
        {/* Undo/Redo */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={undo}
                disabled={!canUndo}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 h-8 rounded-md text-xs font-medium transition-all',
                  canUndo 
                    ? 'text-muted-foreground hover:text-foreground hover:bg-muted/50' 
                    : 'text-muted-foreground/30'
                )}
              >
                <Undo2 size={14} />
                Undo
              </button>
            </TooltipTrigger>
            <TooltipContent>Ctrl+Z</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={redo}
                disabled={!canRedo}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 h-8 rounded-md text-xs font-medium transition-all',
                  canRedo 
                    ? 'text-muted-foreground hover:text-foreground hover:bg-muted/50' 
                    : 'text-muted-foreground/30'
                )}
              >
                <Redo2 size={14} />
                Redo
              </button>
            </TooltipTrigger>
            <TooltipContent>Ctrl+Shift+Z</TooltipContent>
          </Tooltip>
        </div>
        
        {/* Selection Actions */}
        {selectedSegmentIds.size > 0 && (
          <div className="flex items-center gap-2 p-2 bg-primary/10 border border-primary/20 rounded-lg animate-in fade-in slide-in-from-top-1 duration-200">
            <span className="flex-1 text-xs font-medium text-primary">
              {selectedSegmentIds.size} selected
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => copySelected()}
                  className="flex items-center justify-center w-7 h-7 rounded-md text-primary hover:bg-primary/20 transition-colors"
                >
                  <Copy size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Copy (Ctrl+C)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleDeleteSelected}
                  className="flex items-center justify-center w-7 h-7 rounded-md text-destructive hover:bg-destructive/20 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
      
      <Separator className="opacity-50" />
      
      {/* Scrollable Content */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Images Section */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Images
              </h3>
              {pages.length > 0 && (
                <span className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                  {pages.length}
                </span>
              )}
            </div>
            
            {pages.length === 0 ? (
              <button
                onClick={handleAddImage}
                className={cn(
                  'w-full aspect-video rounded-xl border-2 border-dashed border-muted-foreground/25',
                  'flex flex-col items-center justify-center gap-2 p-4',
                  'text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5',
                  'transition-all duration-200 group'
                )}
              >
                <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Upload size={18} className="group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-xs font-medium">Add Image</span>
                <span className="text-[10px] text-muted-foreground">
                  Click or drag & drop
                </span>
              </button>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-1.5">
                  {pages.map((page, index) => (
                    <button
                      key={page.id}
                      onClick={() => setCurrentPage(index)}
                      className={cn(
                        'relative aspect-square rounded-lg overflow-hidden transition-all duration-200 group',
                        'ring-2 ring-offset-1 ring-offset-card',
                        index === currentPageIndex 
                          ? 'ring-primary scale-[1.02]' 
                          : 'ring-transparent hover:ring-muted-foreground/30'
                      )}
                    >
                      <img
                        src={page.data}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      {/* Overlay */}
                      <div className={cn(
                        'absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent',
                        'opacity-0 group-hover:opacity-100 transition-opacity'
                      )} />
                      {/* Page number badge */}
                      <div className={cn(
                        'absolute bottom-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded',
                        index === currentPageIndex
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-black/60 text-white'
                      )}>
                        {index + 1}
                      </div>
                      {/* Segment count */}
                      {page.segments.length > 0 && (
                        <div className="absolute bottom-1 right-1 text-[9px] font-medium px-1.5 py-0.5 rounded bg-black/60 text-white">
                          {page.segments.length}
                        </div>
                      )}
                      {/* Delete button */}
                      {pages.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removePage(index);
                          }}
                          className={cn(
                            'absolute top-1 right-1 w-5 h-5 rounded flex items-center justify-center',
                            'bg-destructive/90 text-destructive-foreground',
                            'opacity-0 group-hover:opacity-100 transition-all',
                            'hover:scale-110 active:scale-95'
                          )}
                        >
                          <Trash2 size={10} />
                        </button>
                      )}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={handleAddImage}
                  className={cn(
                    'w-full h-9 rounded-lg border border-dashed border-muted-foreground/30',
                    'flex items-center justify-center gap-1.5',
                    'text-xs text-muted-foreground hover:text-foreground',
                    'hover:border-primary/50 hover:bg-primary/5 transition-all'
                  )}
                >
                  <ImagePlus size={14} />
                  Add More
                </button>
              </div>
            )}
          </section>
          
          {/* Regions Section */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Layers3 size={12} />
                Regions
              </h3>
              {totalSegments > 0 && (
                <span className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                  {totalSegments}
                </span>
              )}
            </div>
            
            {pages.length === 0 ? (
              <div className="py-6 text-center">
                <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-2">
                  <Layers3 size={16} className="text-muted-foreground/50" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Add an image first
                </p>
              </div>
            ) : totalSegments === 0 ? (
              <div className="py-6 text-center">
                <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-2">
                  <PenTool size={16} className="text-muted-foreground/50" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Draw on the image
                </p>
                <p className="text-[10px] text-muted-foreground/70 mt-1">
                  Press <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">N</kbd> to start
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {pages.map((page, pageIndex) => (
                  <React.Fragment key={page.id}>
                    {/* Page header for multi-page */}
                    {pages.length > 1 && page.segments.length > 0 && (
                      <div className={cn(
                        'text-[10px] font-semibold px-2 py-1.5 rounded-md mb-1',
                        pageIndex === currentPageIndex 
                          ? 'text-primary bg-primary/10' 
                          : 'text-muted-foreground bg-muted/30'
                      )}>
                        Page {pageIndex + 1}
                      </div>
                    )}
                    
                    {/* Segments */}
                    {page.segments.map((segment) => {
                      const isSelected = selectedSegmentIds.has(segment.id);
                      const isPlaying = playbackTime >= segment.startTime && playbackTime < segment.endTime;
                      
                      return (
                        <button
                          key={segment.id}
                          onClick={(e) => handleSegmentClick(e, segment, pageIndex)}
                          onDoubleClick={() => handlePlaySegment(segment)}
                          className={cn(
                            'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all duration-150 text-left group',
                            isPlaying && 'bg-destructive/15 ring-1 ring-destructive/30',
                            isSelected && !isPlaying && 'bg-primary/15 ring-1 ring-primary/30',
                            !isSelected && !isPlaying && 'hover:bg-muted/50'
                          )}
                        >
                          {/* Drag handle indicator */}
                          <div className={cn(
                            'w-1 h-8 rounded-full transition-colors',
                            isPlaying ? 'bg-destructive' : isSelected ? 'bg-primary' : 'bg-muted-foreground/20'
                          )} />
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={cn(
                                'text-[11px] font-medium truncate',
                                segment.isHidden && 'opacity-50'
                              )}>
                                {segment.label}
                              </span>
                              {segment.isHidden && (
                                <EyeOff size={10} className="text-muted-foreground shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                              <Clock size={9} />
                              {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePlaySegment(segment);
                              }}
                              className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                            >
                              <Play size={12} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSegmentVisibility(segment.id);
                              }}
                              className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                            >
                              {segment.isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                            </button>
                          </div>
                        </button>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            )}
          </section>
        </div>
      </ScrollArea>
      
      {/* Footer Stats */}
      <div className="p-3 border-t border-border/50 bg-muted/20">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{pages.length} image{pages.length !== 1 ? 's' : ''}</span>
          <span>{totalSegments} region{totalSegments !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  );
});

LeftControlPanel.displayName = 'LeftControlPanel';
