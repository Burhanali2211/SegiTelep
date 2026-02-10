import { useState, useCallback } from 'react';

type DialogType = 
  | 'projectManager'
  | 'projectList'
  | 'shortcuts'
  | 'settings'
  | 'statistics'
  | 'countdown'
  | 'about'
  | 'audioManager'
  | 'remoteControl'
  | 'p2pSharing'
  | 'voiceInput'
  | 'timerCalculator'
  | 'templates'
  | 'playerIndicatorSettings';

export const useDialogController = () => {
  const [openDialogs, setOpenDialogs] = useState<Set<DialogType>>(new Set());

  const open = useCallback((dialog: DialogType) => {
    setOpenDialogs(prev => new Set(prev).add(dialog));
  }, []);

  const close = useCallback((dialog: DialogType) => {
    setOpenDialogs(prev => {
      const newSet = new Set(prev);
      newSet.delete(dialog);
      return newSet;
    });
  }, []);

  const closeAll = useCallback(() => {
    setOpenDialogs(new Set());
  }, []);

  const isOpen = useCallback((dialog: DialogType) => {
    return openDialogs.has(dialog);
  }, [openDialogs]);

  const toggle = useCallback((dialog: DialogType) => {
    setOpenDialogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dialog)) {
        newSet.delete(dialog);
      } else {
        newSet.add(dialog);
      }
      return newSet;
    });
  }, []);

  return {
    open,
    close,
    closeAll,
    isOpen,
    toggle,
    hasOpenDialogs: openDialogs.size > 0,
  };
};
