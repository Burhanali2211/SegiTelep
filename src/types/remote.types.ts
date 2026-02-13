// Remote control type definitions

export interface RemoteCommand {
  type: string;
  value?: unknown;
  timestamp: number;
}

export interface RemoteStatus {
  is_playing: boolean;
  current_speed: number;
  current_segment?: number;
  total_segments: number;
  project_name: string;
  timestamp: number;
}

export interface RemoteServerState {
  is_running: boolean;
  port: number;
  connection_url: string;
}

// Global type declarations for Tauri
declare global {
  interface Window {
    __TAURI__?: {
      invoke: <T = unknown>(command: string, args?: Record<string, unknown>) => Promise<T>;
      listen: <T = unknown>(event: string, handler: (event: { event: string; payload: T }) => void) => Promise<() => void>;
    };
  }
}
