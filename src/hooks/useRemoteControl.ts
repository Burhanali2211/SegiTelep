import { useCallback, useEffect, useState, useRef } from 'react';
import { useTeleprompterStore } from '@/store/teleprompterStore';
import { useVisualEditorState } from '@/components/Teleprompter/VisualEditor/useVisualEditorState';
import { RemoteCommand } from '@/types/remote.types';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';

export const useRemoteControl = () => {
  const setPlaying = useVisualEditorState((s) => s.setPlaying);
  const setPlaybackTime = useVisualEditorState((s) => s.setPlaybackTime);
  const setPlaybackSpeed = useVisualEditorState((s) => s.setPlaybackSpeed);
  const project = useTeleprompterStore((s) => s.project);
  const selectedSegmentId = useTeleprompterStore((s) => s.editor.selectedSegmentId);

  const vState = useVisualEditorState();
  const remoteEnabled = useTeleprompterStore((s) => s.settings.remoteEnabled);

  const [isRemoteControlled, setIsRemoteControlled] = useState(false);
  const [lastRemoteCommand, setLastRemoteCommand] = useState<RemoteCommand | null>(null);

  // Refs for latest state to keep callbacks stable
  const stateRef = useRef({
    project,
    selectedSegmentId,
    vState,
    remoteEnabled,
    setPlaying,
    setPlaybackTime,
    setPlaybackSpeed
  });

  useEffect(() => {
    stateRef.current = {
      project,
      selectedSegmentId,
      vState,
      remoteEnabled,
      setPlaying,
      setPlaybackTime,
      setPlaybackSpeed
    };
  }, [project, selectedSegmentId, vState, remoteEnabled, setPlaying, setPlaybackTime, setPlaybackSpeed]);

  const isTauri = typeof window !== 'undefined' && (
    (window as any).__TAURI_INTERNALS__ !== undefined ||
    (window as any).__TAURI__ !== undefined
  );

  const statusRef = useRef<any>(null);
  useEffect(() => {
    const s = stateRef.current;
    const isPlaying = s.vState.isPlaying;
    const currentSpeed = s.vState.playbackSpeed || 1.0;

    let currentSegment = 0;
    let totalSegments = 1;

    if (s.vState.pages.length > 0) {
      const all = s.vState.pages.flatMap(p => p.segments).sort((a, b) => a.startTime - b.startTime);
      totalSegments = all.length;
      const currentIndex = all.findIndex(seg => s.vState.playbackTime >= seg.startTime && s.vState.playbackTime < seg.endTime);
      currentSegment = currentIndex >= 0 ? currentIndex : 0;
    }

    statusRef.current = {
      is_playing: isPlaying,
      current_speed: currentSpeed,
      is_live: s.vState.showPlayer,
      current_segment: currentSegment,
      total_segments: totalSegments,
      project_name: s.vState.projectName || 'Untitled Project',
      timestamp: Date.now(),
      connected_clients: 0,
    };
  }, [vState.isPlaying, vState.playbackSpeed, vState.pages, vState.showPlayer, vState.playbackTime, vState.projectName]);

  const handleRemoteCommand = useCallback((command: RemoteCommand) => {
    const type = command.type.replace('-', '_'); // Support both styles
    console.log(`🎮 [Remote] Handling command: ${type}`, command);

    setLastRemoteCommand(command);
    setIsRemoteControlled(true);
    setTimeout(() => setIsRemoteControlled(false), 2000);

    const s = stateRef.current;

    switch (type) {
      case 'play':
        s.setPlaying(true);
        window.dispatchEvent(new CustomEvent('remote-play'));
        break;
      case 'pause':
        s.setPlaying(false);
        window.dispatchEvent(new CustomEvent('remote-pause'));
        break;
      case 'stop':
        s.setPlaying(false);
        s.setPlaybackTime(0);
        window.dispatchEvent(new CustomEvent('remote-stop'));
        break;
      case 'next_segment':
      case 'skip_next':
        window.dispatchEvent(new CustomEvent('remote-skip-next'));
        break;
      case 'prev_segment':
      case 'skip_prev':
        window.dispatchEvent(new CustomEvent('remote-skip-prev'));
        break;
      case 'set_speed':
        if (typeof command.value === 'number') {
          const speed = Math.max(0.5, Math.min(2.0, command.value));
          s.setPlaybackSpeed(speed);
        }
        break;
      case 'reset_position':
        s.setPlaybackTime(0);
        window.dispatchEvent(new CustomEvent('remote-reset-position'));
        break;
      case 'go_live':
        if (s.vState.startupMode === 'welcome') s.vState.setStartupMode('editor');
        s.vState.setShowPlayer(true);
        break;
      case 'exit_live':
        s.vState.setShowPlayer(false);
        break;
      case 'seek':
        if (typeof command.value === 'number') s.vState.setPlaybackTime(command.value);
        break;
      default:
      // No-op for unknown commands
    }
  }, []);

  // Effect for Background Sync (Tauri IPC + Browser WebSocket)
  useEffect(() => {
    if (!remoteEnabled) {
      console.log('🔇 Remote Control Service is disabled in settings.');
      return;
    }

    let syncInterval: any = null;
    let ws: WebSocket | null = null;
    let retryTimer: any = null;

    console.log(`🚀 Remote Control Service Started (Mode: ${isTauri ? 'Tauri' : 'Browser'} | DEV: ${import.meta.env.DEV})`);

    // 1. If in Tauri, run the internal Rust IPC sync
    if (isTauri) {
      syncInterval = setInterval(() => {
        if (statusRef.current) {
          invoke('sync_remote_status', { status: statusRef.current }).catch(() => { });
        }
      }, 1000);
    }

    // 2. If in DEV, connect to the WebSocket backend (Rust or Node)
    // In Tauri mode, port 8766 is the Rust WebSocket.
    // In Browser mode, port 8766 is the Node Sidecar.
    if (import.meta.env.DEV) {
      const connect = () => {
        const wsUrl = 'ws://localhost:8766';
        console.log(`📡 Attempting WebSocket connection to ${wsUrl}...`);
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('✅ Remote Control connected to WebSocket Host');

          // Identify ourselves so the server doesn't treat us as a remote
          ws?.send(JSON.stringify({ type: 'browser-register' }));

          // If we are NOT in Tauri (pure browser mode), we must use the WS for status updates
          if (syncInterval) clearInterval(syncInterval);

          syncInterval = setInterval(() => {
            if (ws?.readyState === WebSocket.OPEN && statusRef.current) {
              ws.send(JSON.stringify({ type: 'status-sync', status: statusRef.current }));
            }
          }, 1000);
        };

        ws.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);

            // Handle regular commands (from phone)
            if (data.type && data.type !== 'status-sync' && data.type !== 'browser-register') {
              handleRemoteCommand(data);
            }

            // Handle dev-wrapped commands from Node Sidecar
            if (data.type === 'dev-command') {
              handleRemoteCommand(data.command);
            }
          } catch (err) { }
        };

        ws.onclose = () => {
          console.warn('🔌 WebSocket connection closed. Retrying...');
          retryTimer = setTimeout(connect, 5000);
        };

        ws.onerror = (e) => {
          console.error('❌ WebSocket Error:', e);
          ws?.close();
        };
      };

      connect();
    }

    return () => {
      if (syncInterval) clearInterval(syncInterval);
      if (retryTimer) clearTimeout(retryTimer);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [isTauri, handleRemoteCommand, remoteEnabled]);

  // Effect for Tauri Native Listeners
  useEffect(() => {
    if (!remoteEnabled || !isTauri) return;

    const events = [
      'remote-play', 'remote-pause', 'remote-stop', 'remote-next-segment',
      'remote-prev-segment', 'remote-toggle-mirror', 'remote-reset-position',
      'remote-go-live', 'remote-exit-live', 'remote-set-speed', 'remote-seek'
    ];

    const unlistenFns: (() => void)[] = [];

    async function setup() {
      for (const eventName of events) {
        const unlisten = await listen(eventName, (event) => {
          console.log(`🔔 Tauri Event Received: ${eventName}`, event.payload);
          const type = eventName.replace('remote-', '').replace('-', '_');
          handleRemoteCommand({
            type,
            value: event.payload,
            timestamp: Date.now()
          });
        });
        unlistenFns.push(unlisten);
      }
    }

    setup().catch(console.error);

    return () => {
      unlistenFns.forEach(fn => fn());
    };
  }, [isTauri, handleRemoteCommand, remoteEnabled]);

  return { isRemoteControlled, lastRemoteCommand, handleRemoteCommand };
};
