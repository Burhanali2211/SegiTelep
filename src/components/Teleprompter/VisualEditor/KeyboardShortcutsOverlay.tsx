import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KeyboardShortcutsOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SHORTCUT_CATEGORIES = [
  {
    name: 'File',
    shortcuts: [
      { key: 'Ctrl+S', action: 'Save project' },
      { key: 'Ctrl+O', action: 'Open project' },
      { key: 'Ctrl+N', action: 'New project' },
      { key: 'Ctrl+Shift+S', action: 'Export project' },
    ],
  },
  {
    name: 'Edit',
    shortcuts: [
      { key: 'N', action: 'New segment (draw mode)' },
      { key: 'Delete', action: 'Delete selected' },
      { key: 'Ctrl+C', action: 'Copy' },
      { key: 'Ctrl+V', action: 'Paste' },
      { key: 'Ctrl+D', action: 'Duplicate' },
      { key: 'Ctrl+A', action: 'Select all' },
      { key: 'Ctrl+Z', action: 'Undo' },
      { key: 'Ctrl+Shift+Z', action: 'Redo' },
    ],
  },
  {
    name: 'Playback',
    shortcuts: [
      { key: 'Space', action: 'Play / Pause' },
      { key: 'S', action: 'Set start time' },
      { key: 'E', action: 'Set end time' },
      { key: '←', action: 'Seek backward' },
      { key: '→', action: 'Seek forward' },
      { key: 'Shift+←', action: 'Adjust times -0.1s' },
      { key: 'Shift+→', action: 'Adjust times +0.1s' },
    ],
  },
  {
    name: 'Navigation',
    shortcuts: [
      { key: 'PageUp', action: 'Previous page' },
      { key: 'PageDown', action: 'Next page' },
      { key: '+/-', action: 'Zoom in/out' },
      { key: 'Escape', action: 'Deselect / Exit mode' },
      { key: '?', action: 'Show shortcuts' },
    ],
  },
];

export function KeyboardShortcutsOverlay({ open, onOpenChange }: KeyboardShortcutsOverlayProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-6 pt-2">
          {SHORTCUT_CATEGORIES.map((category) => (
            <div key={category.name}>
              <h3 className="font-semibold text-sm text-primary mb-3">{category.name}</h3>
              <div className="space-y-2">
                {category.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.key}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-muted-foreground">{shortcut.action}</span>
                    <kbd
                      className={cn(
                        'px-2 py-0.5 rounded text-xs font-mono',
                        'bg-muted border border-border'
                      )}
                    >
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <p className="text-xs text-muted-foreground text-center mt-4 pt-4 border-t">
          Press <kbd className="px-1.5 py-0.5 rounded bg-muted border text-xs font-mono">?</kbd> anytime to show this panel
        </p>
      </DialogContent>
    </Dialog>
  );
}
