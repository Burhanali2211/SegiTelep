import { useEffect, useCallback, useState, useRef } from 'react';
import { 
  RemoteCommand, 
  RemoteMessage, 
  PlaybackStatus,
  BROADCAST_CHANNEL_NAME,
  STORAGE_EVENT_KEY,
} from './types';
import { useTeleprompterStore } from '@/store/teleprompterStore';

interface UseRemoteControlOptions {
  isController?: boolean;
  onCommand?: (command: RemoteCommand) => void;
}

export function useRemoteControl(options: UseRemoteControlOptions = {}) {
  const { isController = false, onCommand } = options;
  
  const [isConnected, setIsConnected] = useState(false);
  const [lastPing, setLastPing] = useState<number | null>(null);
  const [status, setStatus] = useState<PlaybackStatus | null>(null);
  
  const channelRef = useRef<BroadcastChannel | null>(null);
  
  // Get playback state from store
  const playback = useTeleprompterStore((s) => s.playback);
  const project = useTeleprompterStore((s) => s.project);
  const play = useTeleprompterStore((s) => s.play);
  const pause = useTeleprompterStore((s) => s.pause);
  const stop = useTeleprompterStore((s) => s.stop);
  const nextSegment = useTeleprompterStore((s) => s.nextSegment);
  const prevSegment = useTeleprompterStore((s) => s.prevSegment);
  const setSpeed = useTeleprompterStore((s) => s.setSpeed);
  const toggleMirror = useTeleprompterStore((s) => s.toggleMirror);

  // Create current status
  const currentStatus: PlaybackStatus = {
    isPlaying: playback.isPlaying,
    isPaused: playback.isPaused,
    speed: playback.speed,
    currentSegmentIndex: playback.currentSegmentIndex,
    totalSegments: project?.segments.length ?? 0,
    projectName: project?.name ?? 'Untitled',
  };

  // Handle incoming command
  const handleCommand = useCallback((command: RemoteCommand) => {
    if (onCommand) {
      onCommand(command);
      return;
    }

    switch (command) {
      case 'play':
        play();
        break;
      case 'pause':
        pause();
        break;
      case 'stop':
        stop();
        break;
      case 'next':
        nextSegment();
        break;
      case 'previous':
        prevSegment();
        break;
      case 'speed-up':
        setSpeed(Math.min(playback.speed + 25, 500));
        break;
      case 'speed-down':
        setSpeed(Math.max(playback.speed - 25, 25));
        break;
      case 'toggle-mirror':
        toggleMirror();
        break;
    }
  }, [onCommand, play, pause, stop, nextSegment, prevSegment, setSpeed, toggleMirror, playback.speed]);

  // Send command (for controller)
  const sendCommand = useCallback((command: RemoteCommand) => {
    const message: RemoteMessage = {
      type: 'command',
      command,
      timestamp: Date.now(),
      source: 'controller',
    };

    // Try BroadcastChannel first
    if (channelRef.current) {
      channelRef.current.postMessage(message);
    }

    // Also use localStorage for cross-origin support
    localStorage.setItem(STORAGE_EVENT_KEY, JSON.stringify(message));
  }, []);

  // Send status (for player)
  const sendStatus = useCallback(() => {
    const message: RemoteMessage = {
      type: 'status',
      timestamp: Date.now(),
      source: 'player',
    };

    if (channelRef.current) {
      channelRef.current.postMessage({ ...message, status: currentStatus });
    }
  }, [currentStatus]);

  // Initialize BroadcastChannel
  useEffect(() => {
    try {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channelRef.current = channel;

      channel.onmessage = (event: MessageEvent<RemoteMessage & { status?: PlaybackStatus }>) => {
        const message = event.data;

        if (message.type === 'command' && !isController) {
          // Player receives command
          if (message.command) {
            handleCommand(message.command);
          }
        } else if (message.type === 'status' && isController) {
          // Controller receives status
          if (message.status) {
            setStatus(message.status);
            setIsConnected(true);
          }
        } else if (message.type === 'ping' && !isController) {
          // Player responds to ping
          channel.postMessage({
            type: 'pong',
            timestamp: Date.now(),
            source: 'player',
          });
          sendStatus();
        } else if (message.type === 'pong' && isController) {
          // Controller receives pong
          setLastPing(Date.now() - message.timestamp);
          setIsConnected(true);
        }
      };

      // If controller, send initial ping
      if (isController) {
        channel.postMessage({
          type: 'ping',
          timestamp: Date.now(),
          source: 'controller',
        });
      }

      return () => {
        channel.close();
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported:', e);
    }
  }, [isController, handleCommand, sendStatus]);

  // Listen to localStorage events for cross-tab communication
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_EVENT_KEY && e.newValue && !isController) {
        try {
          const message = JSON.parse(e.newValue) as RemoteMessage;
          if (message.type === 'command' && message.command) {
            handleCommand(message.command);
          }
        } catch (err) {
          console.error('Failed to parse remote command:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [isController, handleCommand]);

  // Periodic status updates (player only)
  useEffect(() => {
    if (isController) return;

    const interval = setInterval(() => {
      sendStatus();
    }, 1000);

    return () => clearInterval(interval);
  }, [isController, sendStatus]);

  return {
    isConnected,
    lastPing,
    status: isController ? status : currentStatus,
    sendCommand,
    sendStatus,
  };
}
