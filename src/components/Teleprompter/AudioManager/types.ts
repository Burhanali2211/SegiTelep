// Audio Manager Type Definitions

export interface AudioFile {
  id: string;
  name: string;
  data: string; // Base64 data URL
  duration: number; // seconds
  size: number; // bytes
  type: string; // MIME type
  createdAt: number;
}

export interface AudioManagerState {
  audioFiles: AudioFile[];
  selectedAudioId: string | null;
  playingId: string | null;
  volume: number;
  isLoading: boolean;
}

export interface AudioAssignment {
  segmentId: string;
  audioId: string;
  autoAdvance: boolean;
}

export const SUPPORTED_AUDIO_TYPES = [
  'audio/mpeg',      // MP3
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/ogg',
  'audio/m4a',
  'audio/x-m4a',
  'audio/mp4',
  'audio/aac',
];

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const AUDIO_STORAGE_KEY = 'teleprompter_audio_files';
