import React from 'react';
import { VisualEditor } from '@/components/Teleprompter/VisualEditor';

interface VisualEditorLayoutProps {
  onOpenAudioLibrary: () => void;
  onGoHome: () => void;
  onEditorTypeChange: (type: 'text' | 'visual') => void;
  onOpenSettings: () => void;
  onOpenShortcuts: () => void;
}

export const VisualEditorLayout: React.FC<VisualEditorLayoutProps> = ({
  onOpenAudioLibrary,
  onGoHome,
  onEditorTypeChange,
  onOpenSettings,
  onOpenShortcuts,
}) => {
  return (
    <main className="flex-1 min-h-0 flex overflow-hidden">
      <VisualEditor
        className="flex-1 min-h-0"
        onOpenAudioLibrary={onOpenAudioLibrary}
        onGoHome={onGoHome}
        onEditorTypeChange={onEditorTypeChange}
        onOpenSettings={onOpenSettings}
        onOpenShortcuts={onOpenShortcuts}
      />
    </main>
  );
};
