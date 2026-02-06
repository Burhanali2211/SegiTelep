import { useState, useCallback, useRef, useEffect } from 'react';
import { AudioFile, AudioManagerState, AUDIO_STORAGE_KEY, SUPPORTED_AUDIO_TYPES, MAX_FILE_SIZE } from './types';
import { toast } from 'sonner';

export function useAudioManager() {
  const [state, setState] = useState<AudioManagerState>({
    audioFiles: [],
    selectedAudioId: null,
    playingId: null,
    volume: 100,
    isLoading: false,
  });
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load audio files from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(AUDIO_STORAGE_KEY);
    if (stored) {
      try {
        const files = JSON.parse(stored) as AudioFile[];
        setState(prev => ({ ...prev, audioFiles: files }));
      } catch (e) {
        console.error('Failed to load audio files:', e);
      }
    }
  }, []);

  // Save audio files to localStorage
  const saveToStorage = useCallback((files: AudioFile[]) => {
    try {
      localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(files));
    } catch (e) {
      console.error('Failed to save audio files:', e);
      toast.error('Failed to save audio library. Storage may be full.');
    }
  }, []);

  // Add audio file
  const addAudioFile = useCallback(async (file: File): Promise<AudioFile | null> => {
    // Validate file type
    if (!SUPPORTED_AUDIO_TYPES.includes(file.type)) {
      toast.error(`Unsupported audio format: ${file.type}`);
      return null;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File too large. Maximum size is 50MB.`);
      return null;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    return new Promise((resolve) => {
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
            size: file.size,
            type: file.type,
            createdAt: Date.now(),
          };

          setState(prev => {
            const newFiles = [...prev.audioFiles, newFile];
            saveToStorage(newFiles);
            return { ...prev, audioFiles: newFiles, isLoading: false };
          });

          toast.success(`Added: ${newFile.name}`);
          resolve(newFile);
        };

        audio.onerror = () => {
          toast.error('Failed to load audio file');
          setState(prev => ({ ...prev, isLoading: false }));
          resolve(null);
        };
      };

      reader.onerror = () => {
        toast.error('Failed to read audio file');
        setState(prev => ({ ...prev, isLoading: false }));
        resolve(null);
      };

      reader.readAsDataURL(file);
    });
  }, [saveToStorage]);

  // Delete audio file
  const deleteAudioFile = useCallback((id: string) => {
    // Stop if playing
    if (state.playingId === id && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setState(prev => {
      const newFiles = prev.audioFiles.filter(f => f.id !== id);
      saveToStorage(newFiles);
      return {
        ...prev,
        audioFiles: newFiles,
        playingId: prev.playingId === id ? null : prev.playingId,
        selectedAudioId: prev.selectedAudioId === id ? null : prev.selectedAudioId,
      };
    });

    toast.success('Audio file removed');
  }, [state.playingId, saveToStorage]);

  // Rename audio file
  const renameAudioFile = useCallback((id: string, newName: string) => {
    setState(prev => {
      const newFiles = prev.audioFiles.map(f =>
        f.id === id ? { ...f, name: newName } : f
      );
      saveToStorage(newFiles);
      return { ...prev, audioFiles: newFiles };
    });
  }, [saveToStorage]);

  // Play/pause audio
  const togglePlayback = useCallback((audioFile: AudioFile) => {
    if (state.playingId === audioFile.id) {
      // Stop playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setState(prev => ({ ...prev, playingId: null }));
    } else {
      // Start playing
      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(audioFile.data);
      audio.volume = state.volume / 100;
      audio.onended = () => setState(prev => ({ ...prev, playingId: null }));
      audio.play();

      audioRef.current = audio;
      setState(prev => ({ ...prev, playingId: audioFile.id }));
    }
  }, [state.playingId, state.volume]);

  // Stop all playback
  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setState(prev => ({ ...prev, playingId: null }));
  }, []);

  // Set volume
  const setVolume = useCallback((volume: number) => {
    setState(prev => ({ ...prev, volume }));
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setVolume(state.volume > 0 ? 0 : 100);
  }, [state.volume, setVolume]);

  // Select audio
  const selectAudio = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, selectedAudioId: id }));
  }, []);

  // Get audio by ID
  const getAudioById = useCallback((id: string): AudioFile | undefined => {
    return state.audioFiles.find(f => f.id === id);
  }, [state.audioFiles]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  return {
    ...state,
    addAudioFile,
    deleteAudioFile,
    renameAudioFile,
    togglePlayback,
    stopPlayback,
    setVolume,
    toggleMute,
    selectAudio,
    getAudioById,
  };
}
