/**
 * Coordinates audio playback across the app so only one source plays at a time.
 * - Audio Manager (library preview)
 * - Visual Editor (AudioWaveform)
 * - Fullscreen Player
 */

export type AudioSource = 'audio-manager' | 'visual-editor' | 'fullscreen-player';

type StopCallback = () => void;

const stopCallbacks: Partial<Record<AudioSource, StopCallback>> = {};

export function registerStopCallback(source: AudioSource, stop: StopCallback): () => void {
  stopCallbacks[source] = stop;
  return () => {
    if (stopCallbacks[source] === stop) {
      delete stopCallbacks[source];
    }
  };
}

export function stopAllExcept(source: AudioSource): void {
  (Object.keys(stopCallbacks) as AudioSource[]).forEach((key) => {
    if (key !== source && stopCallbacks[key]) {
      stopCallbacks[key]!();
    }
  });
}
