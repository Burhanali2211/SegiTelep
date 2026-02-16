import { StateCreator } from 'zustand';

export interface SettingsSlice {
    settings: {
        remoteEnabled: boolean;
        autoSaveEnabled: boolean;
        language: string;
        theme: 'light' | 'dark' | 'system';
    };
    setRemoteEnabled: (enabled: boolean) => void;
    updateSettings: (settings: Partial<SettingsSlice['settings']>) => void;
}

export const createSettingsSlice: StateCreator<SettingsSlice> = (set) => ({
    settings: {
        remoteEnabled: false, // Default to false as requested by the user
        autoSaveEnabled: true,
        language: 'en',
        theme: 'dark',
    },
    setRemoteEnabled: (enabled: boolean) =>
        set((state) => ({
            settings: { ...state.settings, remoteEnabled: enabled },
        })),
    updateSettings: (updates) =>
        set((state) => ({
            settings: { ...state.settings, ...updates },
        })),
});
