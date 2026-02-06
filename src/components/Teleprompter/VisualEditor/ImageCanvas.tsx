import React, { memo, useRef, useEffect, useState, useCallback } from 'react';
import { useVisualEditorState, VisualSegment } from './useVisualEditorState';
import { useUndoRedo } from './useUndoRedo';
import { Region } from '@/types/teleprompter.types';
import { cn } from '@/lib/utils';

interface ImageCanvasProps {
  className?: string;
}

// Magnetic snap threshold in pixels
const SNAP_THRESHOLD = 15;

export const ImageCanvas = memo<ImageCanvasProps>(({ className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [imageDisplaySize, setImageDisplaySize] = useState({ width: 0, height: 0 });
  
  // Drawing state
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDraw, setCurrentDraw] = useState<Region | null>(null);
  
  // Panning state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number; panX: number; panY: number } | null>(null);
  
  const currentPage = useVisualEditorState((s) => s.getCurrentPage());
  const zoom = useVisualEditorState((s) => s.zoom);
  const pan = useVisualEditorState((s) => s.pan);
  const isDrawing = useVisualEditorState((s) => s.isDrawing);
  const selectedSegmentIds = useVisualEditorState((s) => s.selectedSegmentIds);
  const playbackTime = useVisualEditorState((s) => s.playbackTime);
  const currentPageIndex = useVisualEditorState((s) => s.currentPageIndex);
  const aspectRatioConstraint = useVisualEditorState((s) => s.aspectRatioConstraint);
  const customAspectRatio = useVisualEditorState((s) => s.customAspectRatio);
  
  const addSegment = useVisualEditorState((s) => s.addSegment);
  const updateSegment = useVisualEditorState((s) => s.updateSegment);
  const selectSegment = useVisualEditorState((s) => s.selectSegment);
  const deselectAll = useVisualEditorState((s) => s.deselectAll);
  const setPan = useVisualEditorState((s) => s.setPan);
  const setDrawing = useVisualEditorState((s) => s.setDrawing);
  
  const { saveState } = useUndoRedo();
  
  // Load image when page changes - capture natural dimensions
  useEffect(() => {
    if (!currentPage?.data) {
      setImageLoaded(false);
      setImageNaturalSize({ width: 0, height: 0 });
      return;
    }
    
    const img = new Image();
    img.onload = () => {
      // Capture natural dimensions immediately on load
      const naturalWidth = img.naturalWidth || img.width;
      const naturalHeight = img.naturalHeight || img.height;
      
      imageRef.current = img;
      setImageNaturalSize({ width: naturalWidth, height: naturalHeight });
      setImageLoaded(true);
    };
    img.onerror = () => {
      setImageLoaded(false);
    };
    img.src = currentPage.data;
  }, [currentPage?.data]);
  
  // Calculate display size - ALWAYS fill container width, allow vertical scroll for portrait images
  useEffect(() => {
    if (!containerRef.current || !imageLoaded || imageNaturalSize.width === 0) return;
    
    const container = containerRef.current;
    
    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      
      setContainerSize({ width: rect.width, height: rect.height });
      
      // Use stored natural dimensions for accurate aspect ratio
      const imgAspect = imageNaturalSize.width / imageNaturalSize.height;
      
      // ALWAYS fill container width - this ensures left/right edge snapping works
      // For portrait images, this makes them taller than the container (scrollable)
      // For landscape images, they fit within the container height
      const displayWidth = rect.width;
      const displayHeight = rect.width / imgAspect;
      
      setImageDisplaySize({ width: displayWidth, height: displayHeight });
    };
    
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [imageLoaded, imageNaturalSize]);
  
  // Magnetic snap function - snaps IMAGE pan position to LEFT, RIGHT, TOP edges (NOT bottom)
  const applyMagneticSnap = useCallback((newPan: { x: number; y: number }) => {
    const scaledWidth = imageDisplaySize.width * zoom;
    const scaledHeight = imageDisplaySize.height * zoom;
    
    let snappedX = newPan.x;
    let snappedY = newPan.y;
    
    // Calculate bounds - image can be dragged so edges align with viewport
    const minX = containerSize.width - scaledWidth; // Right edge of image touches right of container
    const maxX = 0; // Left edge of image touches left of container
    const minY = containerSize.height - scaledHeight; // Bottom edge touches bottom
    const maxY = 0; // Top edge touches top of container
    
    // Snap to LEFT edge (image's left aligns with container's left)
    if (Math.abs(snappedX - maxX) < SNAP_THRESHOLD) {
      snappedX = maxX;
    }
    
    // Snap to RIGHT edge (image's right aligns with container's right)
    if (Math.abs(snappedX - minX) < SNAP_THRESHOLD && scaledWidth > containerSize.width) {
      snappedX = minX;
    }
    
    // Snap to TOP edge (image's top aligns with container's top)
    if (Math.abs(snappedY - maxY) < SNAP_THRESHOLD) {
      snappedY = maxY;
    }
    
    // NO snapping for BOTTOM edge - intentionally omitted per user request
    // This allows free scrolling at the bottom for portrait images
    
    // Constrain horizontal bounds so image stays in view
    if (scaledWidth <= containerSize.width) {
      // Image fits horizontally - center it
      snappedX = (containerSize.width - scaledWidth) / 2;
    } else {
      // Image wider than container - allow panning but keep edges visible
      snappedX = Math.max(minX, Math.min(maxX, snappedX));
    }
    
    // Constrain vertical bounds - but allow more freedom at bottom
    if (scaledHeight <= containerSize.height) {
      // Image fits vertically - center it
      snappedY = (containerSize.height - scaledHeight) / 2;
    } else {
      // Image taller than container (portrait) - allow panning
      // Keep image in bounds but no magnetic snap at bottom
      snappedY = Math.max(minY, Math.min(maxY, snappedY));
    }
    
    return { x: snappedX, y: snappedY };
  }, [containerSize, imageDisplaySize, zoom]);
  
  // Reset pan when zoom changes or image loads to center the image
  useEffect(() => {
    if (imageLoaded && containerSize.width > 0 && imageDisplaySize.width > 0) {
      // Center the image in the container
      const scaledWidth = imageDisplaySize.width * zoom;
      const scaledHeight = imageDisplaySize.height * zoom;
      
      const centerX = (containerSize.width - scaledWidth) / 2;
      const centerY = (containerSize.height - scaledHeight) / 2;
      
      const snapped = applyMagneticSnap({ x: centerX, y: centerY });
      setPan(snapped);
    }
  }, [imageLoaded, zoom, containerSize.width, containerSize.height, imageDisplaySize.width, imageDisplaySize.height]);
  
  // Get percentage coords from pointer event relative to image
  const getPercentCoords = useCallback((e: React.PointerEvent | PointerEvent) => {
    const imageEl = document.getElementById('visual-editor-image');
    if (!imageEl) return { x: 0, y: 0 };
    
    const rect = imageEl.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    return {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    };
  }, []);
  
  // Get aspect ratio value from constraint
  const getAspectRatioValue = useCallback(() => {
    if (!aspectRatioConstraint) return null;
    
    const presets: Record<string, number> = {
      '16:9': 16 / 9,
      '4:3': 4 / 3,
      '1:1': 1,
      '9:16': 9 / 16,
      '3:4': 3 / 4,
      '21:9': 21 / 9,
    };
    
    if (presets[aspectRatioConstraint]) {
      return presets[aspectRatioConstraint];
    }
    
    if (aspectRatioConstraint === 'custom' && customAspectRatio) {
      return customAspectRatio.width / customAspectRatio.height;
    }
    
    return null;
  }, [aspectRatioConstraint, customAspectRatio]);
  
  // Find segment at coords
  const findSegmentAtCoords = useCallback((coords: { x: number; y: number }): VisualSegment | null => {
    if (!currentPage) return null;
    
    for (let i = currentPage.segments.length - 1; i >= 0; i--) {
      const seg = currentPage.segments[i];
      if (seg.isHidden) continue;
      
      if (
        coords.x >= seg.region.x &&
        coords.x <= seg.region.x + seg.region.width &&
        coords.y >= seg.region.y &&
        coords.y <= seg.region.y + seg.region.height
      ) {
        return seg;
      }
    }
    return null;
  }, [currentPage]);
  
  // Pointer handlers for drawing
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Prevent default to avoid text selection
    e.preventDefault();
    
    // Alt+drag for panning
    if (e.altKey && zoom > 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }
    
    const coords = getPercentCoords(e);
    
    if (isDrawing) {
      setDrawStart(coords);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }
    
    // Check if clicking on segment - if not, deselect
    const segment = findSegmentAtCoords(coords);
    if (!segment) {
      deselectAll();
    }
  }, [isDrawing, zoom, pan, getPercentCoords, findSegmentAtCoords, deselectAll]);
  
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isPanning && panStart) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      const newPan = { x: panStart.panX + dx, y: panStart.panY + dy };
      // Apply magnetic snap on release, allow free movement while dragging
      setPan(newPan);
      return;
    }
    
    if (!isDrawing || !drawStart) return;
    
    const coords = getPercentCoords(e);
    const aspectRatio = getAspectRatioValue();
    let width = Math.abs(coords.x - drawStart.x);
    let height = Math.abs(coords.y - drawStart.y);
    
    // Apply aspect ratio constraint
    if (aspectRatio && imageRef.current) {
      // Convert to actual pixel proportions considering image dimensions
      const imageAspect = imageRef.current.width / imageRef.current.height;
      const adjustedRatio = aspectRatio / imageAspect;
      
      // Constrain height based on width
      const constrainedHeight = width / adjustedRatio;
      
      // Use the dimension that gives smallest area (user controls size by dragging)
      if (constrainedHeight <= Math.abs(coords.y - drawStart.y) * 1.5) {
        height = constrainedHeight;
      } else {
        // Constrain width based on height
        width = height * adjustedRatio;
      }
    }
    
    // Calculate position (handle negative drag directions)
    const x = coords.x < drawStart.x ? drawStart.x - width : drawStart.x;
    const y = coords.y < drawStart.y ? drawStart.y - height : drawStart.y;
    
    // Clamp to image bounds
    const clampedX = Math.max(0, Math.min(100 - width, x));
    const clampedY = Math.max(0, Math.min(100 - height, y));
    const clampedWidth = Math.min(width, 100 - clampedX);
    const clampedHeight = Math.min(height, 100 - clampedY);
    
    setCurrentDraw({ x: clampedX, y: clampedY, width: clampedWidth, height: clampedHeight });
  }, [isDrawing, drawStart, isPanning, panStart, getPercentCoords, setPan, getAspectRatioValue]);
  
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    
    if (isPanning) {
      // Apply magnetic snap when releasing
      const snapped = applyMagneticSnap(pan);
      setPan(snapped);
      setIsPanning(false);
      setPanStart(null);
      return;
    }
    
    if (!isDrawing || !currentDraw) {
      setDrawStart(null);
      setCurrentDraw(null);
      return;
    }
    
    // Minimum size 3%
    if (currentDraw.width >= 3 && currentDraw.height >= 3) {
      saveState();
      addSegment(currentPageIndex, currentDraw);
      setDrawing(false);
    }
    
    setDrawStart(null);
    setCurrentDraw(null);
  }, [isDrawing, currentDraw, addSegment, currentPageIndex, isPanning, saveState, setDrawing, applyMagneticSnap, pan, setPan]);
  
  // Wheel for scrolling (vertical pan) and Ctrl+wheel for zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      useVisualEditorState.getState().setZoom(zoom + delta);
    } else {
      // Regular scroll - pan vertically
      e.preventDefault();
      const newPan = { x: pan.x, y: pan.y - e.deltaY };
      const snapped = applyMagneticSnap(newPan);
      setPan(snapped);
    }
  }, [zoom, pan, applyMagneticSnap, setPan]);
  
  if (!currentPage) {
    return (
      <div className={cn('flex items-center justify-center bg-muted/30 rounded-lg', className)}>
        <p className="text-muted-foreground text-sm">Add an image to start editing</p>
      </div>
    );
  }
  
  if (!imageLoaded) {
    return (
      <div className={cn('flex items-center justify-center bg-muted/30', className)}>
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }
  
  return (
    <div
      ref={containerRef}
      className={cn(
        'relative bg-black/90 overflow-hidden select-none',
        isDrawing && 'cursor-crosshair',
        isPanning && 'cursor-grabbing',
        className
      )}
      onWheel={handleWheel}
    >
      <div
        className="absolute"
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
          left: pan.x,
          top: pan.y,
        }}
      >
        {/* Image - maintains aspect ratio */}
        <img
          id="visual-editor-image"
          src={currentPage.data}
          alt=""
          className="select-none pointer-events-none block flex-shrink-0"
          style={{
            width: imageDisplaySize.width || 'auto',
            height: imageDisplaySize.height || 'auto',
            objectFit: 'fill', // Use fill since we calculated exact dimensions
            maxWidth: 'none',
            maxHeight: 'none',
            minWidth: 0,
            minHeight: 0,
          }}
          draggable={false}
        />
        
        {/* Drawing overlay - captures pointer events for drawing */}
        <div
          className="absolute inset-0"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ touchAction: 'none' }}
        >
          {/* Existing segments */}
          {currentPage.segments.map((segment) => {
            if (segment.isHidden) return null;
            
            return (
              <SegmentBox
                key={segment.id}
                segment={segment}
                isSelected={selectedSegmentIds.has(segment.id)}
                isPlaying={playbackTime >= segment.startTime && playbackTime < segment.endTime}
              />
            );
          })}
          
          {/* Current drawing preview */}
          {currentDraw && (
            <div
              className="absolute border-2 border-dashed border-blue-500 bg-blue-500/20 pointer-events-none"
              style={{
                left: `${currentDraw.x}%`,
                top: `${currentDraw.y}%`,
                width: `${currentDraw.width}%`,
                height: `${currentDraw.height}%`,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
});

ImageCanvas.displayName = 'ImageCanvas';

// Magnetic snap threshold in percentage (relative to image)
const SEGMENT_SNAP_THRESHOLD_PERCENT = 1.5; // ~1.5% of image dimension

// Interactive segment box with drag and resize
interface SegmentBoxProps {
  segment: VisualSegment;
  isSelected: boolean;
  isPlaying: boolean;
}

const SegmentBox = memo<SegmentBoxProps>(({ segment, isSelected, isPlaying }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<'top' | 'bottom' | 'left' | 'right' | null>(null);
  const [snappedEdges, setSnappedEdges] = useState<{ left: boolean; right: boolean; top: boolean }>({ left: false, right: false, top: false });
  const dragDataRef = useRef<{
    startX: number;
    startY: number;
    region: Region;
  } | null>(null);
  
  const updateSegment = useVisualEditorState((s) => s.updateSegment);
  const selectSegment = useVisualEditorState((s) => s.selectSegment);
  const { saveState } = useUndoRedo();
  
  // Magnetic snap function for segment edges - snaps to LEFT, RIGHT, TOP but NOT BOTTOM
  const applySegmentSnap = useCallback((region: Region): { region: Region; snapped: { left: boolean; right: boolean; top: boolean } } => {
    let { x, y, width, height } = region;
    const snapped = { left: false, right: false, top: false };
    
    // Snap LEFT edge to 0
    if (Math.abs(x) < SEGMENT_SNAP_THRESHOLD_PERCENT) {
      x = 0;
      snapped.left = true;
    }
    
    // Snap RIGHT edge to 100
    const rightEdge = x + width;
    if (Math.abs(100 - rightEdge) < SEGMENT_SNAP_THRESHOLD_PERCENT) {
      x = 100 - width;
      snapped.right = true;
    }
    
    // Snap TOP edge to 0
    if (Math.abs(y) < SEGMENT_SNAP_THRESHOLD_PERCENT) {
      y = 0;
      snapped.top = true;
    }
    
    // NO snapping for bottom edge (intentionally omitted)
    
    // Ensure bounds
    x = Math.max(0, Math.min(100 - width, x));
    y = Math.max(0, Math.min(100 - height, y));
    
    return { region: { x, y, width, height }, snapped };
  }, []);
  
  // Handle segment click/selection
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (e.ctrlKey || e.metaKey) {
      selectSegment(segment.id, 'toggle');
    } else if (e.shiftKey) {
      selectSegment(segment.id, 'range');
    } else {
      selectSegment(segment.id, 'single');
    }
  }, [segment.id, selectSegment]);
  
  // Handle drag start
  const handleDragStart = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Select if not selected
    if (!isSelected) {
      selectSegment(segment.id, 'single');
    }
    
    saveState();
    setIsDragging(true);
    dragDataRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      region: { ...segment.region },
    };
    
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [segment, isSelected, selectSegment, saveState]);
  
  // Handle drag move with magnetic snapping
  const handleDragMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !dragDataRef.current) return;
    
    const imageEl = document.getElementById('visual-editor-image');
    if (!imageEl) return;
    
    const rect = imageEl.getBoundingClientRect();
    const dx = ((e.clientX - dragDataRef.current.startX) / rect.width) * 100;
    const dy = ((e.clientY - dragDataRef.current.startY) / rect.height) * 100;
    
    const rawX = dragDataRef.current.region.x + dx;
    const rawY = dragDataRef.current.region.y + dy;
    
    // Apply magnetic snapping
    const { region: snappedRegion, snapped } = applySegmentSnap({
      x: rawX,
      y: rawY,
      width: segment.region.width,
      height: segment.region.height,
    });
    
    setSnappedEdges(snapped);
    
    updateSegment(segment.id, {
      region: snappedRegion,
    });
  }, [isDragging, segment, updateSegment, applySegmentSnap]);
  
  // Handle drag end
  const handleDragEnd = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setIsDragging(false);
    setSnappedEdges({ left: false, right: false, top: false });
    dragDataRef.current = null;
  }, []);
  
  // Handle resize start - now supports all 4 edges
  const handleResizeStart = useCallback((edge: 'top' | 'bottom' | 'left' | 'right', e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    saveState();
    setIsResizing(edge);
    dragDataRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      region: { ...segment.region },
    };
    
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [segment.region, saveState]);
  
  // Handle resize move with magnetic snapping
  const handleResizeMove = useCallback((e: React.PointerEvent) => {
    if (!isResizing || !dragDataRef.current) return;
    
    const imageEl = document.getElementById('visual-editor-image');
    if (!imageEl) return;
    
    const rect = imageEl.getBoundingClientRect();
    const dx = ((e.clientX - dragDataRef.current.startX) / rect.width) * 100;
    const dy = ((e.clientY - dragDataRef.current.startY) / rect.height) * 100;
    
    let newRegion = { ...segment.region };
    const newSnapped = { left: false, right: false, top: false };
    
    if (isResizing === 'top') {
      let newY = dragDataRef.current.region.y + dy;
      // Snap top edge to 0
      if (Math.abs(newY) < SEGMENT_SNAP_THRESHOLD_PERCENT) {
        newY = 0;
        newSnapped.top = true;
      }
      newY = Math.max(0, Math.min(dragDataRef.current.region.y + dragDataRef.current.region.height - 5, newY));
      const newHeight = dragDataRef.current.region.height - (newY - dragDataRef.current.region.y);
      newRegion = { ...newRegion, y: newY, height: newHeight };
    } else if (isResizing === 'bottom') {
      // No snapping for bottom
      const newHeight = Math.max(5, Math.min(100 - dragDataRef.current.region.y, dragDataRef.current.region.height + dy));
      newRegion = { ...newRegion, height: newHeight };
    } else if (isResizing === 'left') {
      let newX = dragDataRef.current.region.x + dx;
      // Snap left edge to 0
      if (Math.abs(newX) < SEGMENT_SNAP_THRESHOLD_PERCENT) {
        newX = 0;
        newSnapped.left = true;
      }
      newX = Math.max(0, Math.min(dragDataRef.current.region.x + dragDataRef.current.region.width - 5, newX));
      const newWidth = dragDataRef.current.region.width - (newX - dragDataRef.current.region.x);
      newRegion = { ...newRegion, x: newX, width: newWidth };
    } else if (isResizing === 'right') {
      let newWidth = dragDataRef.current.region.width + dx;
      const rightEdge = dragDataRef.current.region.x + newWidth;
      // Snap right edge to 100
      if (Math.abs(100 - rightEdge) < SEGMENT_SNAP_THRESHOLD_PERCENT) {
        newWidth = 100 - dragDataRef.current.region.x;
        newSnapped.right = true;
      }
      newWidth = Math.max(5, Math.min(100 - dragDataRef.current.region.x, newWidth));
      newRegion = { ...newRegion, width: newWidth };
    }
    
    setSnappedEdges(newSnapped);
    updateSegment(segment.id, { region: newRegion });
  }, [isResizing, segment, updateSegment]);
  
  // Handle resize end
  const handleResizeEnd = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setIsResizing(null);
    setSnappedEdges({ left: false, right: false, top: false });
    dragDataRef.current = null;
  }, []);
  
  const borderColor = isPlaying ? 'rgb(239, 68, 68)' : isSelected ? 'rgb(250, 204, 21)' : 'rgb(34, 197, 94)';
  const bgColor = isPlaying ? 'rgba(239, 68, 68, 0.2)' : isSelected ? 'rgba(250, 204, 21, 0.15)' : 'rgba(34, 197, 94, 0.1)';
  
  return (
    <div
      className={cn(
        'absolute border-2 transition-colors',
        isDragging && 'cursor-grabbing',
        !isDragging && 'cursor-grab'
      )}
      style={{
        left: `${segment.region.x}%`,
        top: `${segment.region.y}%`,
        width: `${segment.region.width}%`,
        height: `${segment.region.height}%`,
        borderColor,
        backgroundColor: bgColor,
      }}
      onClick={handleClick}
      onPointerDown={handleDragStart}
      onPointerMove={handleDragMove}
      onPointerUp={handleDragEnd}
      onPointerCancel={handleDragEnd}
    >
      {/* Snap indicator lines */}
      {snappedEdges.left && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500 animate-pulse" />
      )}
      {snappedEdges.right && (
        <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-blue-500 animate-pulse" />
      )}
      {snappedEdges.top && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500 animate-pulse" />
      )}
      
      {/* Top resize handle - with snap */}
      <div
        className="absolute -top-1 left-2 right-2 h-3 cursor-ns-resize hover:bg-primary/30 z-10"
        onPointerDown={(e) => handleResizeStart('top', e)}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeEnd}
        onPointerCancel={handleResizeEnd}
      />
      
      {/* Bottom resize handle - NO snap */}
      <div
        className="absolute -bottom-1 left-2 right-2 h-3 cursor-ns-resize hover:bg-primary/30 z-10"
        onPointerDown={(e) => handleResizeStart('bottom', e)}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeEnd}
        onPointerCancel={handleResizeEnd}
      />
      
      {/* Left resize handle - with snap */}
      <div
        className="absolute -left-1 top-2 bottom-2 w-3 cursor-ew-resize hover:bg-primary/30 z-10"
        onPointerDown={(e) => handleResizeStart('left', e)}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeEnd}
        onPointerCancel={handleResizeEnd}
      />
      
      {/* Right resize handle - with snap */}
      <div
        className="absolute -right-1 top-2 bottom-2 w-3 cursor-ew-resize hover:bg-primary/30 z-10"
        onPointerDown={(e) => handleResizeStart('right', e)}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeEnd}
        onPointerCancel={handleResizeEnd}
      />
      
      {/* Label badge */}
      <div
        className="absolute top-0 left-0 px-1.5 py-0.5 text-[10px] font-medium text-black max-w-full truncate"
        style={{ backgroundColor: borderColor }}
      >
        {segment.label}
      </div>
    </div>
  );
});

SegmentBox.displayName = 'SegmentBox';
