import { useState, useEffect, useCallback } from 'react';

export const useDeveloperConsole = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);

  // Check if we're in a Tauri environment
  const isTauriApp = typeof window !== 'undefined' && '__TAURI__' in window;

  // Toggle console
  const toggleConsole = useCallback(() => {
    if (!isEnabled) return;
    console.log('🔧 Developer Console: Toggle requested');
    setIsOpen(prev => !prev);
  }, [isEnabled]);

  // Close console
  const closeConsole = useCallback(() => {
    console.log('🔧 Developer Console: Close requested');
    setIsOpen(false);
  }, []);

  // Enable/disable console
  const setConsoleEnabled = useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
    if (!enabled) {
      setIsOpen(false);
    }
  }, []);

  // Keyboard shortcut handler with better detection
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only log for actual shortcut keys to reduce spam
      const isRelevantKey = (
        (event.ctrlKey && event.key === '`') ||
        event.key === 'F12' ||
        (event.ctrlKey && event.shiftKey && event.key === 'D') ||
        (event.key === 'Escape' && isOpen)
      );
      
      if (isRelevantKey) {
        console.log('🔧 Key pressed:', { key: event.key, ctrlKey: event.ctrlKey, altKey: event.altKey, shiftKey: event.shiftKey });
      }
      
      // Multiple shortcuts for console toggle:
      // 1. Ctrl + ` (backtick) - primary shortcut
      // 2. F12 - alternative shortcut
      // 3. Ctrl + Shift + D - alternative shortcut
      const isToggleShortcut = (
        (event.ctrlKey && event.key === '`') ||
        event.key === 'F12' ||
        (event.ctrlKey && event.shiftKey && event.key === 'D')
      );

      if (isToggleShortcut) {
        event.preventDefault();
        event.stopPropagation();
        console.log('🔧 Developer Console: Toggle shortcut triggered');
        toggleConsole();
        return;
      }

      // Escape to close console
      if (event.key === 'Escape' && isOpen) {
        event.preventDefault();
        event.stopPropagation();
        console.log('🔧 Developer Console: Escape shortcut triggered');
        closeConsole();
        return;
      }
    };

    // Add multiple event listeners for better capture
    document.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [toggleConsole, closeConsole, isOpen]);

  // Add initialization log and window-level toggle function for debugging
  useEffect(() => {
    if (isTauriApp) {
      console.log('🔧 Developer Console: Running in Tauri environment');
    } else {
      console.log('🔧 Developer Console: Running in browser environment');
    }
    
    console.log('🔧 Developer Console: Shortcuts available:');
    console.log('  - Ctrl + ` (backtick) - Toggle console');
    console.log('  - F12 - Toggle console');
    console.log('  - Ctrl + Shift + D - Toggle console');
    console.log('  - Escape - Close console');

    // Add global function for testing in console
    (window as any).toggleDevConsole = toggleConsole;
    (window as any).closeDevConsole = closeConsole;
    console.log('🔧 Developer Console: Test functions added to window:');
    console.log('  - window.toggleDevConsole() - Toggle console');
    console.log('  - window.closeDevConsole() - Close console');
  }, [isTauriApp, toggleConsole, closeConsole]);

  return {
    isOpen,
    isEnabled,
    isTauriApp,
    toggleConsole,
    closeConsole,
    setConsoleEnabled
  };
};