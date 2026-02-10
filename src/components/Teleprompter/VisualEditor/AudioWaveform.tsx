import React, { memo, useCallback, useRef, useEffect, useState } from 'react';
import { useVisualEditorState, formatTime } from './useVisualEditorState';
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
  Library,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const WAVEFORM_HEIGHT = 36;

/** Resolve CSS variable for canvas - canvas does not support var() in fillStyle */
function getCanvasColor(varName: string, alpha?: number): string {
  try {
    const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    if (!value) return alpha !== undefined ? `hsla(0,0%,50%,${alpha})` : 'hsl(0,0%,50%)';
    return alpha !== undefined ? `hsla(${value.replace(/\s+/g, ', ')}, ${alpha})` : `hsl(${value.replace(/\s+/g, ', ')})`;
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
  
  // Create and setup audio element
  useEffect(() => {
    if (!audioFile?.data) {
      setWaveformData([]);
      setIsAudioReady(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      return;
    }
    
    const audio = new Audio(audioFile.data);
    audio.preload = 'auto';
    
    audio.onloadedmetadata = () => {
      setIsAudioReady(true);
    };
    
    audio.onended = () => {
      setPlaying(false);
      setPlaybackTime(0);
    };
    
    audio.onerror = (e) => {
      console.error('Audio error:', e);
      setIsAudioReady(false);
    };
    
    audioRef.current = audio;
    
    // Generate waveform data - decode from data URL
    const decodeAndExtractWaveform = async () => {
      const audioContext = new AudioContext();
      try {
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
        let arrayBuffer: ArrayBuffer;
        if (audioFile.data.startsWith('data:')) {
          const base64 = audioFile.data.split(',')[1];
          if (!base64) throw new Error('Invalid data URL');
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          arrayBuffer = bytes.buffer;
        } else {
          const res = await fetch(audioFile.data);
          arrayBuffer = await res.arrayBuffer();
        }
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const rawData = audioBuffer.getChannelData(0);
        const samples = 150;
        const blockSize = Math.floor(rawData.length / samples);
        const filteredData: number[] = [];
        
        for (let i = 0; i < samples; i++) {
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[i * blockSize + j]);
          }
          filteredData.push(sum / blockSize);
        }
        
        const maxVal = Math.max(...filteredData) || 1;
        const normalized = filteredData.map(v => v / maxVal);
        setWaveformData(normalized);
      } catch (err) {
        console.error('Waveform extraction failed:', err);
        setWaveformData([]);
      } finally {
        await audioContext.close();
      }
    };
    decodeAndExtractWaveform();
    
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
  
  // Draw waveform visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    const w = canvasWidth || containerRef.current?.offsetWidth || 0;
    if (w <= 0) return;
    
    const height = WAVEFORM_HEIGHT;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);
    
    const muted = getCanvasColor('--muted', 0.5);
    const primary = getCanvasColor('--primary');
    const primaryAlpha12 = getCanvasColor('--primary', 0.12);
    const primaryAlpha4 = getCanvasColor('--primary', 0.4);
    const mutedFg35 = getCanvasColor('--muted-foreground', 0.35);
    const mutedFg2 = getCanvasColor('--muted-foreground', 0.2);
    const mutedFg3 = getCanvasColor('--muted-foreground', 0.3);
    const destructive = getCanvasColor('--destructive');
    
    ctx.fillStyle = muted;
    ctx.fillRect(0, 0, w, height);
    
    const duration = audioFile?.duration || 1;
    const progress = Math.min(playbackTime / duration, 1);
    
    const segments = currentPage?.segments || [];
    segments.forEach(segment => {
      if (segment.isHidden) return;
      const startX = (segment.startTime / duration) * w;
      const endX = (segment.endTime / duration) * w;
      ctx.fillStyle = primaryAlpha12;
      ctx.fillRect(startX, 0, endX - startX, height);
      ctx.strokeStyle = primaryAlpha4;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(startX, 0);
      ctx.lineTo(startX, height);
      ctx.stroke();
    });
    
    if (waveformData.length > 0) {
      const barWidth = w / waveformData.length;
      const barGap = 1;
      
      waveformData.forEach((val, i) => {
        const x = i * barWidth;
        const barHeight = Math.max(2, val * (height - 8));
        const y = (height - barHeight) / 2;
        const barProgress = i / waveformData.length;
        const isPlayed = barProgress < progress;
        ctx.fillStyle = isPlayed ? primary : mutedFg35;
        ctx.fillRect(x, y, barWidth - barGap, barHeight);
      });
    } else {
      ctx.fillStyle = mutedFg2;
      ctx.fillRect(0, height / 2 - 2, w, 4);
      ctx.fillStyle = primary;
      ctx.fillRect(0, height / 2 - 2, w * progress, 4);
    }
    
    const playheadX = progress * w;
    ctx.fillStyle = destructive;
    ctx.fillRect(playheadX - 1, 0, 2, height);
    
    const timeMarkerCount = Math.min(5, Math.floor(duration / 30));
    if (timeMarkerCount > 0) {
      ctx.fillStyle = mutedFg3;
      ctx.font = '8px monospace';
      for (let i = 1; i <= timeMarkerCount; i++) {
        const markerTime = (duration / (timeMarkerCount + 1)) * i;
        const markerX = (markerTime / duration) * w;
        ctx.fillRect(markerX, height - 3, 1, 3);
      }
    }
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
      const updateTime = () => {
        if (audioRef.current && !audioRef.current.paused && !isSeekingRef.current) {
          setPlaybackTime(audioRef.current.currentTime);
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
  
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result as string;
      if (data) {
        const audio = new Audio(data);
        audio.onloadedmetadata = () => {
          setAudioFile({
            id: crypto.randomUUID(),
            name: file.name,
            data,
            duration: audio.duration,
          });
          setPlaybackTime(0);
        };
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
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
    <div className={cn('flex items-center gap-1.5 px-2 py-1.5 bg-muted/30 border-t border-border shrink-0 min-h-[44px] max-h-[44px] overflow-hidden', className)}>
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
          {onOpenAudioLibrary && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onOpenAudioLibrary}>
                  <Library size={12} className="mr-1.5" />
                  From Library
                </Button>
              </TooltipTrigger>
              <TooltipContent>Load from Audio Library</TooltipContent>
            </Tooltip>
          )}
        </div>
      ) : (
        <>
          {/* Playback controls */}
          <div className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleSeek(-5)}>
                  <SkipBack size={11} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">-5s</TooltipContent>
            </Tooltip>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7" 
              onClick={handleTogglePlay}
              disabled={!isAudioReady}
            >
              {isPlaying ? <Pause size={13} /> : <Play size={13} />}
            </Button>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleSeek(5)}>
                  <SkipForward size={11} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">+5s</TooltipContent>
            </Tooltip>
          </div>
          
          {/* Time display - single line MM:SS.CC format */}
          <div className="flex items-center min-w-[100px] shrink-0">
            <span className="text-[11px] font-mono font-medium tabular-nums text-foreground">
              {formatTime(playbackTime)}
            </span>
            <span className="text-[11px] font-mono text-muted-foreground tabular-nums mx-0.5">
              /
            </span>
            <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
              {formatTime(audioFile.duration)}
            </span>
          </div>
          
          {/* Waveform visualization - fixed height container */}
          <div 
            ref={containerRef} 
            className="flex-1 min-w-[80px] h-9 shrink min-h-0 overflow-hidden flex items-center"
          >
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="cursor-pointer rounded w-full h-9 block"
              style={{ height: WAVEFORM_HEIGHT, minHeight: WAVEFORM_HEIGHT }}
            />
          </div>
          
          {/* Mute button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={toggleMute}
              >
                {isMuted ? <VolumeX size={11} /> : <Volume2 size={11} />}
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
                className="h-6 px-1.5 text-[10px] font-mono gap-0.5"
                onClick={cycleSpeed}
              >
                <Gauge size={9} />
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
