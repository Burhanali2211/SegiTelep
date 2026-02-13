import React from 'react';
import { VisualEditor } from '@/components/Teleprompter/VisualEditor';

interface VisualEditorLayoutProps {
  onOpenAudioLibrary: () => void;
  onGoHome: () => void;
  onOpenSettings: () => void;
  onOpenShortcuts: () => void;
}

export const VisualEditorLayout: React.FC<VisualEditorLayoutProps> = ({
  onOpenAudioLibrary,
  onGoHome,
  onOpenSettings,
  onOpenShortcuts,
}) => {
  return (
    <main className="flex-1 min-h-0 min-w-0 flex overflow-hidden">
      <VisualEditor
        className="flex-1 min-h-0 min-w-0"
        onOpenAudioLibrary={onOpenAudioLibrary}
        onGoHome={onGoHome}
        onOpenSettings={onOpenSettings}
        onOpenShortcuts={onOpenShortcuts}
      />
    </main>
  );
};
