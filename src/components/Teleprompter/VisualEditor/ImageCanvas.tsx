import React, { memo, useRef, useEffect, useState, useCallback } from 'react';
import { useVisualEditorState, VisualSegment } from './useVisualEditorState';
import { Region } from '@/types/teleprompter.types';
import { cn } from '@/lib/utils';

interface ImageCanvasProps {
  className?: string;
}

export const ImageCanvas = memo<ImageCanvasProps>(({ className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  const [imageLoaded, setImageLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDraw, setCurrentDraw] = useState<Region | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number; panX: number; panY: number } | null>(null);
  
  const currentPage = useVisualEditorState((s) => s.getCurrentPage());
  const zoom = useVisualEditorState((s) => s.zoom);
  const pan = useVisualEditorState((s) => s.pan);
  const isDrawing = useVisualEditorState((s) => s.isDrawing);
  const selectedSegmentIds = useVisualEditorState((s) => s.selectedSegmentIds);
  const playbackTime = useVisualEditorState((s) => s.playbackTime);
  
  const addSegment = useVisualEditorState((s) => s.addSegment);
  const selectSegment = useVisualEditorState((s) => s.selectSegment);
  const deselectAll = useVisualEditorState((s) => s.deselectAll);
  const setPan = useVisualEditorState((s) => s.setPan);
  const currentPageIndex = useVisualEditorState((s) => s.currentPageIndex);
  
  // Load image when page changes
  useEffect(() => {
    if (!currentPage?.data) {
      setImageLoaded(false);
      return;
    }
    
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
    img.src = currentPage.data;
  }, [currentPage?.data]);
  
  // Resize canvas
  useEffect(() => {
    if (!containerRef.current || !imageRef.current || !imageLoaded) return;
    
    const container = containerRef.current;
    const img = imageRef.current;
    
    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      
      const imgAspect = img.width / img.height;
      const containerAspect = rect.width / rect.height;
      
      let w: number, h: number;
      if (imgAspect > containerAspect) {
        w = rect.width;
        h = rect.width / imgAspect;
      } else {
        h = rect.height;
        w = rect.height * imgAspect;
      }
      
      setCanvasSize({ width: w, height: h });
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [imageLoaded]);
  
  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;
    
    if (!canvas || !ctx || !img || !imageLoaded || !currentPage) return;
    
    const { width, height } = canvasSize;
    if (width === 0 || height === 0) return;
    
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr * zoom;
    canvas.height = height * dpr * zoom;
    canvas.style.width = `${width * zoom}px`;
    canvas.style.height = `${height * zoom}px`;
    ctx.scale(dpr * zoom, dpr * zoom);
    
    // Clear and draw image
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    
    // Draw segments
    currentPage.segments.forEach((segment) => {
      if (segment.isHidden) return;
      
      const x = (segment.region.x / 100) * width;
      const y = (segment.region.y / 100) * height;
      const w = (segment.region.width / 100) * width;
      const h = (segment.region.height / 100) * height;
      
      const isSelected = selectedSegmentIds.has(segment.id);
      const isPlaying = playbackTime >= segment.startTime && playbackTime < segment.endTime;
      
      // Border
      ctx.strokeStyle = isPlaying ? '#ef4444' : isSelected ? '#fbbf24' : '#22c55e';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeRect(x, y, w, h);
      
      // Fill
      ctx.fillStyle = isPlaying
        ? 'rgba(239, 68, 68, 0.2)'
        : isSelected
        ? 'rgba(251, 191, 36, 0.15)'
        : 'rgba(34, 197, 94, 0.1)';
      ctx.fillRect(x, y, w, h);
      
      // Label badge
      ctx.fillStyle = isPlaying ? '#ef4444' : isSelected ? '#fbbf24' : '#22c55e';
      const labelHeight = 20;
      ctx.fillRect(x, y, Math.min(w, 100), labelHeight);
      
      ctx.fillStyle = '#000';
      ctx.font = '11px Inter, sans-serif';
      ctx.fillText(segment.label.substring(0, 12), x + 4, y + 14);
    });
    
    // Draw current drawing region
    if (currentDraw) {
      const x = (currentDraw.x / 100) * width;
      const y = (currentDraw.y / 100) * height;
      const w = (currentDraw.width / 100) * width;
      const h = (currentDraw.height / 100) * height;
      
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
      
      ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
      ctx.fillRect(x, y, w, h);
    }
  }, [canvasSize, currentPage, zoom, selectedSegmentIds, playbackTime, currentDraw, imageLoaded]);
  
  // Get percentage coords from mouse event
  const getPercentCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    return {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    };
  }, []);
  
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
  
  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // Alt+drag for panning
    if (e.altKey && zoom > 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y });
      return;
    }
    
    const coords = getPercentCoords(e);
    
    if (isDrawing) {
      setDrawStart(coords);
      return;
    }
    
    // Check if clicking on segment
    const segment = findSegmentAtCoords(coords);
    
    if (segment) {
      if (e.ctrlKey || e.metaKey) {
        selectSegment(segment.id, 'toggle');
      } else if (e.shiftKey) {
        selectSegment(segment.id, 'range');
      } else {
        selectSegment(segment.id, 'single');
      }
    } else {
      deselectAll();
    }
  }, [isDrawing, zoom, pan, getPercentCoords, findSegmentAtCoords, selectSegment, deselectAll]);
  
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning && panStart) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setPan({ x: panStart.panX + dx, y: panStart.panY + dy });
      return;
    }
    
    if (!isDrawing || !drawStart) return;
    
    const coords = getPercentCoords(e);
    const x = Math.min(drawStart.x, coords.x);
    const y = Math.min(drawStart.y, coords.y);
    const width = Math.abs(coords.x - drawStart.x);
    const height = Math.abs(coords.y - drawStart.y);
    
    setCurrentDraw({ x, y, width, height });
  }, [isDrawing, drawStart, isPanning, panStart, getPercentCoords, setPan]);
  
  const handleMouseUp = useCallback(() => {
    if (isPanning) {
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
      addSegment(currentPageIndex, currentDraw);
    }
    
    setDrawStart(null);
    setCurrentDraw(null);
  }, [isDrawing, currentDraw, addSegment, currentPageIndex, isPanning]);
  
  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      useVisualEditorState.getState().setZoom(zoom + delta);
    }
  }, [zoom]);
  
  if (!currentPage) {
    return (
      <div className={cn('flex items-center justify-center bg-muted/50 rounded-lg', className)}>
        <p className="text-muted-foreground text-sm">Add an image to start editing</p>
      </div>
    );
  }
  
  if (!imageLoaded) {
    return (
      <div className={cn('flex items-center justify-center bg-muted/50', className)}>
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }
  
  return (
    <div
      ref={containerRef}
      className={cn(
        'flex items-center justify-center bg-black/80 overflow-hidden relative',
        isDrawing && 'cursor-crosshair',
        isPanning && 'cursor-grabbing',
        className
      )}
      style={{
        transform: zoom > 1 ? `translate(${pan.x}px, ${pan.y}px)` : undefined,
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="max-w-full max-h-full"
      />
    </div>
  );
});

ImageCanvas.displayName = 'ImageCanvas';
