import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PlayerIndicatorBehavior = 'auto-hide' | 'show-on-hover' | 'always-show';

interface PlayerIndicatorSettings {
  behavior: PlayerIndicatorBehavior;
  autoHideDelay: number; // in milliseconds
  backgroundColor: string;
  textColor: string;
  opacity: number; // 0-1
}

interface PlayerIndicatorStore {
  settings: PlayerIndicatorSettings;
  updateSettings: (settings: Partial<PlayerIndicatorSettings>) => void;
  resetSettings: () => void;
}

const defaultSettings: PlayerIndicatorSettings = {
  behavior: 'auto-hide',
  autoHideDelay: 3000,
  backgroundColor: 'rgba(0, 0, 0, 0.9)',
  textColor: '#ffffff',
  opacity: 0.9,
};

export const usePlayerIndicatorStore = create<PlayerIndicatorStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
      resetSettings: () => set({ settings: defaultSettings }),
    }),
    {
      name: 'player-indicator-settings',
    }
  )
);
