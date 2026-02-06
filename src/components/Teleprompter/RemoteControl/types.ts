// Remote Control Type Definitions

export type RemoteCommand = 
  | 'play'
  | 'pause'
  | 'stop'
  | 'next'
  | 'previous'
  | 'speed-up'
  | 'speed-down'
  | 'toggle-mirror';

export interface RemoteMessage {
  type: 'command' | 'status' | 'ping' | 'pong';
  command?: RemoteCommand;
  timestamp: number;
  source: 'controller' | 'player';
}

export interface PlaybackStatus {
  isPlaying: boolean;
  isPaused: boolean;
  speed: number;
  currentSegmentIndex: number;
  totalSegments: number;
  projectName: string;
}

export const BROADCAST_CHANNEL_NAME = 'teleprompter-remote-control';
export const STORAGE_EVENT_KEY = 'teleprompter-remote-command';
