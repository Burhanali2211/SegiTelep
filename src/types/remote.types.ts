// Remote control type definitions

export interface RemoteCommand {
  type: string;
  value?: any;
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
      invoke: (command: string, args?: any) => Promise<any>;
      listen: (event: string, handler: (event: any) => void) => Promise<() => Promise<void>>;
    };
  }
}
