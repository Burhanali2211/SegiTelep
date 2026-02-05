import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useVisualEditorState, formatTime, VisualSegment, ImagePage } from './useVisualEditorState';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
  Maximize,
  Minimize,
} from 'lucide-react';

interface FullscreenPlayerProps {
  onClose: () => void;
}

export const FullscreenPlayer = memo<FullscreenPlayerProps>(({ onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const pages = useVisualEditorState((s) => s.pages);
  const audioFile = useVisualEditorState((s) => s.audioFile);
  
  // Get all segments ordered by start time
  const allSegments = React.useMemo(() => {
    return pages
      .flatMap((page, pageIndex) =>
        page.segments
          .filter(s => !s.isHidden)
          .map(s => ({ ...s, pageIndex, pageData: page.data }))
      )
      .sort((a, b) => a.startTime - b.startTime);
  }, [pages]);
  
  const totalDuration = React.useMemo(() => {
    if (allSegments.length === 0) return 0;
    return Math.max(...allSegments.map(s => s.endTime));
  }, [allSegments]);
  
  const currentSegment = allSegments[currentSegmentIndex];
  
  // Draw current segment on canvas
  const drawSegment = useCallback((segment: typeof allSegments[0] | undefined) => {
    const canvas = canvasRef.current;
    if (!canvas || !segment) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    img.onload = () => {
      // Canvas size
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      
      // Region in percentage
      const regionX = (segment.region.x / 100) * img.width;
      const regionY = (segment.region.y / 100) * img.height;
      const regionW = (segment.region.width / 100) * img.width;
      const regionH = (segment.region.height / 100) * img.height;
      
      // Clear and fill black
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      
      // Calculate aspect-fit scaling
      const scale = Math.min(canvasWidth / regionW, canvasHeight / regionH);
      const drawW = regionW * scale;
      const drawH = regionH * scale;
      const drawX = (canvasWidth - drawW) / 2;
      const drawY = (canvasHeight - drawH) / 2;
      
      // Draw the cropped region
      ctx.drawImage(
        img,
        regionX, regionY, regionW, regionH,
        drawX, drawY, drawW, drawH
      );
    };
    img.src = segment.pageData;
  }, []);
  
  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      
      const container = containerRef.current;
      canvasRef.current.width = container.clientWidth;
      canvasRef.current.height = container.clientHeight - 80; // Account for controls
      
      if (currentSegment) {
        drawSegment(currentSegment);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentSegment, drawSegment]);
  
  // Track current segment index in a ref to avoid dependency issues
  const currentSegmentIndexRef = useRef(currentSegmentIndex);
  useEffect(() => {
    currentSegmentIndexRef.current = currentSegmentIndex;
  }, [currentSegmentIndex]);
  
  // Animation loop - NOTE: currentSegmentIndex is NOT in dependencies to prevent restart
  useEffect(() => {
    if (!isPlaying) return;
    
    const animate = () => {
      const elapsed = (performance.now() - startTimeRef.current) / 1000 + pausedTimeRef.current;
      setCurrentTime(elapsed);
      
      // Check if playback complete
      if (elapsed >= totalDuration) {
        setIsPlaying(false);
        pausedTimeRef.current = 0;
        setCurrentTime(0);
        setCurrentSegmentIndex(0);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        return;
      }
      
      // Find current segment based on time
      let segIndex = -1;
      for (let i = 0; i < allSegments.length; i++) {
        const seg = allSegments[i];
        if (elapsed >= seg.startTime && elapsed < seg.endTime) {
          segIndex = i;
          break;
        }
      }
      
      // If no exact match, find the segment that should be showing
      // (handles gaps between segments - show the previous segment until next starts)
      if (segIndex === -1) {
        for (let i = allSegments.length - 1; i >= 0; i--) {
          if (elapsed >= allSegments[i].startTime) {
            segIndex = i;
            break;
          }
        }
      }
      
      // Update segment if changed
      if (segIndex !== -1 && segIndex !== currentSegmentIndexRef.current) {
        currentSegmentIndexRef.current = segIndex;
        setCurrentSegmentIndex(segIndex);
        drawSegment(allSegments[segIndex]);
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    startTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, allSegments, totalDuration, drawSegment]);
  
  // Sync audio with playback
  useEffect(() => {
    if (!audioRef.current || !audioFile) return;
    
    if (isPlaying) {
      audioRef.current.currentTime = currentTime;
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, audioFile]);
  
  // Draw initial segment
  useEffect(() => {
    if (currentSegment) {
      drawSegment(currentSegment);
    }
  }, [currentSegment, drawSegment]);
  
  // Enter fullscreen on mount
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.requestFullscreen?.().catch(() => {});
    }
    
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (!document.fullscreenElement) {
        // If exited fullscreen, close the player
        // onClose();
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);
  
  // Auto-hide controls
  const showControls = useCallback(() => {
    setControlsVisible(true);
    
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    
    if (isPlaying) {
      hideTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    }
  }, [isPlaying]);
  
  const handleMouseMove = useCallback(() => {
    showControls();
  }, [showControls]);
  
  // Playback controls
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pausedTimeRef.current = currentTime;
      setIsPlaying(false);
    } else {
      if (currentTime >= totalDuration) {
        pausedTimeRef.current = 0;
        setCurrentTime(0);
        setCurrentSegmentIndex(0);
      }
      setIsPlaying(true);
    }
  }, [isPlaying, currentTime, totalDuration]);
  
  const skipPrev = useCallback(() => {
    const newIndex = Math.max(0, currentSegmentIndex - 1);
    setCurrentSegmentIndex(newIndex);
    const segment = allSegments[newIndex];
    if (segment) {
      pausedTimeRef.current = segment.startTime;
      setCurrentTime(segment.startTime);
      drawSegment(segment);
      if (audioRef.current) {
        audioRef.current.currentTime = segment.startTime;
      }
    }
  }, [currentSegmentIndex, allSegments, drawSegment]);
  
  const skipNext = useCallback(() => {
    const newIndex = Math.min(allSegments.length - 1, currentSegmentIndex + 1);
    setCurrentSegmentIndex(newIndex);
    const segment = allSegments[newIndex];
    if (segment) {
      pausedTimeRef.current = segment.startTime;
      setCurrentTime(segment.startTime);
      drawSegment(segment);
      if (audioRef.current) {
        audioRef.current.currentTime = segment.startTime;
      }
    }
  }, [currentSegmentIndex, allSegments, drawSegment]);
  
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  }, []);
  
  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  }, [isMuted]);
  
  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * totalDuration;
    
    pausedTimeRef.current = newTime;
    setCurrentTime(newTime);
    
    // Find segment at this time
    const segIndex = allSegments.findIndex(
      s => newTime >= s.startTime && newTime < s.endTime
    );
    if (segIndex !== -1) {
      setCurrentSegmentIndex(segIndex);
      drawSegment(allSegments[segIndex]);
    }
    
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  }, [totalDuration, allSegments, drawSegment]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowLeft' || e.key === 'j') {
        e.preventDefault();
        skipPrev();
      } else if (e.key === 'ArrowRight' || e.key === 'l') {
        e.preventDefault();
        skipNext();
      } else if (e.key === 'f') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'm') {
        e.preventDefault();
        toggleMute();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, skipPrev, skipNext, toggleFullscreen, toggleMute, onClose]);
  
  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;
  
  if (allSegments.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-xl mb-4">No segments to play</p>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex flex-col"
      onMouseMove={handleMouseMove}
    >
      {/* Audio element */}
      {audioFile && (
        <audio ref={audioRef} src={audioFile.data} preload="auto" />
      )}
      
      {/* Canvas */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
        />
        
        {/* Segment info overlay */}
        <div className={cn(
          'absolute top-4 left-4 transition-opacity duration-300',
          controlsVisible ? 'opacity-100' : 'opacity-0'
        )}>
          <div className="bg-black/70 text-white px-3 py-2 rounded text-sm">
            <p className="font-medium">{currentSegment?.label}</p>
            <p className="text-xs text-muted-foreground">
              {currentSegmentIndex + 1} / {allSegments.length}
            </p>
          </div>
        </div>
        
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'absolute top-4 right-4 text-white hover:bg-white/20 transition-opacity duration-300',
            controlsVisible ? 'opacity-100' : 'opacity-0'
          )}
          onClick={onClose}
        >
          <X size={20} />
        </Button>
      </div>
      
      {/* Controls */}
      <div className={cn(
        'bg-black/90 p-4 transition-opacity duration-300',
        controlsVisible ? 'opacity-100' : 'opacity-0'
      )}>
        {/* Progress bar */}
        <div
          className="h-1 bg-muted rounded cursor-pointer mb-4 relative group"
          onClick={handleProgressClick}
        >
          <div
            className="absolute inset-y-0 left-0 bg-primary rounded"
            style={{ width: `${progress}%` }}
          />
          {/* Segment markers */}
          {allSegments.map((seg, i) => (
            <div
              key={seg.id}
              className="absolute top-0 bottom-0 w-0.5 bg-white/30"
              style={{ left: `${(seg.startTime / totalDuration) * 100}%` }}
            />
          ))}
        </div>
        
        {/* Time and controls */}
        <div className="flex items-center justify-between">
          <div className="text-white text-sm font-mono">
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={skipPrev}
            >
              <SkipBack size={20} />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 h-12 w-12"
              onClick={togglePlay}
            >
              {isPlaying ? <Pause size={28} /> : <Play size={28} />}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={skipNext}
            >
              <SkipForward size={20} />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            {audioFile && (
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={toggleMute}
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

FullscreenPlayer.displayName = 'FullscreenPlayer';
