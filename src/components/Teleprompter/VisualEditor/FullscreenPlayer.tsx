import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useVisualEditorState, formatTime, VisualSegment, ImagePage } from './useVisualEditorState';
import { invoke } from '@tauri-apps/api/core';
import { PlaybackTimeDisplay } from './components/PlaybackTimeDisplay';
import { PlaybackProgressBar } from './components/PlaybackProgressBar';
import { AssetManager } from '@/core/storage/AssetManager';
import { AudioResolver } from '@/core/storage/AudioResolver';
import { stopAllExcept, registerStopCallback } from '@/utils/audioPlaybackCoordinator';
import { getCountdownSettings, CountdownSettings } from '@/utils/countdownUtils';
import { usePlayerIndicatorStore } from '@/store/playerIndicatorStore';
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

interface PlayableSegment extends VisualSegment {
  pageId: string;
  isPDF?: boolean;
}

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
  const currentTimeRef = useRef(0);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [countdownSettings, setCountdownSettings] = useState<CountdownSettings>(getCountdownSettings());
  const [isHovering, setIsHovering] = useState(false);
  const [initialFullscreenRequested, setInitialFullscreenRequested] = useState(false);

  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pages = useVisualEditorState((s) => s.pages);
  const audioFile = useVisualEditorState((s) => s.audioFile);
  const setPlaying = useVisualEditorState((s) => s.setPlaying);
  const playbackSpeed = useVisualEditorState((s) => s.playbackSpeed);
  const playerSettings = usePlayerIndicatorStore((s) => s.settings);

  // Get all segments ordered by start time
  const allSegments = React.useMemo(() => {
    return pages
      .flatMap((page) =>
        page.segments
          .map(s => ({ ...s, pageId: page.id, isPDF: page.isPDF }))
      )
      .sort((a, b) => a.startTime - b.startTime);
  }, [pages]);

  // Calculate total duration from visible segments and audio
  const totalDuration = React.useMemo(() => {
    const visibleSegments = allSegments;
    if (visibleSegments.length === 0) return 0;
    const lastSegmentEndTime = Math.max(...visibleSegments.map(s => s.endTime));
    if (audioFile?.duration && audioFile.duration > lastSegmentEndTime) {
      return audioFile.duration;
    }
    return lastSegmentEndTime;
  }, [allSegments, audioFile?.duration]);

  const currentSegment = allSegments[currentSegmentIndex];

  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});
  const [resolvedAudioUrl, setResolvedAudioUrl] = useState<string>('');

  // Resolve all asset URLs when pages change
  useEffect(() => {
    let isMounted = true;
    const resolveAll = async () => {
      const newUrls: Record<string, string> = {};
      await Promise.all(pages.map(async (page) => {
        if (page.assetId) {
          const url = await AssetManager.getAssetUrl(page.assetId);
          if (url) newUrls[page.id] = url;
        } else if (page.data) {
          if (page.data.startsWith('data:') || page.data.startsWith('blob:')) {
            newUrls[page.id] = page.data;
          } else {
            const { convertPathToSrc } = await import('@/core/storage/NativeStorage');
            newUrls[page.id] = convertPathToSrc(page.data);
          }
        }
      }));
      if (isMounted) setResolvedUrls(newUrls);
    };
    resolveAll();

    // Resolve audio URL
    if (audioFile) {
      AudioResolver.resolve(audioFile.id, audioFile.id).then(url => {
        if (isMounted && url) setResolvedAudioUrl(url);
        else if (isMounted && audioFile.data) setResolvedAudioUrl(audioFile.data);
      });
    }

    return () => { isMounted = false; };
  }, [pages, audioFile]);

  // Handle automatic fullscreen on mount (triggered by user gesture 'Go Live' click)
  useEffect(() => {
    if (!initialFullscreenRequested && containerRef.current) {
      setInitialFullscreenRequested(true);

      // Use Tauri's native command for OS-level fullscreen
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        invoke('set_window_fullscreen', { fullscreen: true }).catch(() => {
          // Fallback to browser API if Tauri invoke fails
          containerRef.current?.requestFullscreen().catch(() => { });
        });
      } else {
        containerRef.current.requestFullscreen().catch(() => { });
      }
    }
  }, [initialFullscreenRequested]);

  // Image cache for canvas
  const imageCacheRef = useRef<Record<string, HTMLImageElement>>({});

  // Draw current segment on canvas
  const drawSegment = useCallback((segment: PlayableSegment | undefined) => {
    if (!canvasRef.current || !segment) return;

    const engine = useVisualEditorState.getState().isLoading ? null : import('@/core/engine/RenderEngine').then(m => m.getRenderEngine());

    const src = resolvedUrls[segment.pageId];
    if (!src) return;

    // Use the RenderEngine for high-performance rendering
    import('@/core/engine/RenderEngine').then(m => {
      const engine = m.getRenderEngine();
      if (canvasRef.current) {
        engine.attachCanvas(canvasRef.current);
        engine.render({
          id: segment.id,
          type: 'image-region',
          name: segment.label,
          order: segment.order,
          content: src,
          pageNumber: segment.pageIndex + 1,
          region: segment.region,
          scrollSpeed: 100,
          duration: segment.endTime - segment.startTime,
          fontSize: 48,
          fontFamily: 'Inter',
          textColor: 'white',
          lineHeight: 1.8,
          mirror: false
        }, 0, false);
      }
    });
  }, [resolvedUrls]);

  // Draw first segment preview during countdown
  const drawCountdownPreview = useCallback(() => {
    if (!countdownSettings.showPreview || allSegments.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const firstSegment = allSegments[0];
    const src = resolvedUrls[firstSegment.pageId];
    if (!src) return;

    const img = new Image();
    img.onload = () => {
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;

      const regionX = (firstSegment.region.x / 100) * img.width;
      const regionY = (firstSegment.region.y / 100) * img.height;
      const regionW = (firstSegment.region.width / 100) * img.width;
      const regionH = (firstSegment.region.height / 100) * img.height;

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      ctx.globalAlpha = 0.3;

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

      ctx.globalAlpha = 1.0;
    };
    img.src = src;
  }, [countdownSettings.showPreview, allSegments, resolvedUrls]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      const container = containerRef.current;
      canvasRef.current.width = container.clientWidth;
      canvasRef.current.height = container.clientHeight;
      if (playbackState === 'countdown' && countdownSettings.showPreview) {
        drawCountdownPreview();
      } else if (currentSegment) {
        drawSegment(currentSegment);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentSegment, drawSegment, drawCountdownPreview, playbackState, countdownSettings.showPreview]);

  // Listen for countdown settings
  useEffect(() => {
    const handleStorageChange = () => setCountdownSettings(getCountdownSettings());
    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(() => {
      const currentSettings = getCountdownSettings();
      if (JSON.stringify(currentSettings) !== JSON.stringify(countdownSettings)) {
        setCountdownSettings(currentSettings);
      }
    }, 1000);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [countdownSettings]);

  useEffect(() => {
    if (playbackState === 'countdown' && countdownSettings.showPreview) {
      drawCountdownPreview();
    }
  }, [playbackState, countdownSettings.showPreview, drawCountdownPreview]);

  useEffect(() => {
    setPlaying(playbackState === 'playing');
  }, [playbackState, setPlaying]);

  useEffect(() => {
    return registerStopCallback('fullscreen-player', () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      setPlaybackState('idle');
      if (audioRef.current) audioRef.current.pause();
    });
  }, []);

  // Auto-hide controls logic
  const showControls = useCallback(() => {
    setControlsVisible(true);

    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }

    // Auto-hide if behavior is not 'always-show' and currently playing
    const shouldAutoHide = playerSettings.behavior !== 'always-show';

    if (shouldAutoHide && playbackState === 'playing') {
      hideTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, playerSettings.autoHideDelay);
    }
  }, [playbackState, playerSettings.behavior, playerSettings.autoHideDelay]);

  // Handle playback state changes to trigger auto-hide immediately
  useEffect(() => {
    if (playbackState === 'playing') {
      showControls();
    } else if (playbackState === 'idle') {
      setControlsVisible(true);
    }
  }, [playbackState, showControls]);

  const handleMouseMove = useCallback(() => {
    showControls();
  }, [showControls]);

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
    showControls();
  }, [showControls]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    if (playerSettings.behavior !== 'always-show') {
      setControlsVisible(false);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    }
  }, [playerSettings.behavior]);

  const audioContextRef = useRef<AudioContext | null>(null);

  const startCountdown = useCallback(() => {
    stopAllExcept('fullscreen-player');
    if (!countdownSettings.enabled) {
      setPlaybackState('playing');
      return;
    }
    setPlaybackState('countdown');
    setCountdownValue(countdownSettings.duration);
    let count = countdownSettings.duration;

    // Beep function - reused
    const beep = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.1);
    };

    countdownIntervalRef.current = setInterval(() => {
      count -= 1;
      if (countdownSettings.playSound && count > 0) {
        beep();
      }
      if (count <= 0) {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        setPlaybackState('playing');
      } else {
        setCountdownValue(count);
      }
    }, 1000);
  }, [countdownSettings.enabled, countdownSettings.duration, countdownSettings.playSound]);

  const cancelCountdown = useCallback(() => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setPlaybackState('idle');
  }, []);

  useEffect(() => {
    if (playbackState !== 'playing') return;
    const audio = audioRef.current;
    const hasAudio = audio && audioFile;
    if (hasAudio) {
      audio.currentTime = pausedTimeRef.current;
      audio.playbackRate = playbackSpeed; // Apply current speed
      audio.play().catch(console.error);
    } else {
      startTimeRef.current = performance.now();
    }
    let lastFrameTime = performance.now();
    const animate = () => {
      const now = performance.now();
      const delta = (now - lastFrameTime) / 1000;
      lastFrameTime = now;

      let elapsed: number;
      if (hasAudio) {
        elapsed = audio.currentTime;
      } else {
        elapsed = currentTimeRef.current + (delta * playbackSpeed);
      }

      currentTimeRef.current = elapsed;

      // Emit tick for optimized listeners
      window.dispatchEvent(new CustomEvent('playback-tick', { detail: { time: elapsed } }));

      if (elapsed >= totalDuration) {
        setPlaybackState('idle');
        pausedTimeRef.current = 0;
        currentTimeRef.current = 0;
        window.dispatchEvent(new CustomEvent('playback-tick', { detail: { time: 0 } }));
        setCurrentSegmentIndex(0);
        currentSegmentIndexRef.current = 0;
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
        drawSegment(allSegments[0]);
        return;
      }
      let segIndex = -1;
      for (let i = 0; i < allSegments.length; i++) {
        const seg = allSegments[i];
        if (elapsed >= seg.startTime && elapsed < seg.endTime) {
          segIndex = i;
          break;
        }
      }
      if (segIndex === -1) {
        for (let i = allSegments.length - 1; i >= 0; i--) {
          if (elapsed >= allSegments[i].startTime) {
            segIndex = i;
            break;
          }
        }
      }
      if (segIndex !== -1 && segIndex !== currentSegmentIndexRef.current) {
        currentSegmentIndexRef.current = segIndex;
        setCurrentSegmentIndex(segIndex);
        drawSegment(allSegments[segIndex]);
      }
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [playbackState, allSegments, totalDuration, drawSegment, audioFile, playbackSpeed]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  useEffect(() => {
    if (playbackState === 'idle' && audioRef.current) audioRef.current.pause();
  }, [playbackState]);

  useEffect(() => { if (currentSegment) drawSegment(currentSegment); }, [currentSegment, drawSegment]);

  // Handle Escape and Fullscreen state changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isNowFullscreen);

      // If the user was in fullscreen and exited via Escape (or other means),
      // and they are not in the middle of a countdown, we can interpret this as "close player"
      // if it's the standard behavior they expect.
      if (!isNowFullscreen && playbackState === 'idle') {
        // We'll leave it open for now unless they specifically press Escape again 
        // to match common video player behaviors, but ensure state is synced.
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [playbackState]);

  // Robust cleanup on unmount - Stop EVERYTHING
  useEffect(() => {
    return () => {
      // 1. Stop Audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = ""; // Force unload
      }

      // 2. Stop Animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      // 3. Clear Intervals
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }

      // 4. Close Audio Context
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => { });
        audioContextRef.current = null;
      }

      // 4. Sync Store
      setPlaying(false);

      // 5. Release Fullscreen if still held
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        invoke('set_window_fullscreen', { fullscreen: false }).catch(() => { });
      }
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => { });
      }
    };
  }, [setPlaying]);

  const togglePlay = useCallback(() => {
    if (playbackState === 'playing') {
      pausedTimeRef.current = currentTimeRef.current;
      setPlaybackState('idle');
      if (audioRef.current) audioRef.current.pause();
    } else if (playbackState === 'countdown') {
      cancelCountdown();
    } else {
      if (currentTimeRef.current >= totalDuration) {
        pausedTimeRef.current = 0;
        currentTimeRef.current = 0;
        window.dispatchEvent(new CustomEvent('playback-tick', { detail: { time: 0 } }));
        setCurrentSegmentIndex(0);
        currentSegmentIndexRef.current = 0;
        if (audioRef.current) audioRef.current.currentTime = 0;
      } else {
        pausedTimeRef.current = currentTimeRef.current;
      }
      startCountdown();
    }
  }, [playbackState, totalDuration, startCountdown, cancelCountdown]);

  const skipPrev = useCallback(() => {
    const newIndex = Math.max(0, currentSegmentIndex - 1);
    currentSegmentIndexRef.current = newIndex;
    setCurrentSegmentIndex(newIndex);
    const segment = allSegments[newIndex];
    if (segment) {
      pausedTimeRef.current = segment.startTime;
      currentTimeRef.current = segment.startTime;
      window.dispatchEvent(new CustomEvent('playback-tick', { detail: { time: segment.startTime } }));
      drawSegment(segment);
      if (audioRef.current) audioRef.current.currentTime = segment.startTime;
    }
  }, [currentSegmentIndex, allSegments, drawSegment]);

  const skipNext = useCallback(() => {
    const newIndex = Math.min(allSegments.length - 1, currentSegmentIndex + 1);
    currentSegmentIndexRef.current = newIndex;
    setCurrentSegmentIndex(newIndex);
    const segment = allSegments[newIndex];
    if (segment) {
      pausedTimeRef.current = segment.startTime;
      currentTimeRef.current = segment.startTime;
      window.dispatchEvent(new CustomEvent('playback-tick', { detail: { time: segment.startTime } }));
      drawSegment(segment);
      if (audioRef.current) audioRef.current.currentTime = segment.startTime;
    }
  }, [currentSegmentIndex, allSegments, drawSegment]);

  const toggleFullscreen = useCallback(() => {
    // Priority 1: Native Tauri OS-level Fullscreen
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      invoke('toggle_window_fullscreen').catch(console.error);
      return;
    }

    // Priority 2: Browser-level Fullscreen API
    if (!containerRef.current) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
    else containerRef.current.requestFullscreen().catch(() => { });
  }, []);

  const toggleMute = useCallback(() => {
    if (audioRef.current) audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * totalDuration;
    pausedTimeRef.current = newTime;
    currentTimeRef.current = newTime;
    window.dispatchEvent(new CustomEvent('playback-tick', { detail: { time: newTime } }));

    let segIndex = -1;
    for (let i = 0; i < allSegments.length; i++) {
      if (newTime >= allSegments[i].startTime && newTime < allSegments[i].endTime) { segIndex = i; break; }
    }
    if (segIndex === -1) {
      for (let i = allSegments.length - 1; i >= 0; i--) {
        if (newTime >= allSegments[i].startTime) { segIndex = i; break; }
      }
    }
    if (segIndex !== -1) {
      currentSegmentIndexRef.current = segIndex;
      setCurrentSegmentIndex(segIndex);
      drawSegment(allSegments[segIndex]);
    }
    if (audioRef.current) audioRef.current.currentTime = newTime;
  }, [totalDuration, allSegments, drawSegment]);

  const resetPosition = useCallback(() => {
    pausedTimeRef.current = 0;
    currentTimeRef.current = 0;
    window.dispatchEvent(new CustomEvent('playback-tick', { detail: { time: 0 } }));
    setCurrentSegmentIndex(0);
    currentSegmentIndexRef.current = 0;
    if (audioRef.current) audioRef.current.currentTime = 0;
    if (allSegments.length > 0) drawSegment(allSegments[0]);
  }, [allSegments, drawSegment]);

  useEffect(() => {
    const handleRemoteNext = () => skipNext();
    const handleRemotePrev = () => skipPrev();
    const handleRemotePlay = () => {
      if (playbackState === 'idle') startCountdown();
    };
    const handleRemotePause = () => {
      if (playbackState === 'playing') togglePlay();
    };
    const handleRemoteStop = () => {
      setPlaybackState('idle');
      resetPosition();
    };
    const handleRemoteReset = () => resetPosition();

    window.addEventListener('remote-skip-next', handleRemoteNext);
    window.addEventListener('remote-skip-prev', handleRemotePrev);
    window.addEventListener('remote-play', handleRemotePlay);
    window.addEventListener('remote-pause', handleRemotePause);
    window.addEventListener('remote-stop', handleRemoteStop);
    window.addEventListener('remote-reset-position', handleRemoteReset);

    return () => {
      window.removeEventListener('remote-skip-next', handleRemoteNext);
      window.removeEventListener('remote-skip-prev', handleRemotePrev);
      window.removeEventListener('remote-play', handleRemotePlay);
      window.removeEventListener('remote-pause', handleRemotePause);
      window.removeEventListener('remote-stop', handleRemoteStop);
      window.removeEventListener('remote-reset-position', handleRemoteReset);
    };
  }, [skipNext, skipPrev, startCountdown, togglePlay, resetPosition, playbackState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        togglePlay();
      }
      else if (e.key === 'ArrowLeft' || e.key === 'j') {
        e.preventDefault();
        skipPrev();
      }
      else if (e.key === 'ArrowRight' || e.key === 'l') {
        e.preventDefault();
        skipNext();
      }
      else if (e.key === 'f') {
        e.preventDefault();
        toggleFullscreen();
      }
      else if (e.key === 'm') {
        e.preventDefault();
        toggleMute();
      }
      else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation(); // Prevent browser default if possible

        if (playbackState === 'countdown') {
          cancelCountdown();
        } else {
          // Force close everything
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => { });
          }
          onClose();
        }
      }
    };

    // Use capture phase to intercept Escape before the browser exits fullscreen silently
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [togglePlay, skipPrev, skipNext, toggleFullscreen, toggleMute, onClose, playbackState, cancelCountdown]);

  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // Removed state-based progress to prevent re-renders

  if (allSegments.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-xl mb-4">No segments to play</p>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex flex-col"
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {audioFile && <audio ref={audioRef} src={resolvedAudioUrl || audioFile.data} preload="auto" muted={isMuted} />}

      {playbackState === 'countdown' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="text-center">
            <div className="text-[200px] font-bold text-white leading-none animate-pulse">{countdownValue}</div>
            <p className="text-white/60 text-xl mt-4">Starting in...</p>
            <Button variant="ghost" className="mt-6 text-white/60 hover:text-white" onClick={cancelCountdown}>Cancel (Esc)</Button>
          </div>
        </div>
      )}

      <div className="absolute inset-0">
        <canvas ref={canvasRef} className="w-full h-full" />

        {/* Segment Info Overlay */}
        <div className={cn(
          'absolute top-8 left-8 transition-all duration-500 z-10',
          ((playerSettings.behavior === 'always-show' || controlsVisible) &&
            playbackState !== 'countdown') ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
        )}>
          <div
            className="px-4 py-3 rounded-xl shadow-2xl border border-white/10"
            style={{
              backgroundColor: playerSettings.backgroundColor,
              color: playerSettings.textColor,
              opacity: playerSettings.opacity,
            }}
          >
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-40 block mb-0.5">Active Scene</span>
            <p className="text-lg font-bold truncate max-w-[300px]">
              {currentSegment?.label || `Scene ${currentSegmentIndex + 1}`}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${((currentSegmentIndex + 1) / allSegments.length) * 100}%` }} />
              </div>
              <span className="text-[10px] font-mono font-bold opacity-60">
                {currentSegmentIndex + 1} / {allSegments.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Controls Overlay */}
      <div className={cn(
        'absolute bottom-0 left-0 right-0 z-20 transition-all duration-500 transform-gpu',
        ((playerSettings.behavior === 'always-show' || controlsVisible) &&
          playbackState !== 'countdown')
          ? 'translate-y-0 opacity-100'
          : 'translate-y-12 opacity-0 pointer-events-none'
      )}>
        {/* Progress Bar */}
        <div className="px-8 mb-[-16px] relative z-30">
          <PlaybackProgressBar
            totalDuration={totalDuration}
            allSegments={allSegments}
            initialTime={currentTimeRef.current}
            onClick={handleProgressClick}
          />
        </div>

        {/* Control Console */}
        <div
          className="p-3 pt-8 pb-4"
          style={{
            background: playerSettings.backgroundColor,
            borderTop: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <div className="flex items-center w-full relative">
            {/* Left Section: Time and Context */}
            <div className="flex-1 flex items-center gap-6 min-w-0">
              <div
                className="px-4 py-1.5 rounded-xl bg-white/5 border border-white/5 flex flex-col justify-center h-12 w-[150px] shrink-0"
                style={{ color: playerSettings.textColor }}
              >
                <span className="text-[8px] font-bold uppercase tracking-widest opacity-40 mb-0.5 leading-none">Elapsed Time</span>
                <div className="flex items-baseline gap-1.5 overflow-hidden">
                  <div className="text-xl font-mono font-bold tracking-tighter tabular-nums leading-none w-full">
                    <PlaybackTimeDisplay initialTime={currentTimeRef.current} />
                  </div>
                </div>
              </div>

              <div className="h-10 w-px bg-white/10 hidden xl:block" />

              <div className="hidden lg:flex flex-col min-w-0" style={{ color: playerSettings.textColor }}>
                <span className="text-[9px] font-bold uppercase tracking-widest opacity-40 mb-0.5 leading-none">Status</span>
                <div className="flex items-center gap-3">
                  <div className="h-6 w-1 rounded-full bg-primary shrink-0" />
                  <span className="text-sm font-bold opacity-80 tracking-tight truncate">
                    {currentSegment?.label || `Scene ${currentSegmentIndex + 1}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Center Section: Primary Transport */}
            <div className="flex items-center gap-5 px-8">
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-full text-white/40 hover:text-white hover:bg-white/10 active:scale-90 transition-all balance-button"
                onClick={skipPrev}
                disabled={playbackState === 'countdown'}
              >
                <SkipBack size={24} className="fill-current" />
              </Button>

              <Button
                variant="default"
                size="icon"
                className="h-14 w-14 rounded-full bg-primary hover:bg-primary/90 text-white shadow-lg active:scale-95 transition-all group shrink-0"
                onClick={togglePlay}
              >
                {playbackState === 'playing' ? (
                  <Pause size={28} className="fill-current group-hover:scale-110 transition-transform" />
                ) : (
                  <Play size={28} className="fill-current ml-1 group-hover:scale-110 transition-transform" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-full text-white/40 hover:text-white hover:bg-white/10 active:scale-90 transition-all balance-button"
                onClick={skipNext}
                disabled={playbackState === 'countdown'}
              >
                <SkipForward size={24} className="fill-current" />
              </Button>
            </div>


            {/* Right Section: Utilities and Exit */}
            <div className="flex-1 flex items-center justify-end gap-3 min-w-0">
              <div className="flex items-center bg-white/5 rounded-2xl border border-white/5 p-1 backdrop-blur-md shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-xl text-white/40 hover:text-white hover:bg-white/10"
                  onClick={toggleMute}
                >
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-xl text-white/40 hover:text-white hover:bg-white/10"
                  onClick={toggleFullscreen}
                >
                  {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                </Button>
              </div>

              <div className="h-10 w-px bg-white/10 mx-1 hidden sm:block" />

              <Button
                variant="destructive"
                size="icon"
                className="h-12 w-12 rounded-xl shadow-xl shadow-destructive/20 hover:scale-110 transition-all shrink-0"
                onClick={onClose}
              >
                <X size={22} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

FullscreenPlayer.displayName = 'FullscreenPlayer';
