import React, { 
  memo, 
  useRef, 
  useEffect, 
  useCallback, 
  useState 
} from 'react';
import { useTeleprompterStore } from '@/store/teleprompterStore';
import { RenderEngine, getRenderEngine } from '@/core/engine/RenderEngine';
import { ScrollEngine, getScrollEngine } from '@/core/engine/ScrollEngine';
import { PlaybackControls } from './PlaybackControls';
import { cn } from '@/lib/utils';

interface TeleprompterDisplayProps {
  className?: string;
}

export const TeleprompterDisplay = memo<TeleprompterDisplayProps>(({ className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderEngineRef = useRef<RenderEngine | null>(null);
  const scrollEngineRef = useRef<ScrollEngine | null>(null);
  const rafRef = useRef<number | null>(null);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [fps, setFps] = useState(60);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const project = useTeleprompterStore((s) => s.project);
  const playback = useTeleprompterStore((s) => s.playback);
  const setScrollOffset = useTeleprompterStore((s) => s.setScrollOffset);
  const setProgress = useTeleprompterStore((s) => s.setProgress);
  const nextSegment = useTeleprompterStore((s) => s.nextSegment);
  
  const { isPlaying, isPaused, currentSegmentIndex, speed } = playback;
  const currentSegment = project?.segments[currentSegmentIndex];
  const mirrorMode = project?.settings.mirrorMode || false;
  
  // Initialize engines
  useEffect(() => {
    renderEngineRef.current = getRenderEngine();
    scrollEngineRef.current = getScrollEngine();
    
    if (canvasRef.current) {
      renderEngineRef.current.attachCanvas(canvasRef.current);
    }
    
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);
  
  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !renderEngineRef.current) return;
      
      const { width, height } = containerRef.current.getBoundingClientRect();
      renderEngineRef.current.resize(width, height);
      
      // Update guide position from settings
      if (project?.settings) {
        renderEngineRef.current.setConfig({
          guidePosition: project.settings.guidePosition,
          showGuide: project.settings.showGuide,
        });
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, [project?.settings]);
  
  // Set up scroll callbacks
  useEffect(() => {
    if (!scrollEngineRef.current) return;
    
    scrollEngineRef.current.setCallbacks(
      (offset, progress) => {
        setScrollOffset(offset);
        setProgress(progress);
      },
      () => {
        nextSegment();
      }
    );
  }, [setScrollOffset, setProgress, nextSegment]);
  
  // Update scroll engine speed
  useEffect(() => {
    if (scrollEngineRef.current) {
      scrollEngineRef.current.setSpeed(speed);
    }
  }, [speed]);
  
  // Calculate target height when segment changes
  useEffect(() => {
    if (!currentSegment || !renderEngineRef.current || !scrollEngineRef.current) return;
    
    const metrics = renderEngineRef.current.measureText(currentSegment);
    scrollEngineRef.current.setTarget(metrics.totalHeight);
    scrollEngineRef.current.setCurrentOffset(0);
  }, [currentSegment?.id, currentSegment?.content]);
  
  // Playback control
  useEffect(() => {
    if (!scrollEngineRef.current) return;
    
    if (isPlaying && !isPaused) {
      scrollEngineRef.current.play();
    } else if (isPaused) {
      scrollEngineRef.current.pause();
    } else {
      scrollEngineRef.current.stop();
    }
  }, [isPlaying, isPaused]);
  
  // Render loop
  useEffect(() => {
    const render = () => {
      if (!currentSegment || !renderEngineRef.current || !scrollEngineRef.current) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }
      
      const offset = scrollEngineRef.current.getCurrentOffset();
      renderEngineRef.current.render(currentSegment, offset, mirrorMode);
      setFps(renderEngineRef.current.getFps());
      
      rafRef.current = requestAnimationFrame(render);
    };
    
    rafRef.current = requestAnimationFrame(render);
    
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [currentSegment, mirrorMode]);
  
  // Auto-hide controls
  const showControls = useCallback(() => {
    setControlsVisible(true);
    
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    
    if (isFullscreen && project?.settings.autoHideControls) {
      hideTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, project.settings.controlsHideDelay || 3000);
    }
  }, [isFullscreen, project?.settings]);
  
  // Handle mouse movement for controls visibility
  const handleMouseMove = useCallback(() => {
    showControls();
  }, [showControls]);
  
  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, [isFullscreen]);
  
  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      showControls();
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [showControls]);
  
  if (!project || !currentSegment) {
    return (
      <div className={cn(
        'flex items-center justify-center bg-black text-muted-foreground',
        className
      )}>
        <div className="text-center">
          <p className="text-lg mb-2">No segment selected</p>
          <p className="text-sm">Create or select a segment to preview</p>
        </div>
      </div>
    );
  }
  
  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex flex-col h-full overflow-hidden bg-black',
        isFullscreen && 'fullscreen-mode',
        className
      )}
      onMouseMove={handleMouseMove}
    >
      {/* Canvas */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className="teleprompter-canvas absolute inset-0 w-full h-full"
        />
        
        {/* FPS indicator (debug) */}
        {!isFullscreen && (
          <div className="absolute top-2 right-2 text-xs text-muted-foreground font-mono opacity-50">
            {fps} FPS
          </div>
        )}
        
        {/* Status indicator */}
        <div className="absolute top-2 left-2 flex items-center gap-2">
          <div className={cn(
            'status-dot',
            isPlaying && !isPaused ? 'active' : isPaused ? 'paused' : 'idle'
          )} />
          <span className="text-xs text-muted-foreground">
            {isPlaying && !isPaused ? 'Playing' : isPaused ? 'Paused' : 'Ready'}
          </span>
        </div>
      </div>
      
      {/* Controls */}
      {isFullscreen ? (
        <div className={cn(
          'absolute bottom-4 left-1/2 -translate-x-1/2 transition-opacity duration-300',
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}>
          <PlaybackControls
            variant="overlay"
            onToggleFullscreen={toggleFullscreen}
            isFullscreen={isFullscreen}
            visible={controlsVisible}
          />
        </div>
      ) : (
        <PlaybackControls
          variant="bar"
          onToggleFullscreen={toggleFullscreen}
          isFullscreen={isFullscreen}
        />
      )}
    </div>
  );
});

TeleprompterDisplay.displayName = 'TeleprompterDisplay';

export default TeleprompterDisplay;
