import { useCallback } from 'react';
import { useVisualEditorState } from '@/components/Teleprompter/VisualEditor/useVisualEditorState';

export const useApplyVisualDuration = () => {
  const visualEditorState = useVisualEditorState();

  const applyDuration = useCallback((duration: number) => {
    const selected = visualEditorState.getSelectedSegments();
    if (selected.length === 1) {
      visualEditorState.updateSegment(selected[0].id, {
        endTime: selected[0].startTime + duration,
      });
    }
  }, [visualEditorState]);

  return { applyDuration };
};
