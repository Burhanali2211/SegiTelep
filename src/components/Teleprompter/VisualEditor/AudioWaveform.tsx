import React, { memo, useCallback, useRef, useEffect, useState } from 'react';
import { useVisualEditorState, formatTime } from './useVisualEditorState';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward,
  Volume2,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioWaveformProps {
  className?: string;
}

export const AudioWaveform = memo<AudioWaveformProps>(({ className }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [canvasWidth, setCanvasWidth] = useState(0);
  
  const audioFile = useVisualEditorState((s) => s.audioFile);
  const playbackTime = useVisualEditorState((s) => s.playbackTime);
  const isPlaying = useVisualEditorState((s) => s.isPlaying);
  const playbackSpeed = useVisualEditorState((s) => s.playbackSpeed);
  const currentPage = useVisualEditorState((s) => s.getCurrentPage());
  
  const setAudioFile = useVisualEditorState((s) => s.setAudioFile);
  const setPlaybackTime = useVisualEditorState((s) => s.setPlaybackTime);
  const setPlaying = useVisualEditorState((s) => s.setPlaying);
  const setPlaybackSpeed = useVisualEditorState((s) => s.setPlaybackSpeed);
  const selectSegment = useVisualEditorState((s) => s.selectSegment);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Load audio and generate waveform
  useEffect(() => {
    if (!audioFile?.data) {
      setWaveformData([]);
      return;
    }
    
    const audio = new Audio(audioFile.data);
    audioRef.current = audio;
    
    const audioContext = new AudioContext();
    
    fetch(audioFile.data)
      .then(res => res.arrayBuffer())
      .then(buffer => audioContext.decodeAudioData(buffer))
      .then(audioBuffer => {
        const rawData = audioBuffer.getChannelData(0);
        const samples = 200;
        const blockSize = Math.floor(rawData.length / samples);
        const filteredData: number[] = [];
        
        for (let i = 0; i < samples; i++) {
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[i * blockSize + j]);
          }
          filteredData.push(sum / blockSize);
        }
        
        const maxVal = Math.max(...filteredData);
        const normalized = filteredData.map(v => v / maxVal);
        setWaveformData(normalized);
      })
      .catch(console.error);
    
    return () => {
      audio.pause();
    };
  }, [audioFile?.data]);
  
  // Resize canvas
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateSize = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) setCanvasWidth(rect.width);
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  
  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || canvasWidth === 0) return;
    
    const height = 50;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);
    
    // Background
    ctx.fillStyle = 'hsl(var(--muted))';
    ctx.fillRect(0, 0, canvasWidth, height);
    
    if (waveformData.length === 0) return;
    
    const barWidth = canvasWidth / waveformData.length;
    const duration = audioFile?.duration || 1;
    const progress = playbackTime / duration;
    
    // Draw segments as colored regions
    const segments = currentPage?.segments || [];
    segments.forEach(segment => {
      if (segment.isHidden) return;
      const startX = (segment.startTime / duration) * canvasWidth;
      const endX = (segment.endTime / duration) * canvasWidth;
      ctx.fillStyle = 'hsla(var(--primary), 0.2)';
      ctx.fillRect(startX, 0, endX - startX, height);
    });
    
    // Draw waveform bars
    waveformData.forEach((val, i) => {
      const x = i * barWidth;
      const barHeight = val * (height - 10);
      const y = (height - barHeight) / 2;
      
      const isPlayed = i / waveformData.length < progress;
      ctx.fillStyle = isPlayed ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))';
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    });
    
    // Draw playhead
    const playheadX = progress * canvasWidth;
    ctx.strokeStyle = 'hsl(var(--destructive))';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();
  }, [waveformData, canvasWidth, playbackTime, audioFile?.duration, currentPage?.segments]);
  
  // Playback sync
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    if (isPlaying) {
      audio.currentTime = playbackTime;
      audio.playbackRate = playbackSpeed;
      audio.play().catch(() => {});
      
      const update = () => {
        setPlaybackTime(audio.currentTime);
        if (!audio.paused) {
          animationRef.current = requestAnimationFrame(update);
        }
      };
      animationRef.current = requestAnimationFrame(update);
    } else {
      audio.pause();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, setPlaybackTime]);
  
  // Seek on canvas click
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!audioFile?.duration) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const progress = x / rect.width;
    const newTime = progress * audioFile.duration;
    setPlaybackTime(newTime);
    
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    
    // Check if clicked on a segment marker
    const segments = currentPage?.segments || [];
    const clickedSegment = segments.find(seg => {
      const startX = (seg.startTime / audioFile.duration) * rect.width;
      const endX = (seg.endTime / audioFile.duration) * rect.width;
      return x >= startX && x <= endX;
    });
    
    if (clickedSegment) {
      selectSegment(clickedSegment.id, 'single');
    }
  }, [audioFile?.duration, currentPage?.segments, setPlaybackTime, selectSegment]);
  
  // Upload handler
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
        };
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [setAudioFile]);
  
  const handleTogglePlay = useCallback(() => {
    setPlaying(!isPlaying);
  }, [isPlaying, setPlaying]);
  
  const handleSeek = useCallback((delta: number) => {
    const newTime = Math.max(0, Math.min(playbackTime + delta, audioFile?.duration || 0));
    setPlaybackTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  }, [playbackTime, audioFile?.duration, setPlaybackTime]);
  
  return (
    <div className={cn('flex items-center gap-3 px-3 py-2 bg-muted/30 border-t border-border', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleFileChange}
      />
      
      {!audioFile ? (
        <Button variant="outline" size="sm" onClick={handleUploadAudio}>
          <Upload size={14} className="mr-1" />
          Load Audio
        </Button>
      ) : (
        <>
          {/* Playback controls */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSeek(-5)}>
              <SkipBack size={14} />
            </Button>
            
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleTogglePlay}>
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </Button>
            
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSeek(5)}>
              <SkipForward size={14} />
            </Button>
          </div>
          
          {/* Time display */}
          <span className="text-xs font-mono min-w-[80px]">
            {formatTime(playbackTime)} / {formatTime(audioFile.duration)}
          </span>
          
          {/* Waveform */}
          <div ref={containerRef} className="flex-1 min-w-0">
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="cursor-pointer rounded"
            />
          </div>
          
          {/* Speed control */}
          <div className="flex items-center gap-2">
            <Volume2 size={14} className="text-muted-foreground" />
            <div className="w-20">
              <Slider
                value={[playbackSpeed]}
                onValueChange={([v]) => setPlaybackSpeed(v)}
                min={0.5}
                max={2}
                step={0.25}
                className="h-1"
              />
            </div>
            <span className="text-xs text-muted-foreground w-8">{playbackSpeed}x</span>
          </div>
        </>
      )}
    </div>
  );
});

AudioWaveform.displayName = 'AudioWaveform';
