import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useVisualEditorState, formatTime, VisualSegment, ImagePage } from './useVisualEditorState';
import { Button } from '@/components/ui/button';
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
  Timer,
} from 'lucide-react';

interface FullscreenPlayerProps {
  onClose: () => void;
}

type CountdownState = 'idle' | 'countdown' | 'playing';

export const FullscreenPlayer = memo<FullscreenPlayerProps>(({ onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const currentSegmentIndexRef = useRef<number>(0);
  
  const [playbackState, setPlaybackState] = useState<CountdownState>('idle');
  const [countdownValue, setCountdownValue] = useState(3);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [countdownEnabled, setCountdownEnabled] = useState(true);
  const [countdownDuration, setCountdownDuration] = useState(3);
  
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
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
  
  // Calculate total duration from visible segments and audio
  const totalDuration = React.useMemo(() => {
    // Filter to visible segments only
    const visibleSegments = allSegments.filter(s => !s.isHidden);
    
    // No segments = no duration
    if (visibleSegments.length === 0) return 0;
    
    // Get the last segment end time
    const lastSegmentEndTime = Math.max(...visibleSegments.map(s => s.endTime));
    
    // Use audio duration only if it's longer than segments
    if (audioFile?.duration && audioFile.duration > lastSegmentEndTime) {
      return audioFile.duration;
    }
    
    return lastSegmentEndTime;
  }, [allSegments, audioFile?.duration]);
  
  const currentSegment = allSegments[currentSegmentIndex];
  
  // Draw current segment on canvas
  const drawSegment = useCallback((segment: typeof allSegments[0] | undefined) => {
    const canvas = canvasRef.current;
    if (!canvas || !segment) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    img.onload = () => {
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      
      const regionX = (segment.region.x / 100) * img.width;
      const regionY = (segment.region.y / 100) * img.height;
      const regionW = (segment.region.width / 100) * img.width;
      const regionH = (segment.region.height / 100) * img.height;
      
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      
      const scale = Math.min(canvasWidth / regionW, canvasHeight / regionH);
      const drawW = regionW * scale;
      const drawH = regionH * scale;
      const drawX = (canvasWidth - drawW) / 2;
      const drawY = (canvasHeight - drawH) / 2;
      
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
      canvasRef.current.height = container.clientHeight - 80;
      
      if (currentSegment) {
        drawSegment(currentSegment);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentSegment, drawSegment]);
  
  // Start countdown
  const startCountdown = useCallback(() => {
    if (!countdownEnabled) {
      setPlaybackState('playing');
      return;
    }
    
    setPlaybackState('countdown');
    setCountdownValue(countdownDuration);
    
    let count = countdownDuration;
    countdownIntervalRef.current = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
        setPlaybackState('playing');
      } else {
        setCountdownValue(count);
      }
    }, 1000);
  }, [countdownEnabled, countdownDuration]);
  
  // Cancel countdown
  const cancelCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    setPlaybackState('idle');
  }, []);
  
  // Main playback loop - Audio drives timing when available
  useEffect(() => {
    if (playbackState !== 'playing') return;
    
    const audio = audioRef.current;
    const hasAudio = audio && audioFile;
    
    // Start audio playback
    if (hasAudio) {
      audio.currentTime = pausedTimeRef.current;
      audio.play().catch(console.error);
    } else {
      // No audio - track start time for internal timer
      startTimeRef.current = performance.now();
    }
    
    const animate = () => {
      // Get time from audio if available, otherwise use internal timer
      let elapsed: number;
      if (hasAudio) {
        elapsed = audio.currentTime;
      } else {
        // No audio - use performance timer
        elapsed = ((performance.now() - startTimeRef.current) / 1000) + pausedTimeRef.current;
      }
      
      setCurrentTime(elapsed);
      
      // Check if playback complete
      if (elapsed >= totalDuration) {
        setPlaybackState('idle');
        pausedTimeRef.current = 0;
        setCurrentTime(0);
        setCurrentSegmentIndex(0);
        currentSegmentIndexRef.current = 0;
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
        drawSegment(allSegments[0]);
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
      if (segIndex === -1) {
        for (let i = allSegments.length - 1; i >= 0; i--) {
          if (elapsed >= allSegments[i].startTime) {
            segIndex = i;
            break;
          }
        }
      }
      
      // Update segment if changed (use ref to avoid stale closure)
      if (segIndex !== -1 && segIndex !== currentSegmentIndexRef.current) {
        currentSegmentIndexRef.current = segIndex;
        setCurrentSegmentIndex(segIndex);
        drawSegment(allSegments[segIndex]);
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [playbackState, allSegments, totalDuration, drawSegment, audioFile]);
  
  // Pause when state changes to idle
  useEffect(() => {
    if (playbackState === 'idle' && audioRef.current) {
      audioRef.current.pause();
    }
  }, [playbackState]);
  
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
    
    if (playbackState === 'playing') {
      hideTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    }
  }, [playbackState]);
  
  const handleMouseMove = useCallback(() => {
    showControls();
  }, [showControls]);
  
  // Playback controls
  const togglePlay = useCallback(() => {
    if (playbackState === 'playing') {
      // Pause - save current time
      pausedTimeRef.current = currentTime;
      setPlaybackState('idle');
      if (audioRef.current) {
        audioRef.current.pause();
      }
    } else if (playbackState === 'countdown') {
      cancelCountdown();
    } else {
      if (currentTime >= totalDuration) {
        pausedTimeRef.current = 0;
        setCurrentTime(0);
        setCurrentSegmentIndex(0);
        currentSegmentIndexRef.current = 0;
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
        }
      } else {
        pausedTimeRef.current = currentTime;
      }
      startCountdown();
    }
  }, [playbackState, currentTime, totalDuration, startCountdown, cancelCountdown]);
  
  const skipPrev = useCallback(() => {
    const newIndex = Math.max(0, currentSegmentIndex - 1);
    currentSegmentIndexRef.current = newIndex;
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
    currentSegmentIndexRef.current = newIndex;
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
    let segIndex = -1;
    for (let i = 0; i < allSegments.length; i++) {
      if (newTime >= allSegments[i].startTime && newTime < allSegments[i].endTime) {
        segIndex = i;
        break;
      }
    }
    
    if (segIndex === -1) {
      for (let i = allSegments.length - 1; i >= 0; i--) {
        if (newTime >= allSegments[i].startTime) {
          segIndex = i;
          break;
        }
      }
    }
    
    if (segIndex !== -1) {
      currentSegmentIndexRef.current = segIndex;
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
        if (playbackState === 'countdown') {
          cancelCountdown();
        } else {
          onClose();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, skipPrev, skipNext, toggleFullscreen, toggleMute, onClose, playbackState, cancelCountdown]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);
  
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
        <audio 
          ref={audioRef} 
          src={audioFile.data} 
          preload="auto"
          muted={isMuted}
        />
      )}
      
      {/* Countdown Overlay */}
      {playbackState === 'countdown' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="text-center">
            <div className="text-[200px] font-bold text-white leading-none animate-pulse">
              {countdownValue}
            </div>
            <p className="text-white/60 text-xl mt-4">Starting in...</p>
            <Button
              variant="ghost"
              className="mt-6 text-white/60 hover:text-white"
              onClick={cancelCountdown}
            >
              Cancel (Esc)
            </Button>
          </div>
        </div>
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
          controlsVisible && playbackState !== 'countdown' ? 'opacity-100' : 'opacity-0'
        )}>
          <div className="bg-black/70 text-white px-3 py-2 rounded text-sm">
            <p className="font-medium">{currentSegment?.label}</p>
            <p className="text-xs text-white/60">
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
            controlsVisible && playbackState !== 'countdown' ? 'opacity-100' : 'opacity-0'
          )}
          onClick={onClose}
        >
          <X size={20} />
        </Button>
      </div>
      
      {/* Controls */}
      <div className={cn(
        'bg-black/90 p-4 transition-opacity duration-300',
        controlsVisible && playbackState !== 'countdown' ? 'opacity-100' : 'opacity-0'
      )}>
        {/* Progress bar */}
        <div
          className="h-1.5 bg-white/20 rounded cursor-pointer mb-4 relative group"
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
              className="absolute top-0 bottom-0 w-0.5 bg-white/40"
              style={{ left: `${(seg.startTime / totalDuration) * 100}%` }}
            />
          ))}
        </div>
        
        {/* Time and controls */}
        <div className="flex items-center justify-between">
          <div className="text-white text-sm font-mono min-w-[100px]">
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={skipPrev}
              disabled={playbackState === 'countdown'}
            >
              <SkipBack size={20} />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 h-12 w-12"
              onClick={togglePlay}
            >
              {playbackState === 'playing' ? (
                <Pause size={28} />
              ) : playbackState === 'countdown' ? (
                <X size={28} />
              ) : (
                <Play size={28} />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={skipNext}
              disabled={playbackState === 'countdown'}
            >
              <SkipForward size={20} />
            </Button>
          </div>
          
          <div className="flex items-center gap-2 min-w-[100px] justify-end">
            {/* Countdown toggle */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'text-white hover:bg-white/20',
                countdownEnabled && 'text-primary'
              )}
              onClick={() => setCountdownEnabled(!countdownEnabled)}
              disabled={playbackState !== 'idle'}
            >
              <Timer size={18} />
            </Button>
            
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
