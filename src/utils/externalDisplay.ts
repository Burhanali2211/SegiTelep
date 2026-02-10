// External Display Manager for Teleprompter
// Opens teleprompter in a new window for external monitors

import { useTeleprompterStore } from '@/store/teleprompterStore';
import { useVisualEditorState } from '@/components/Teleprompter/VisualEditor/useVisualEditorState';
import { safeSerialize } from '@/utils/serializationHelpers';

export interface ExternalDisplayOptions {
  screenIndex?: number;  // Which screen to use (0 = primary, 1+ = external)
  fullscreen?: boolean;
  alwaysOnTop?: boolean;
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
  
  // Open new window
  externalWindow = window.open(
    `${window.location.origin}/external-display`,
    'TeleprompterExternalDisplay',
    features
  );
  
  if (!externalWindow) {
    console.error('Failed to open external display window');
    return null;
  }
  
  // Write content to the window
  const content = generateExternalDisplayContent(fullscreen);
  externalWindow.document.write(content);
  externalWindow.document.close();
  
  // Set up communication channel
  setupExternalDisplayCommunication();
  
  // Request fullscreen if supported
  if (fullscreen) {
    externalWindow.addEventListener('load', () => {
      setTimeout(() => {
        externalWindow?.document.documentElement.requestFullscreen?.().catch(console.error);
      }, 500);
    });
  }
  
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
  
  // Send current state to external display. Must be serializable - BroadcastChannel
  // uses structured clone; PointerEvent/DOM refs cause DOMException.
  const sendState = () => {
    try {
      const playback = useTeleprompterStore.getState().playback;
      const project = useTeleprompterStore.getState().project;
      const visualState = useVisualEditorState.getState();
      const payload = {
        playback: {
          isPlaying: playback.isPlaying,
          isPaused: playback.isPaused,
          currentSegmentIndex: playback.currentSegmentIndex,
          scrollOffset: playback.scrollOffset,
          speed: playback.speed,
        },
        settings: project?.settings,
        visualState: {
          playbackTime: visualState.playbackTime,
          isPlaying: visualState.isPlaying,
          playbackSpeed: visualState.playbackSpeed,
          pages: visualState.pages,
        },
      };
      const serialized = safeSerialize({ type: 'state-update', payload });
      channel.postMessage(serialized);
    } catch (e) {
      console.warn('[ExternalDisplay] Failed to send state:', e);
    }
  };
  
  // Send initial state
  sendState();
  
  // Subscribe to store changes
  const unsubscribeTeleprompter = useTeleprompterStore.subscribe(sendState);
  const unsubscribeVisual = useVisualEditorState.subscribe(sendState);
  
  // Clean up when window closes
  if (externalWindow) {
    externalWindow.addEventListener('beforeunload', () => {
      unsubscribeTeleprompter();
      unsubscribeVisual();
    });
  }
}

// Send command to external display. Uses safeSerialize to avoid clone errors.
export function sendToExternalDisplay(command: string, data?: unknown): void {
  try {
    const channel = getMessageChannel();
    const serialized = safeSerialize({ type: command, payload: data });
    channel.postMessage(serialized);
  } catch (e) {
    console.warn('[ExternalDisplay] Failed to send command:', e);
  }
}

// Generate the HTML content for external display
function generateExternalDisplayContent(fullscreen: boolean): string {
  return `
    <!DOCTYPE html>
    <html lang="en" class="dark">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>SegiTelep - External Display</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        html, body {
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: #000;
          color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .container {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        
        .content {
          max-width: 90%;
          max-height: 80%;
          font-size: 4vw;
          line-height: 1.5;
          text-align: center;
          overflow: hidden;
        }
        
        .content.mirror {
          transform: scaleX(-1);
        }
        
        .waiting {
          color: #666;
          font-size: 2vw;
        }
        
        .guide-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          background: rgba(255, 100, 100, 0.5);
          top: 40%;
        }
        
        .status-bar {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 20px;
          font-size: 14px;
          color: #666;
        }
        
        .status-item {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        
        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #666;
        }
        
        .status-indicator.connected {
          background: #4ade80;
        }
        
        .status-indicator.playing {
          background: #f59e0b;
          animation: pulse 1s infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .segment-image {
          max-width: 100%;
          max-height: 80vh;
          object-fit: contain;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="guide-line"></div>
        <div id="content" class="content">
          <p class="waiting">Waiting for content...</p>
          <p class="waiting" style="font-size: 1vw; margin-top: 20px;">
            Start playback in the main window
          </p>
        </div>
        <div class="status-bar">
          <div class="status-item">
            <div id="connection-indicator" class="status-indicator"></div>
            <span id="connection-status">Connecting...</span>
          </div>
          <div class="status-item">
            <div id="playback-indicator" class="status-indicator"></div>
            <span id="playback-status">Stopped</span>
          </div>
        </div>
      </div>
      
      <script>
        const channel = new BroadcastChannel('teleprompter-external-display');
        const contentEl = document.getElementById('content');
        const connectionIndicator = document.getElementById('connection-indicator');
        const connectionStatus = document.getElementById('connection-status');
        const playbackIndicator = document.getElementById('playback-indicator');
        const playbackStatus = document.getElementById('playback-status');
        
        let isConnected = false;
        let currentState = null;
        
        channel.onmessage = (event) => {
          const { type, payload } = event.data;
          
          if (!isConnected) {
            isConnected = true;
            connectionIndicator.classList.add('connected');
            connectionStatus.textContent = 'Connected';
          }
          
          if (type === 'state-update') {
            currentState = payload;
            updateDisplay();
          }
        };
        
        function updateDisplay() {
          if (!currentState) return;
          
          const { playback, settings, visualState } = currentState;
          
          // Update playback status
          if (playback?.isPlaying || visualState?.isPlaying) {
            playbackIndicator.classList.add('playing');
            playbackStatus.textContent = playback?.isPaused ? 'Paused' : 'Playing';
          } else {
            playbackIndicator.classList.remove('playing');
            playbackStatus.textContent = 'Stopped';
          }
          
          // Apply mirror mode
          if (settings?.mirrorMode) {
            contentEl.classList.add('mirror');
          } else {
            contentEl.classList.remove('mirror');
          }
          
          // Update content based on visual state
          if (visualState?.pages?.length > 0) {
            const currentTime = visualState.playbackTime || 0;
            const allSegments = visualState.pages.flatMap(p => 
              p.segments.filter(s => !s.isHidden).map(s => ({
                ...s,
                pageData: p.data
              }))
            ).sort((a, b) => a.startTime - b.startTime);
            
            const activeSegment = allSegments.find(s => 
              currentTime >= s.startTime && currentTime < s.endTime
            );
            
            if (activeSegment) {
              contentEl.innerHTML = \`
                <img src="\${activeSegment.pageData}" class="segment-image" alt="Segment" />
                <p style="font-size: 2vw; margin-top: 10px;">\${activeSegment.label}</p>
              \`;
            }
          }
        }
        
        // Send ready signal
        channel.postMessage({ type: 'external-display-ready' });
        
        // Heartbeat
        setInterval(() => {
          channel.postMessage({ type: 'heartbeat' });
        }, 5000);
      </script>
    </body>
    </html>
  `;
}
