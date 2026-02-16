// External Display Manager for Teleprompter
// Opens teleprompter in a new window for external monitors
// Optimized for production with dedicated route and BroadcastChannel sync.

import { useTeleprompterStore } from '@/store/teleprompterStore';
import { useVisualEditorState } from '@/components/Teleprompter/VisualEditor/useVisualEditorState';
import { safeSerialize } from '@/utils/serializationHelpers';

export interface ExternalDisplayOptions {
  fullscreen?: boolean;
}

let externalWindow: Window | null = null;
let messageChannel: BroadcastChannel | null = null;

// Initialize broadcast channel for cross-window communication
function getMessageChannel(): BroadcastChannel {
  if (!messageChannel) {
    messageChannel = new BroadcastChannel('teleprompter-external-display');
  }
  return messageChannel;
}

// Open external display window
export function openExternalDisplay(options: ExternalDisplayOptions = {}): Window | null {
  const { fullscreen = true } = options;

  // Close existing external window if open
  if (externalWindow && !externalWindow.closed) {
    externalWindow.close();
  }

  // Get available screens (if Screen API is supported)
  const screenWidth = window.screen.availWidth;
  const screenHeight = window.screen.availHeight;

  // Calculate window features
  const features = [
    `width=${screenWidth}`,
    `height=${screenHeight}`,
    'left=0',
    'top=0',
    'menubar=no',
    'toolbar=no',
    'location=no',
    'status=no',
    'scrollbars=no',
    'resizable=yes',
  ].join(',');

  // Open new window pointing to the /player route
  // We use the current origin + hash route /player
  externalWindow = window.open(
    `${window.location.origin}/#/player`,
    'TeleprompterExternalDisplay',
    features
  );

  if (!externalWindow) {
    console.error('Failed to open external display window');
    return null;
  }

  // Set up communication channel
  setupExternalDisplayCommunication();

  return externalWindow;
}

// Close external display
export function closeExternalDisplay(): void {
  if (externalWindow && !externalWindow.closed) {
    externalWindow.close();
  }
  externalWindow = null;
}

// Check if external display is open
export function isExternalDisplayOpen(): boolean {
  return externalWindow !== null && !externalWindow.closed;
}

// Set up communication between main window and external display
function setupExternalDisplayCommunication(): void {
  const channel = getMessageChannel();

  const sendState = () => {
    try {
      const playback = useTeleprompterStore.getState().playback;
      const project = useTeleprompterStore.getState().project;
      const visualState = useVisualEditorState.getState();

      const payload = {
        playback: {
          isPlaying: playback.isPlaying,
          currentSegmentIndex: playback.currentSegmentIndex,
        },
        settings: {
          mirrorMode: project?.settings?.mirrorMode || false,
        },
        visualState: {
          playbackTime: visualState.playbackTime,
          isPlaying: visualState.isPlaying,
          pages: visualState.pages,
        },
      };

      const serialized = safeSerialize({ type: 'state-update', payload });
      channel.postMessage(serialized);
    } catch (e) {
      // Ignore serialization errors for transient states
    }
  };

  // Send state frequently enough for smooth updates
  const interval = setInterval(sendState, 100);

  // Also subscribe to store changes for immediate response
  const unsub1 = useTeleprompterStore.subscribe(sendState);
  const unsub2 = useVisualEditorState.subscribe(sendState);

  // Clean up interval when window is closed manually
  const checkClosed = setInterval(() => {
    if (!externalWindow || externalWindow.closed) {
      clearInterval(interval);
      clearInterval(checkClosed);
      unsub1();
      unsub2();
    }
  }, 1000);
}
