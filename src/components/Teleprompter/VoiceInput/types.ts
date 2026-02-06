// Voice Input Type Definitions

export interface VoiceInputState {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  language: string;
  continuous: boolean;
}

export type VoiceCommand = 
  | 'play'
  | 'pause'
  | 'stop'
  | 'next'
  | 'previous'
  | 'faster'
  | 'slower';

export interface VoiceCommandConfig {
  command: VoiceCommand;
  triggers: string[];
  description: string;
}

export const DEFAULT_VOICE_COMMANDS: VoiceCommandConfig[] = [
  { command: 'play', triggers: ['play', 'start', 'go', 'begin'], description: 'Start playback' },
  { command: 'pause', triggers: ['pause', 'wait', 'hold'], description: 'Pause playback' },
  { command: 'stop', triggers: ['stop', 'end', 'finish'], description: 'Stop playback' },
  { command: 'next', triggers: ['next', 'forward', 'skip'], description: 'Next segment' },
  { command: 'previous', triggers: ['previous', 'back', 'before'], description: 'Previous segment' },
  { command: 'faster', triggers: ['faster', 'speed up', 'quicker'], description: 'Increase speed' },
  { command: 'slower', triggers: ['slower', 'speed down', 'slower'], description: 'Decrease speed' },
];

export const SUPPORTED_LANGUAGES = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'es-ES', name: 'Spanish (Spain)' },
  { code: 'es-MX', name: 'Spanish (Mexico)' },
  { code: 'fr-FR', name: 'French' },
  { code: 'de-DE', name: 'German' },
  { code: 'it-IT', name: 'Italian' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'ja-JP', name: 'Japanese' },
  { code: 'ko-KR', name: 'Korean' },
  { code: 'hi-IN', name: 'Hindi' },
  { code: 'ar-SA', name: 'Arabic' },
];
