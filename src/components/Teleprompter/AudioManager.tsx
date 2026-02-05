import React, { memo, useCallback, useState, useRef, useEffect } from 'react';
import { useTeleprompterStore } from '@/store/teleprompterStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Music,
  Upload,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Trash2,
  CheckCircle,
} from 'lucide-react';

interface AudioFile {
  id: string;
  name: string;
  data: string;
  duration: number;
}

interface AudioManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  segmentId?: string;
}

export const AudioManager = memo<AudioManagerProps>(({
  open,
  onOpenChange,
  segmentId,
}) => {
  const project = useTeleprompterStore((s) => s.project);
  const updateSegment = useTeleprompterStore((s) => s.updateSegment);
  
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [volume, setVolume] = useState(100);
  const [autoAdvance, setAutoAdvance] = useState(true);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current segment
  const segment = segmentId
    ? project?.segments.find((s) => s.id === segmentId)
    : null;

  // Load stored audio files from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('teleprompter_audio_files');
    if (stored) {
      try {
        setAudioFiles(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load audio files:', e);
      }
    }
  }, []);

  // Save audio files to localStorage
  useEffect(() => {
    localStorage.setItem('teleprompter_audio_files', JSON.stringify(audioFiles));
  }, [audioFiles]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      // Check file type
      if (!file.type.startsWith('audio/')) {
        alert(`${file.name} is not an audio file`);
        continue;
      }

      // Check file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        alert(`${file.name} is too large (max 50MB)`);
        continue;
      }

      // Read file as data URL
      const reader = new FileReader();
      reader.onload = (event) => {
        const data = event.target?.result as string;
        
        // Get audio duration
        const audio = new Audio(data);
        audio.onloadedmetadata = () => {
          const newFile: AudioFile = {
            id: `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: file.name.replace(/\.[^/.]+$/, ''),
            data,
            duration: audio.duration,
          };
          
          setAudioFiles((prev) => [...prev, newFile]);
        };
      };
      reader.readAsDataURL(file);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handlePlay = useCallback((audioFile: AudioFile) => {
    if (playingId === audioFile.id) {
      // Stop playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingId(null);
    } else {
      // Start playing
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const audio = new Audio(audioFile.data);
      audio.volume = volume / 100;
      audio.onended = () => setPlayingId(null);
      audio.play();
      
      audioRef.current = audio;
      setPlayingId(audioFile.id);
    }
  }, [playingId, volume]);

  const handleDelete = useCallback((id: string) => {
    if (playingId === id && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlayingId(null);
    }
    
    setAudioFiles((prev) => prev.filter((f) => f.id !== id));
    
    if (selectedAudioId === id) {
      setSelectedAudioId(null);
    }
  }, [playingId, selectedAudioId]);

  const handleAssign = useCallback(() => {
    if (!segmentId || !selectedAudioId) return;
    
    // In a real app, you'd store audio reference differently
    // For now, we'll store the audio ID in the segment
    updateSegment(segmentId, {
      // We'll extend the segment type to include audioId
      // For now, store in content as metadata
    } as any);
    
    onOpenChange(false);
  }, [segmentId, selectedAudioId, updateSegment, onOpenChange]);

  // Update volume for playing audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music size={20} />
            {segmentId ? 'Assign Audio to Segment' : 'Audio Library'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Upload button */}
          <div className="flex items-center gap-4">
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload size={16} className="mr-2" />
              Add Audio Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <span className="text-xs text-muted-foreground">
              Supports MP3, WAV, OGG, M4A (max 50MB)
            </span>
          </div>

          {/* Audio list */}
          <ScrollArea className="flex-1">
            <div className="space-y-2 pr-4">
              {audioFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Music size={48} className="text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No audio files yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload audio files to use with your segments
                  </p>
                </div>
              ) : (
                audioFiles.map((audioFile) => (
                  <div
                    key={audioFile.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                      selectedAudioId === audioFile.id
                        ? 'border-primary bg-primary/5'
                        : 'border-transparent bg-card hover:bg-secondary'
                    }`}
                    onClick={() => setSelectedAudioId(audioFile.id)}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlay(audioFile);
                      }}
                    >
                      {playingId === audioFile.id ? (
                        <Pause size={18} />
                      ) : (
                        <Play size={18} />
                      )}
                    </Button>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{audioFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDuration(audioFile.duration)}
                      </p>
                    </div>
                    
                    {selectedAudioId === audioFile.id && (
                      <CheckCircle size={18} className="text-primary shrink-0" />
                    )}
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(audioFile.id);
                      }}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Volume control */}
          <div className="flex items-center gap-4 pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setVolume(volume > 0 ? 0 : 100)}
            >
              {volume > 0 ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </Button>
            <Slider
              value={[volume]}
              onValueChange={([v]) => setVolume(v)}
              min={0}
              max={100}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground w-12 text-right">
              {volume}%
            </span>
          </div>

          {/* Auto-advance option */}
          {segmentId && (
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div>
                <Label className="text-sm">Auto-advance when audio ends</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically go to next segment when audio finishes
                </p>
              </div>
              <Switch
                checked={autoAdvance}
                onCheckedChange={setAutoAdvance}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {segmentId ? 'Cancel' : 'Close'}
          </Button>
          {segmentId && (
            <Button onClick={handleAssign} disabled={!selectedAudioId}>
              Assign Audio
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

AudioManager.displayName = 'AudioManager';

export default AudioManager;
