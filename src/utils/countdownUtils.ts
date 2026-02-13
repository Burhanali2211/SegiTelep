export interface CountdownSettings {
    enabled: boolean;
    duration: number; // seconds
    playSound: boolean;
    showPreview: boolean;
}

const COUNTDOWN_SETTINGS_KEY = 'teleprompter-countdown-settings';

export const DEFAULT_SETTINGS: CountdownSettings = {
    enabled: true,
    duration: 3,
    playSound: false,
    showPreview: true,
};

// Get countdown settings from localStorage
export function getCountdownSettings(): CountdownSettings {
    try {
        const stored = localStorage.getItem(COUNTDOWN_SETTINGS_KEY);
        if (stored) {
            return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
        }
    } catch (e) {
        console.error('Failed to parse countdown settings:', e);
    }
    return DEFAULT_SETTINGS;
}

// Save countdown settings to localStorage
export function saveCountdownSettings(settings: CountdownSettings): void {
    localStorage.setItem(COUNTDOWN_SETTINGS_KEY, JSON.stringify(settings));
}
