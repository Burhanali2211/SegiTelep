import React, { memo, useRef, useEffect, useState, useCallback } from 'react';
import { Region } from '@/types/teleprompter.types';
import { cn } from '@/lib/utils';

interface RegionSelectorProps {
  imageSrc: string;
  regions: Array<Region & { id: string; name: string }>;
  selectedRegionId: string | null;
  onRegionCreate: (region: Region) => void;
  onRegionSelect: (id: string | null) => void;
  onRegionUpdate: (id: string, region: Region) => void;
  isDrawing: boolean;
  className?: string;
}

export const RegionSelector = memo<RegionSelectorProps>(({
  imageSrc,
  regions,
  selectedRegionId,
  onRegionCreate,
  onRegionSelect,
  onRegionUpdate,
  isDrawing,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  const [imageLoaded, setImageLoaded] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDraw, setCurrentDraw] = useState<Region | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Load image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Resize canvas to fit container while maintaining aspect ratio
  useEffect(() => {
    if (!containerRef.current || !imageRef.current || !imageLoaded) return;

    const container = containerRef.current;
    const img = imageRef.current;
    
    const updateSize = () => {
      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;
      
      if (containerWidth === 0 || containerHeight === 0) return;
      
      const imgAspect = img.width / img.height;
      const containerAspect = containerWidth / containerHeight;
      
      let canvasWidth: number;
      let canvasHeight: number;
      
      if (imgAspect > containerAspect) {
        canvasWidth = containerWidth;
        canvasHeight = containerWidth / imgAspect;
      } else {
        canvasHeight = containerHeight;
        canvasWidth = containerHeight * imgAspect;
      }
      
      setCanvasSize({ width: canvasWidth, height: canvasHeight });
    };
    
    updateSize();
    
    // Also update on window resize
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [imageLoaded]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;
    
    if (!canvas || !ctx || !img || !imageLoaded) return;
    
    const { width, height } = canvasSize;
    if (width === 0 || height === 0) return;
    
    // Set canvas size
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);
    
    // Draw image
    ctx.drawImage(img, 0, 0, width, height);
    
    // Draw existing regions
    regions.forEach((region) => {
      const x = (region.x / 100) * width;
      const y = (region.y / 100) * height;
      const w = (region.width / 100) * width;
      const h = (region.height / 100) * height;
      
      const isSelected = region.id === selectedRegionId;
      
      ctx.strokeStyle = isSelected ? '#fbbf24' : '#22c55e';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeRect(x, y, w, h);
      
      // Draw semi-transparent fill
      ctx.fillStyle = isSelected ? 'rgba(251, 191, 36, 0.15)' : 'rgba(34, 197, 94, 0.1)';
      ctx.fillRect(x, y, w, h);
      
      // Draw label
      ctx.fillStyle = isSelected ? '#fbbf24' : '#22c55e';
      ctx.font = '12px Inter';
      ctx.fillText(region.name, x + 4, y + 16);
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
  }, [canvasSize, regions, selectedRegionId, currentDraw, imageLoaded]);

  // Get percentage coordinates from mouse event
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

  // Handle mouse down
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) {
      // Check if clicking on existing region
      const coords = getPercentCoords(e);
      const clickedRegion = regions.find((region) => {
        return (
          coords.x >= region.x &&
          coords.x <= region.x + region.width &&
          coords.y >= region.y &&
          coords.y <= region.y + region.height
        );
      });
      
      onRegionSelect(clickedRegion?.id || null);
      return;
    }
    
    const coords = getPercentCoords(e);
    setDrawStart(coords);
  }, [isDrawing, getPercentCoords, regions, onRegionSelect]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawStart) return;
    
    const coords = getPercentCoords(e);
    
    const x = Math.min(drawStart.x, coords.x);
    const y = Math.min(drawStart.y, coords.y);
    const width = Math.abs(coords.x - drawStart.x);
    const height = Math.abs(coords.y - drawStart.y);
    
    setCurrentDraw({ x, y, width, height });
  }, [isDrawing, drawStart, getPercentCoords]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !currentDraw) {
      setDrawStart(null);
      setCurrentDraw(null);
      return;
    }
    
    // Minimum region size (5% of image)
    if (currentDraw.width >= 5 && currentDraw.height >= 5) {
      onRegionCreate(currentDraw);
    }
    
    setDrawStart(null);
    setCurrentDraw(null);
  }, [isDrawing, currentDraw, onRegionCreate]);

  if (!imageLoaded) {
    return (
      <div className={cn('flex items-center justify-center bg-muted', className)}>
        <div className="text-muted-foreground">Loading image...</div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn(
        'flex items-center justify-center bg-black/50 overflow-hidden',
        isDrawing && 'cursor-crosshair',
        className
      )}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="max-w-full max-h-full"
      />
    </div>
  );
});

RegionSelector.displayName = 'RegionSelector';

export default RegionSelector;
