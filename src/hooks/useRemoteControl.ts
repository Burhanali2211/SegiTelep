import { useCallback, useEffect, useState } from 'react';
import { useTeleprompterStore } from '@/store/teleprompterStore';
import { useVisualEditorState } from '@/components/Teleprompter/VisualEditor/useVisualEditorState';
import { RemoteCommand } from '@/types/remote.types';

export const useRemoteControl = () => {
  const playback = useTeleprompterStore((s) => s.playback);
  const play = useTeleprompterStore((s) => s.play);
  const pause = useTeleprompterStore((s) => s.pause);
  const stop = useTeleprompterStore((s) => s.stop);
  const nextSegment = useTeleprompterStore((s) => s.nextSegment);
  const prevSegment = useTeleprompterStore((s) => s.prevSegment);
  const setSpeed = useTeleprompterStore((s) => s.setSpeed);
  const toggleMirror = useTeleprompterStore((s) => s.toggleMirror);
  const project = useTeleprompterStore((s) => s.project);
  const selectedSegmentId = useTeleprompterStore((s) => s.editor.selectedSegmentId);

  // Visual editor state
  const visualIsPlaying = useVisualEditorState((s) => s.isPlaying);
  const visualSetPlaying = useVisualEditorState((s) => s.setPlaying);
  const visualSetPlaybackTime = useVisualEditorState((s) => s.setPlaybackTime);
  const visualSetPlaybackSpeed = useVisualEditorState((s) => s.setPlaybackSpeed);
  const visualPlaybackSpeed = useVisualEditorState((s) => s.playbackSpeed);
  const visualPages = useVisualEditorState((s) => s.pages);
  const visualSelectedSegmentIds = useVisualEditorState((s) => s.selectedSegmentIds);

  const [isRemoteControlled, setIsRemoteControlled] = useState(false);
  const [lastRemoteCommand, setLastRemoteCommand] = useState<RemoteCommand | null>(null);

  // Get current status for remote clients
  const getCurrentStatus = useCallback(() => {
    const isPlaying = playback.isPlaying || visualIsPlaying;
    const currentSpeed = playback.speed || visualPlaybackSpeed || 1.0;

    // Calculate current segment
    let currentSegment = 0;
    let totalSegments = 1;

    if (project?.segments) {
      totalSegments = project.segments.length;
      const currentIndex = project.segments.findIndex(seg => seg.id === selectedSegmentId);
      currentSegment = currentIndex >= 0 ? currentIndex : 0;
    } else if (visualPages.length > 0) {
      totalSegments = visualPages.reduce((acc, page) => acc + page.segments.length, 0);
      // For visual editor, we'd need to calculate current segment based on playback time
      currentSegment = 0; // Simplified for now
    }

    return {
      is_playing: isPlaying,
      current_speed: currentSpeed,
      current_segment: currentSegment,
      total_segments: totalSegments,
      project_name: project?.name || 'Untitled Project',
      timestamp: Date.now(),
    };
  }, [playback, visualIsPlaying, playback.speed, visualPlaybackSpeed, project, selectedSegmentId, visualPages]);

  // Handle remote commands
  const handleRemoteCommand = useCallback((command: RemoteCommand) => {
    setLastRemoteCommand(command);
    setLastRemoteCommand(command);
    setIsRemoteControlled(true);

    // Reset remote controlled flag after 2 seconds
    setTimeout(() => setIsRemoteControlled(false), 2000);

    switch (command.type) {
      case 'play':
        if (project?.segments) {
          play();
        } else {
          visualSetPlaying(true);
        }
        break;

      case 'pause':
        if (project?.segments) {
          pause();
        } else {
          visualSetPlaying(false);
        }
        break;

      case 'stop':
        if (project?.segments) {
          stop();
        } else {
          visualSetPlaying(false);
          visualSetPlaybackTime(0);
        }
        break;

      case 'next_segment':
        if (project?.segments) {
          nextSegment();
        }
        // Visual editor navigation would need different logic
        break;

      case 'prev_segment':
        if (project?.segments) {
          prevSegment();
        }
        // Visual editor navigation would need different logic
        break;

      case 'set_speed':
        if (typeof command.value === 'number') {
          const speed = Math.max(0.5, Math.min(2.0, command.value));
          if (project?.segments) {
            setSpeed(speed);
          } else {
            visualSetPlaybackSpeed(speed);
          }
        }
        break;

      case 'toggle_mirror':
        toggleMirror();
        break;

      case 'reset_position':
        // Reset position - implement based on available methods
        if (project?.segments) {
          // For text editor, we could reset to beginning
          // This would need to be implemented in the store
          console.log('Reset position called for text editor');
        } else {
          visualSetPlaybackTime(0);
        }
        break;

      default:
        console.warn('Unknown remote command:', command.type);
    }
  }, [
    project, play, pause, stop, nextSegment, prevSegment,
    setSpeed, toggleMirror,
    visualSetPlaying, visualSetPlaybackSpeed
  ]);

  // Set up Tauri event listeners for remote commands
  useEffect(() => {
    if (typeof window === 'undefined' || !window.__TAURI__) return;

    const unlistenPromises = [
      window.__TAURI__.listen('remote-play', () => handleRemoteCommand({ type: 'play', timestamp: Date.now() })),
      window.__TAURI__.listen('remote-pause', () => handleRemoteCommand({ type: 'pause', timestamp: Date.now() })),
      window.__TAURI__.listen('remote-stop', () => handleRemoteCommand({ type: 'stop', timestamp: Date.now() })),
      window.__TAURI__.listen('remote-next-segment', () => handleRemoteCommand({ type: 'next_segment', timestamp: Date.now() })),
      window.__TAURI__.listen('remote-prev-segment', () => handleRemoteCommand({ type: 'prev_segment', timestamp: Date.now() })),
      window.__TAURI__.listen('remote-toggle-mirror', () => handleRemoteCommand({ type: 'toggle_mirror', timestamp: Date.now() })),
      window.__TAURI__.listen('remote-reset-position', () => handleRemoteCommand({ type: 'reset_position', timestamp: Date.now() })),
    ];

    // Handle set speed command with value
    const unlistenSpeed = window.__TAURI__.listen<{ payload: number }>('remote-set-speed', (event) => {
      handleRemoteCommand({
        type: 'set_speed',
        value: event.payload,
        timestamp: Date.now()
      });
    });

    // Cleanup function
    return () => {
      unlistenPromises.forEach(promise => {
        promise.then(fn => fn()).catch(console.error);
      });
      unlistenSpeed.then(fn => fn()).catch(console.error);
    };
  }, [handleRemoteCommand]);

  return {
    isRemoteControlled,
    lastRemoteCommand,
    getCurrentStatus,
    handleRemoteCommand,
  };
};
