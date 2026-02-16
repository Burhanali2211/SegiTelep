import React from 'react';
import { VisualEditor } from '@/components/Teleprompter/VisualEditor';

interface VisualEditorLayoutProps {
  onOpenAudioLibrary: () => void;
  onGoHome: () => void;
  onOpenSettings: () => void;
  onOpenShortcuts: () => void;
  onOpenProjectList: () => void;
  onOpenPDFSelector: (file: File | string) => void;
}

export const VisualEditorLayout: React.FC<VisualEditorLayoutProps> = React.memo(({
  onOpenAudioLibrary,
  onGoHome,
  onOpenSettings,
  onOpenShortcuts,
  onOpenProjectList,
  onOpenPDFSelector,
}) => {
  return (
    <main className="flex-1 min-h-0 min-w-0 flex overflow-hidden">
      <VisualEditor
        className="flex-1 min-h-0 min-w-0"
        onOpenAudioLibrary={onOpenAudioLibrary}
        onGoHome={onGoHome}
        onOpenSettings={onOpenSettings}
        onOpenShortcuts={onOpenShortcuts}
        onOpenProjectList={onOpenProjectList}
        onOpenPDFSelector={onOpenPDFSelector}
      />
    </main>
  );
});
