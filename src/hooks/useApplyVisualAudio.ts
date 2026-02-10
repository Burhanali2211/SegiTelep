import { useCallback } from 'react';
import { useVisualEditorState } from '@/components/Teleprompter/VisualEditor/useVisualEditorState';

export const useApplyVisualAudio = () => {
  const setAudioFile = useVisualEditorState((s) => s.setAudioFile);

  const applyAudio = useCallback((audio: { id: string; name: string; data: string; duration: number }) => {
    setAudioFile(audio);
  }, [setAudioFile]);

  return { applyAudio };
};
