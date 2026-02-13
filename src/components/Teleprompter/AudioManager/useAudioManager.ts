import { useState, useCallback, useRef, useEffect } from 'react';
import { stopAllExcept, registerStopCallback } from '@/utils/audioPlaybackCoordinator';
import { AudioFile, AudioManagerState, SUPPORTED_AUDIO_TYPES, MAX_FILE_SIZE } from './types';
import {
  getAllAudioFiles,
  saveAudioFile,
  deleteAudioFile as deleteAudioFromStorage,
  renameAudioFile as renameAudioInStorage,
  isDesktopAudioStorage
} from '@/core/storage/AudioStorage';
import { toast } from 'sonner';

// Audio playback error recovery
const MAX_PLAYBACK_RETRIES = 2;

export function useAudioManager() {
  const [state, setState] = useState<AudioManagerState>({
    audioFiles: [],
    selectedAudioId: null,
    playingId: null,
    volume: 100,
    isLoading: false,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackRetryRef = useRef(0);

  // Cleanup audio element safely
  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current.load();
      } catch (e) {
        // Ignore cleanup errors
      }
      audioRef.current = null;
    }
  }, []);

  // Load audio files from storage on mount
  useEffect(() => {
    const loadFiles = async () => {
      setState(prev => ({ ...prev, isLoading: true }));
      try {
        const files = await getAllAudioFiles();
        setState(prev => ({ ...prev, audioFiles: files, isLoading: false }));
      } catch (e) {
        console.error('Failed to load audio files:', e);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };
    loadFiles();

    // Cleanup on unmount
    return () => {
      cleanupAudio();
    };
  }, [cleanupAudio]);

  // Add audio file
  const addAudioFile = useCallback(async (file: File): Promise<AudioFile | null> => {
    // Validate file type
    if (!SUPPORTED_AUDIO_TYPES.includes(file.type)) {
      toast.error(`Unsupported audio format: ${file.type}`);
      return null;
    }

    // Validate file size (only for web storage)
    if (!isDesktopAudioStorage() && file.size > MAX_FILE_SIZE) {
      toast.error(`File too large. Maximum size is 50MB for web storage.`);
      return null;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const data = event.target?.result as string;

        // Get audio duration
        const audio = new Audio(data);
        audio.onloadedmetadata = async () => {
          const newFile: AudioFile = {
            id: `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: file.name.replace(/\.[^/.]+$/, ''),
            data,
            duration: audio.duration,
            size: file.size,
            type: file.type,
            createdAt: Date.now(),
          };

          try {
            await saveAudioFile(newFile);
            setState(prev => ({
              ...prev,
              audioFiles: [...prev.audioFiles, newFile],
              isLoading: false,
            }));
            toast.success(`Added: ${newFile.name}`);
            resolve(newFile);
          } catch (e) {
            console.error('Failed to save audio file:', e);
            const msg = e instanceof Error ? e.message : 'Unknown error';
            const isQuota = /quota|storage|full|limit/i.test(msg) || (e instanceof Error && e.name === 'QuotaExceededError');
            toast.error(isQuota
              ? 'Storage limit reached. Delete some audio files or use the desktop app.'
              : `Failed to save: ${msg}`);
            setState(prev => ({ ...prev, isLoading: false }));
            resolve(null);
          }
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
  }, []);

  // Delete audio file
  const deleteAudioFile = useCallback(async (id: string) => {
    // Stop if playing
    if (state.playingId === id) {
      cleanupAudio();
    }

    try {
      await deleteAudioFromStorage(id);
      setState(prev => ({
        ...prev,
        audioFiles: prev.audioFiles.filter(f => f.id !== id),
        playingId: prev.playingId === id ? null : prev.playingId,
        selectedAudioId: prev.selectedAudioId === id ? null : prev.selectedAudioId,
      }));
      toast.success('Audio file removed');
    } catch (e) {
      console.error('Failed to delete audio file:', e);
      toast.error('Failed to delete audio file');
    }
  }, [state.playingId, cleanupAudio]);

  // Rename audio file
  const renameAudioFile = useCallback(async (id: string, newName: string) => {
    try {
      await renameAudioInStorage(id, newName);
      setState(prev => ({
        ...prev,
        audioFiles: prev.audioFiles.map(f =>
          f.id === id ? { ...f, name: newName } : f
        ),
      }));
    } catch (e) {
      console.error('Failed to rename audio file:', e);
      toast.error('Failed to rename audio file');
    }
  }, []);

  // Register stop callback so others can stop us when they start
  useEffect(() => {
    return registerStopCallback('audio-manager', () => {
      cleanupAudio();
      setState(prev => ({ ...prev, playingId: null }));
      playbackRetryRef.current = 0;
    });
  }, [cleanupAudio]);

  // Play/pause audio with error recovery
  const togglePlayback = useCallback((audioFile: AudioFile) => {
    if (state.playingId === audioFile.id) {
      // Stop playing
      cleanupAudio();
      setState(prev => ({ ...prev, playingId: null }));
      playbackRetryRef.current = 0;
    } else {
      // Stop other audio sources before starting
      stopAllExcept('audio-manager');
      // Start playing
      cleanupAudio();
      playbackRetryRef.current = 0;

      const audio = new Audio();

      // Set up error handling before loading
      audio.onerror = (e) => {
        console.error('Audio playback error:', e);

        // Retry playback a few times
        if (playbackRetryRef.current < MAX_PLAYBACK_RETRIES) {
          playbackRetryRef.current++;
          setTimeout(() => togglePlayback(audioFile), 500);
        } else {
          setState(prev => ({ ...prev, playingId: null }));
          toast.error('Failed to play audio. The file may be corrupted.');
          playbackRetryRef.current = 0;
        }
      };

      audio.onended = () => {
        setState(prev => ({ ...prev, playingId: null }));
        playbackRetryRef.current = 0;
      };

      audio.oncanplaythrough = () => {
        audio.play().catch((err) => {
          console.error('Audio play() failed:', err);
          setState(prev => ({ ...prev, playingId: null }));
        });
      };

      // Set volume and source
      audio.volume = state.volume / 100;
      audio.src = audioFile.data;
      audio.load();

      audioRef.current = audio;
      setState(prev => ({ ...prev, playingId: audioFile.id }));
    }
  }, [state.playingId, state.volume, cleanupAudio]);

  // Stop all playback
  const stopPlayback = useCallback(() => {
    cleanupAudio();
    setState(prev => ({ ...prev, playingId: null }));
    playbackRetryRef.current = 0;
  }, [cleanupAudio]);

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
