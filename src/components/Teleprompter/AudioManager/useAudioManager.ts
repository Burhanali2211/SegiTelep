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
import { AudioResolver } from '@/core/storage/AudioResolver';
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

  // Add audio file with memory-efficient binary handling
  const addAudioFile = useCallback(async (file: File): Promise<AudioFile | null> => {
    // Lenient type check to support "all types of audio"
    const isAudio = file.type.startsWith('audio/') ||
      /\.(mp3|wav|ogg|m4a|aac|flac|webm|mp4|wma|aiff)$/i.test(file.name);

    if (!isAudio) {
      toast.error(`Unsupported file type: ${file.name}`);
      return null;
    }

    // Validate file size (only for web storage)
    if (!isDesktopAudioStorage() && file.size > MAX_FILE_SIZE) {
      toast.error(`File too large. Maximum size is 50MB for web storage.`);
      return null;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    // Probing duration using a temporary Blob URL (memory efficient)
    const probeUrl = URL.createObjectURL(file);
    const audio = new Audio(probeUrl);

    return new Promise((resolve) => {
      // Timeout factor for extremely large files
      const timeout = setTimeout(() => {
        if (state.isLoading) {
          // If metadata is slow, proceed with 0 duration rather than hanging
          saveWithDuration(0);
        }
      }, 15000);

      async function saveWithDuration(duration: number) {
        clearTimeout(timeout);
        URL.revokeObjectURL(probeUrl);

        const newFileId = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newFile: AudioFile = {
          id: newFileId,
          name: file.name.replace(/\.[^/.]+$/, ''),
          data: '',
          duration: isFinite(duration) ? duration : 0,
          size: file.size,
          type: file.type || 'audio/mpeg',
          createdAt: Date.now(),
        };

        try {
          await saveAudioFile(newFile, file);
          const usableUrl = await AudioResolver.resolve(newFileId, newFileId);
          const updatedFile = { ...newFile, data: usableUrl || '' };

          setState(prev => ({
            ...prev,
            audioFiles: [...prev.audioFiles, updatedFile],
            isLoading: false,
          }));

          toast.success(`Audio added: ${newFile.name}`);
          resolve(updatedFile);
        } catch (e) {
          console.error('Storage error:', e);
          toast.error('Failed to save audio file');
          setState(prev => ({ ...prev, isLoading: false }));
          resolve(null);
        }
      }

      audio.onloadedmetadata = () => saveWithDuration(audio.duration);
      audio.onerror = () => saveWithDuration(0); // Proceed even if metadata fails
    });
  }, [state.isLoading]);

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

      // Set volume
      audio.volume = state.volume / 100;

      const startPlayback = async () => {
        const audioUrl = await AudioResolver.resolve(audioFile.id, audioFile.id);
        if (!audioUrl && audioFile.data) {
          // Fallback to data if resolve fails
          audio.src = audioFile.data;
        } else if (audioUrl) {
          audio.src = audioUrl;
        } else {
          toast.error('Could not resolve audio source');
          setState(prev => ({ ...prev, playingId: null }));
          return;
        }

        audio.load();
        audioRef.current = audio;
        setState(prev => ({ ...prev, playingId: audioFile.id }));
      };

      startPlayback();
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
