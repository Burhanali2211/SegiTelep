import { useCallback } from 'react';
import { useVisualEditorState } from '@/components/Teleprompter/VisualEditor/useVisualEditorState';

export const useApplyVisualAudio = () => {
  const setAudioFile = useVisualEditorState((s) => s.setAudioFile);

  const applyAudio = useCallback((audio: { id: string; name: string; data: string; duration: number }) => {
    setAudioFile({
      id: audio.id,
      name: audio.name,
      data: audio.data,
      duration: audio.duration
    });
  }, [setAudioFile]);

  return { applyAudio };
};
