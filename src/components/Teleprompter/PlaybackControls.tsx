import React, { memo, useCallback, useEffect, useState, useRef } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward,
  Square,
  FlipHorizontal,
  Gauge,
  Eye,
  Maximize2,
  Minimize2,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useTeleprompterStore } from '@/store/teleprompterStore';
import { SPEED_PRESETS } from '@/types/teleprompter.types';

interface PlaybackControlsProps {
  className?: string;
  variant?: 'bar' | 'overlay';
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  visible?: boolean;
}

export const PlaybackControls = memo<PlaybackControlsProps>(({
  className,
  variant = 'bar',
  onToggleFullscreen,
  isFullscreen = false,
  visible = true,
}) => {
  const project = useTeleprompterStore((s) => s.project);
  const playback = useTeleprompterStore((s) => s.playback);
  const play = useTeleprompterStore((s) => s.play);
  const pause = useTeleprompterStore((s) => s.pause);
  const stop = useTeleprompterStore((s) => s.stop);
  const nextSegment = useTeleprompterStore((s) => s.nextSegment);
  const prevSegment = useTeleprompterStore((s) => s.prevSegment);
  const setSpeed = useTeleprompterStore((s) => s.setSpeed);
  const toggleMirror = useTeleprompterStore((s) => s.toggleMirror);
  
  const { isPlaying, isPaused, currentSegmentIndex, progress, speed } = playback;
  const totalSegments = project?.segments.length || 0;
  const currentSegment = project?.segments[currentSegmentIndex];
  
  const handlePlayPause = useCallback(() => {
    if (!project || totalSegments === 0) return;
    
    if (!isPlaying) {
      play();
    } else if (isPaused) {
      play();
    } else {
      pause();
    }
  }, [isPlaying, isPaused, play, pause, project, totalSegments]);
  
  const handleSpeedChange = useCallback((delta: number) => {
    setSpeed(speed + delta);
  }, [speed, setSpeed]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch (e.key) {
        case ' ':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          prevSegment();
          break;
        case 'ArrowRight':
          e.preventDefault();
          nextSegment();
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleSpeedChange(10);
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleSpeedChange(-10);
          break;
        case 'm':
        case 'M':
          toggleMirror();
          break;
        case 'Escape':
          if (isFullscreen && onToggleFullscreen) {
            onToggleFullscreen();
          } else {
            stop();
          }
          break;
        case 'f':
        case 'F':
          if (onToggleFullscreen) {
            onToggleFullscreen();
          }
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayPause, prevSegment, nextSegment, handleSpeedChange, toggleMirror, stop, isFullscreen, onToggleFullscreen]);
  
  const isOverlay = variant === 'overlay';
  
  return (
    <div 
      className={cn(
        'flex items-center gap-3',
        isOverlay ? 'controls-overlay p-4 rounded-xl' : 'p-3 bg-card border-t border-border',
        !visible && isOverlay && 'hidden',
        className
      )}
    >
      {/* Transport Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={prevSegment}
          disabled={currentSegmentIndex === 0}
          className={cn('control-btn', isOverlay && 'h-10 w-10')}
        >
          <SkipBack size={isOverlay ? 20 : 16} />
        </Button>
        
        <Button
          variant={isPlaying && !isPaused ? 'default' : 'ghost'}
          size="icon"
          onClick={handlePlayPause}
          disabled={!project || totalSegments === 0}
          className={cn('control-btn', isOverlay && 'h-12 w-12')}
        >
          {isPlaying && !isPaused ? (
            <Pause size={isOverlay ? 24 : 18} />
          ) : (
            <Play size={isOverlay ? 24 : 18} className="ml-0.5" />
          )}
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={stop}
          disabled={!isPlaying}
          className={cn('control-btn', isOverlay && 'h-10 w-10')}
        >
          <Square size={isOverlay ? 18 : 14} />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={nextSegment}
          disabled={currentSegmentIndex >= totalSegments - 1}
          className={cn('control-btn', isOverlay && 'h-10 w-10')}
        >
          <SkipForward size={isOverlay ? 20 : 16} />
        </Button>
      </div>
      
      {/* Progress Bar */}
      <div className="flex-1 mx-2">
        <div className="progress-track">
          <div 
            className="progress-fill"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        {!isOverlay && (
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span>{currentSegmentIndex + 1} / {totalSegments}</span>
            <span>{currentSegment?.name || 'No segment'}</span>
          </div>
        )}
      </div>
      
      {/* Speed Control */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleSpeedChange(-10)}
          className="h-8 w-8"
        >
          <ChevronDown size={16} />
        </Button>
        
        <div className="speed-badge min-w-[70px] text-center">
          <Gauge size={12} className="inline mr-1" />
          {speed}
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleSpeedChange(10)}
          className="h-8 w-8"
        >
          <ChevronUp size={16} />
        </Button>
      </div>
      
      {/* Mirror & Fullscreen */}
      <div className="flex items-center gap-1">
        <Button
          variant={project?.settings.mirrorMode ? 'default' : 'ghost'}
          size="icon"
          onClick={toggleMirror}
          className={cn('control-btn', isOverlay && 'h-10 w-10')}
          title="Mirror mode (M)"
        >
          <FlipHorizontal size={isOverlay ? 18 : 16} />
        </Button>
        
        {onToggleFullscreen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleFullscreen}
            className={cn('control-btn', isOverlay && 'h-10 w-10')}
            title="Fullscreen (F)"
          >
            {isFullscreen ? (
              <Minimize2 size={isOverlay ? 18 : 16} />
            ) : (
              <Maximize2 size={isOverlay ? 18 : 16} />
            )}
          </Button>
        )}
      </div>
      
      {/* Segment counter for overlay */}
      {isOverlay && (
        <div className="text-sm text-muted-foreground ml-2">
          <span className="font-mono">{currentSegmentIndex + 1}</span>
          <span className="mx-1">/</span>
          <span className="font-mono">{totalSegments}</span>
        </div>
      )}
    </div>
  );
});

PlaybackControls.displayName = 'PlaybackControls';

export default PlaybackControls;
