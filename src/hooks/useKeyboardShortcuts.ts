import { useEffect } from 'react';

export type EditorType = 'text' | 'visual';

interface KeyboardShortcutsProps {
  onSave?: () => void;
  onNew?: () => void;
  onOpen?: () => void;
  onShowShortcuts?: () => void;
  editorType?: EditorType;
  showVisualEditor?: boolean;
}

export const useKeyboardShortcuts = ({
  onSave,
  onNew,
  onOpen,
  onShowShortcuts,
  editorType,
  showVisualEditor,
}: KeyboardShortcutsProps) => {
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      const ctrl = e.ctrlKey || e.metaKey;
      
      if (ctrl && e.key === 's' && onSave) {
        e.preventDefault();
        onSave();
      }
      
      if (ctrl && e.key === 'n' && onNew) {
        e.preventDefault();
        onNew();
      }
      
      if (ctrl && e.key === 'o' && onOpen) {
        e.preventDefault();
        onOpen();
      }
      
      if ((e.key === '?' || (e.shiftKey && e.key === '/')) && onShowShortcuts) {
        e.preventDefault();
        onShowShortcuts();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave, onNew, onOpen, onShowShortcuts]);
};

export const KEYBOARD_SHORTCUTS = [
  { key: 'Space', action: 'Play / Pause' },
  { key: '←', action: 'Previous segment' },
  { key: '→', action: 'Next segment' },
  { key: '↑', action: 'Increase speed' },
  { key: '↓', action: 'Decrease speed' },
  { key: 'M', action: 'Toggle mirror' },
  { key: 'F', action: 'Fullscreen' },
  { key: 'Esc', action: 'Exit / Stop' },
  { key: 'Ctrl+S', action: 'Save project' },
  { key: 'Ctrl+N', action: 'New project' },
  { key: 'Ctrl+O', action: 'Open project' },
  { key: '?', action: 'Show shortcuts' },
];
