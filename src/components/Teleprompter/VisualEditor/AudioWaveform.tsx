import React, { memo, useCallback, useRef, useEffect, useState } from 'react';
import { useVisualEditorState, formatTime } from './useVisualEditorState';
import { PlaybackTimeDisplay } from './components/PlaybackTimeDisplay';
import { stopAllExcept, registerStopCallback } from '@/utils/audioPlaybackCoordinator';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Gauge,
  Upload,
  X,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { saveAudioFile } from '@/core/storage/AudioStorage';
import { AudioResolver } from '@/core/storage/AudioResolver';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const WAVEFORM_HEIGHT = 42;
const MAX_WAVEFORM_SAMPLES = 200;

// Global cache for waveform data to prevent redundant decodes
const waveformCache = new Map<string, number[]>();

// Persistent cache in LocalStorage
const PERSISTENT_WAVEFORM_PREFIX = 'v-editor-wf-';

function getCachedWaveform(id: string): number[] | null {
  if (waveformCache.has(id)) return waveformCache.get(id)!;

  try {
    const stored = localStorage.getItem(PERSISTENT_WAVEFORM_PREFIX + id);
    if (stored) {
      const data = JSON.parse(stored);
      waveformCache.set(id, data);
      return data;
    }
  } catch (e) {
    console.warn('Failed to read waveform cache:', e);
  }
  return null;
}

function setCachedWaveform(id: string, data: number[]): void {
  waveformCache.set(id, data);
  try {
    // Only store first 10 assets to avoid filling localstorage
    localStorage.setItem(PERSISTENT_WAVEFORM_PREFIX + id, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to write waveform cache:', e);
  }
}

/** Resolve CSS variable for canvas - canvas does not support var() in fillStyle */
function getCanvasColor(varName: string, alpha?: number): string {
  try {
    const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    if (!value) return alpha !== undefined ? `hsla(0, 0%, 50%, ${alpha})` : 'hsl(0,0%,50%)';
    // Handle space-separated HSL values common in shadcn/tailwind
    const cleanValue = value.replace(/\s+/g, ',');
    return alpha !== undefined ? `hsla(${cleanValue}, ${alpha})` : `hsl(${cleanValue})`;
  } catch {
    return alpha !== undefined ? 'hsla(0,0%,50%,0.5)' : 'hsl(0,0%,50%)';
  }
}

interface AudioWaveformProps {
  className?: string;
  onOpenAudioLibrary?: () => void;
}

export const AudioWaveform = memo<AudioWaveformProps>(({ className, onOpenAudioLibrary }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const isSeekingRef = useRef(false);

  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isAudioReady, setIsAudioReady] = useState(false);

  const audioFile = useVisualEditorState((s) => s.audioFile);
  const playbackTime = useVisualEditorState((s) => s.playbackTime);
  const isPlaying = useVisualEditorState((s) => s.isPlaying);
  const showPlayer = useVisualEditorState((s) => s.showPlayer);
  const playbackSpeed = useVisualEditorState((s) => s.playbackSpeed);
  const currentPage = useVisualEditorState((s) => s.getCurrentPage());

  const setAudioFile = useVisualEditorState((s) => s.setAudioFile);
  const setPlaybackTime = useVisualEditorState((s) => s.setPlaybackTime);
  const setPlaying = useVisualEditorState((s) => s.setPlaying);
  const setPlaybackSpeed = useVisualEditorState((s) => s.setPlaybackSpeed);
  const selectSegment = useVisualEditorState((s) => s.selectSegment);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate waveform data - optimized with caching
  useEffect(() => {
    if (!audioFile?.id || !audioFile.data) {
      setWaveformData([]);
      setIsAudioReady(false);
      return;
    }

    // Check cache first
    const cached = getCachedWaveform(audioFile.id);
    if (cached) {
      setWaveformData(cached);
      setIsAudioReady(true);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const decodeAndExtractWaveform = async () => {
      let audioContext: AudioContext | null = null;
      try {
        const res = await fetch(audioFile.data, { signal: controller.signal });
        const arrayBuffer = await res.arrayBuffer();
        if (cancelled) return;

        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        if (cancelled) return;

        const rawData = audioBuffer.getChannelData(0);
        const samples = MAX_WAVEFORM_SAMPLES;
        const blockSize = Math.floor(rawData.length / samples);
        const filteredData: number[] = [];

        for (let i = 0; i < samples; i++) {
          let sum = 0;
          const start = i * blockSize;
          for (let j = 0; j < blockSize; j += 4) { // Sample every 4th for speed
            sum += Math.abs(rawData[start + j]);
          }
          filteredData.push(sum / (blockSize / 4));
        }

        const maxVal = Math.max(...filteredData) || 0.001;
        const normalized = filteredData.map(v => Math.pow(v / maxVal, 0.8)); // Add slight compression for visibility

        if (!cancelled) {
          setWaveformData(normalized);
          setCachedWaveform(audioFile.id, normalized);
          setIsAudioReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Waveform extraction failed:', err);
          setWaveformData([]);
        }
      } finally {
        if (audioContext) audioContext.close();
      }
    };

    decodeAndExtractWaveform();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [audioFile?.id, audioFile?.data]);

  // Audio element setup
  useEffect(() => {
    if (!audioFile?.data) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      return;
    }

    const audio = new Audio(audioFile.data);
    audio.preload = 'auto';
    audio.onloadedmetadata = () => setIsAudioReady(true);
    audio.onended = () => {
      setPlaying(false);
      setPlaybackTime(0);
    };
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [audioFile?.data, setPlaying, setPlaybackTime]);

  // Resize canvas observer - get width from container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => {
      const w = container.offsetWidth || container.clientWidth;
      if (w > 0) setCanvasWidth(w);
    };

    updateWidth();
    requestAnimationFrame(updateWidth);
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) setCanvasWidth(w);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [audioFile]);

  // Draw waveform visualization (optimized)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const w = canvasWidth || containerRef.current?.offsetWidth || 0;
    if (w <= 0) return;

    const height = WAVEFORM_HEIGHT;
    const duration = audioFile?.duration || 1;
    const dpr = window.devicePixelRatio || 1;

    // Redraw function called on demand
    const draw = (currentTime: number) => {
      if (canvas.width !== w * dpr) {
        canvas.width = w * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${height}px`;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, height);

      const primary = getCanvasColor('--primary');
      const primaryLow = getCanvasColor('--primary', 0.15);
      const mutedFg30 = getCanvasColor('--muted-foreground', 0.25);
      const destructive = '#ef4444';
      const progress = Math.min(currentTime / duration, 1);

      // 1. Draw Segments with premium styling
      const selectedIds = useVisualEditorState.getState().selectedSegmentIds;
      const segments = currentPage?.segments || [];

      segments.forEach(segment => {
        if (segment.isHidden) return;
        const isSelected = selectedIds.has(segment.id);
        const startX = (segment.startTime / duration) * w;
        const endX = (segment.endTime / duration) * w;
        const segWidth = Math.max(2, endX - startX);

        // Segment Background
        ctx.fillStyle = isSelected ? getCanvasColor('--primary', 0.08) : getCanvasColor('--primary', 0.03);
        ctx.fillRect(startX, 0, segWidth, height);

        // Top/Bottom Accent Bars
        ctx.fillStyle = isSelected ? primary : getCanvasColor('--primary', 0.4);
        ctx.fillRect(startX, 0, segWidth, 2);
        ctx.fillRect(startX, height - 2, segWidth, 2);

        // Side Borders
        ctx.fillStyle = isSelected ? primary : getCanvasColor('--primary', 0.2);
        ctx.fillRect(startX, 0, 1.5, height);
        ctx.fillRect(endX - 1.5, 0, 1.5, height);
      });

      // 2. Draw Waveform with rounded bars
      if (waveformData.length > 0) {
        const barWidth = w / waveformData.length;
        const barGap = 2;
        const actualBarWidth = Math.max(1.5, barWidth - barGap);

        waveformData.forEach((val, i) => {
          const x = i * barWidth;
          const barHeight = Math.max(2, val * (height * 0.7));
          const yTop = (height - barHeight) / 2;
          const barProgress = i / waveformData.length;
          const isPlayed = barProgress < progress;

          // Check if this bar is inside a segment
          const barTime = (barProgress) * duration;
          const isInSegment = segments.some(s => !s.isHidden && barTime >= s.startTime && barTime <= s.endTime);

          ctx.fillStyle = isPlayed ? primary : (isInSegment ? primaryLow : mutedFg30);

          if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(x, yTop, actualBarWidth, barHeight, actualBarWidth / 2);
            ctx.fill();
          } else {
            ctx.fillRect(x, yTop, actualBarWidth, barHeight);
          }
        });
      } else {
        // Fallback line
        ctx.fillStyle = getCanvasColor('--muted-foreground', 0.1);
        ctx.fillRect(0, height / 2 - 1, w, 2);
        ctx.fillStyle = primary;
        ctx.fillRect(0, height / 2 - 1, w * progress, 2);
      }

      // 3. Draw Playhead (Indicator)
      const playheadX = progress * w;

      // Glow effect for playhead
      const glow = ctx.createRadialGradient(playheadX, height / 2, 0, playheadX, height / 2, 10);
      glow.addColorStop(0, 'rgba(239, 68, 68, 0.2)');
      glow.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(playheadX - 10, 0, 20, height);

      // Line
      ctx.fillStyle = destructive;
      ctx.fillRect(playheadX - 1, 0, 2, height);

      // Precise Cap
      ctx.beginPath();
      ctx.moveTo(playheadX - 4, 0);
      ctx.lineTo(playheadX + 4, 0);
      ctx.lineTo(playheadX, 5);
      ctx.fill();

      ctx.restore();
    };

    // Listen for high-frequency ticks
    const handleTick = (e: CustomEvent<{ time: number }>) => {
      draw(e.detail.time);
    };

    draw(playbackTime);
    window.addEventListener('playback-tick' as any, handleTick);
    return () => window.removeEventListener('playback-tick' as any, handleTick);
  }, [waveformData, canvasWidth, playbackTime, audioFile?.duration, currentPage?.segments]);

  // Register stop callback so others can stop us when they start
  useEffect(() => {
    return registerStopCallback('visual-editor', () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlaying(false);
    });
  }, [setPlaying]);

  // Handle playback state changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isAudioReady) return;
    // FullscreenPlayer has its own audio - don't play here when it's open
    if (showPlayer) return;

    audio.playbackRate = playbackSpeed;
    audio.muted = isMuted;

    if (isPlaying) {
      stopAllExcept('visual-editor');
      // Sync audio time if significantly out of sync
      if (Math.abs(audio.currentTime - playbackTime) > 0.1) {
        audio.currentTime = playbackTime;
      }

      audio.play().catch((e) => {
        console.error('Playback failed:', e);
        setPlaying(false);
      });

      // Animation loop for time updates
      let lastStoreUpdate = 0;
      const updateTime = () => {
        const audio = audioRef.current;
        if (audio && !audio.paused && !isSeekingRef.current) {
          const now = performance.now();
          const currentTime = audio.currentTime;

          // Emit high-frequency tick for UI components - sanitize data for cross-context safety
          const tickEvent = new CustomEvent('playback-tick', {
            detail: JSON.parse(JSON.stringify({ time: currentTime }))
          });
          window.dispatchEvent(tickEvent);

          // Throttle Zustand store updates (10fps for data binding)
          if (now - lastStoreUpdate > 100) {
            setPlaybackTime(currentTime);
            lastStoreUpdate = now;
          }
        }
        if (isPlaying) {
          animationRef.current = requestAnimationFrame(updateTime);
        }
      };
      animationRef.current = requestAnimationFrame(updateTime);
    } else {
      audio.pause();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying, playbackSpeed, isMuted, isAudioReady, showPlayer, setPlaying, setPlaybackTime, playbackTime]);

  // Seek on canvas click
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const duration = audioFile?.duration;
    if (!duration) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const clickProgress = Math.max(0, Math.min(1, x / rect.width));
    const newTime = clickProgress * duration;

    isSeekingRef.current = true;
    setPlaybackTime(newTime);

    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }

    // Check if clicked on a segment
    const segments = currentPage?.segments || [];
    const clickedSegment = segments.find(seg => {
      const startX = (seg.startTime / duration) * rect.width;
      const endX = (seg.endTime / duration) * rect.width;
      return x >= startX && x <= endX;
    });

    if (clickedSegment) {
      selectSegment(clickedSegment.id, 'single');
    }

    setTimeout(() => {
      isSeekingRef.current = false;
    }, 50);
  }, [audioFile?.duration, currentPage?.segments, setPlaybackTime, selectSegment]);

  // File upload handler
  const handleUploadAudio = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const probeUrl = URL.createObjectURL(file);
      const audio = new Audio(probeUrl);

      await new Promise((resolve, reject) => {
        audio.onloadedmetadata = resolve;
        audio.onerror = reject;
        setTimeout(resolve, 5000); // Progress even if probe fails
      });

      const audioId = `audio_${Date.now()}`;
      const audioFileMetadata = {
        id: audioId,
        name: file.name,
        data: '', // Will be resolved
        duration: isFinite(audio.duration) ? audio.duration : 0,
        size: file.size,
        type: file.type || 'audio/mpeg',
        createdAt: Date.now()
      };

      // Save using the optimized binary pipeline
      await saveAudioFile(audioFileMetadata, file);

      // Resolve the usable local URL
      const finalUrl = await AudioResolver.resolve(audioId, audioId);

      setAudioFile({
        ...audioFileMetadata,
        data: finalUrl || ''
      });
      setPlaybackTime(0);
      URL.revokeObjectURL(probeUrl);
      toast.success(`Audio loaded: ${file.name}`);
    } catch (err) {
      console.error('Failed to load audio:', err);
      toast.error('Could not process audio file');
    } finally {
      e.target.value = '';
    }
  }, [setAudioFile, setPlaybackTime]);

  const handleRemoveAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    setAudioFile(null);
    setPlaybackTime(0);
    setPlaying(false);
    setIsAudioReady(false);
  }, [setAudioFile, setPlaybackTime, setPlaying]);

  const handleTogglePlay = useCallback(() => {
    if (!isAudioReady) return;
    if (!isPlaying) {
      stopAllExcept('visual-editor');
    }
    setPlaying(!isPlaying);
  }, [isPlaying, isAudioReady, setPlaying]);

  const handleSeek = useCallback((delta: number) => {
    const duration = audioFile?.duration || 0;
    const newTime = Math.max(0, Math.min(playbackTime + delta, duration));

    isSeekingRef.current = true;
    setPlaybackTime(newTime);

    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }

    setTimeout(() => {
      isSeekingRef.current = false;
    }, 50);
  }, [playbackTime, audioFile?.duration, setPlaybackTime]);

  const cycleSpeed = useCallback(() => {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIndex]);
  }, [playbackSpeed, setPlaybackSpeed]);

  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
  }, [isMuted]);

  return (
    <div className={cn('flex items-center gap-4 px-4 py-1.5 bg-background/80 backdrop-blur-md border-t border-border/50 shrink-0 min-h-[48px] max-h-[48px] overflow-hidden shadow-[0_-4px_12px_-8px_rgba(0,0,0,0.1)]', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {!audioFile ? (
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleUploadAudio}>
            <Upload size={12} className="mr-1.5" />
            Load Audio
          </Button>
        </div>
      ) : (
        <>
          {/* Playback controls */}
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary/10 transition-colors" onClick={() => handleSeek(-5)}>
                  <SkipBack size={13} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Back 5s</TooltipContent>
            </Tooltip>

            <Button
              variant="default"
              size="icon"
              className={cn(
                "h-8 w-8 rounded-full shadow-lg transition-all active:scale-95",
                isPlaying ? "bg-primary hover:bg-primary/90" : "bg-primary hover:bg-primary/90"
              )}
              onClick={handleTogglePlay}
              disabled={!isAudioReady}
            >
              {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
            </Button>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary/10 transition-colors" onClick={() => handleSeek(5)}>
                  <SkipForward size={13} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Forward 5s</TooltipContent>
            </Tooltip>
          </div>

          {/* Time display */}
          <div className="flex items-center bg-muted/20 px-2.5 py-1 rounded-full border border-border/10 shrink-0 text-[11px]">
            <div className="font-mono font-bold tabular-nums text-primary">
              <PlaybackTimeDisplay initialTime={playbackTime} />
            </div>
            <span className="font-mono text-muted-foreground/40 mx-1">
              /
            </span>
            <span className="font-mono text-muted-foreground tabular-nums">
              {formatTime(audioFile.duration)}
            </span>
          </div>

          {/* Waveform visualization - fixed height container */}
          <div
            ref={containerRef}
            className="flex-1 min-w-[120px] h-8 shrink min-h-0 overflow-hidden flex items-center bg-muted/10 rounded-lg relative border border-border/5"
          >
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="cursor-pointer w-full h-8 block"
              style={{ height: WAVEFORM_HEIGHT, minHeight: WAVEFORM_HEIGHT }}
            />
          </div>

          {/* Mute button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-muted/50 rounded-full"
                onClick={toggleMute}
              >
                {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{isMuted ? 'Unmute' : 'Mute'}</TooltipContent>
          </Tooltip>

          {/* Speed control */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[10px] font-mono font-bold gap-1 blur-none hover:bg-muted/50 rounded-full"
                onClick={cycleSpeed}
              >
                <Gauge size={11} className="text-primary" />
                {playbackSpeed}x
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Playback speed</TooltipContent>
          </Tooltip>

          {/* Remove audio */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={handleRemoveAudio}
              >
                <X size={11} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Remove audio</TooltipContent>
          </Tooltip>
        </>
      )}
    </div>
  );
});

AudioWaveform.displayName = 'AudioWaveform';
