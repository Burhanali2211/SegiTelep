import { StateCreator } from 'zustand';
import { PlaybackState } from '@/types/teleprompter.types';
import { scheduleAutoSave } from '@/core/storage/ProjectStorage';
import { TeleprompterStore } from '../teleprompterStore';

export interface PlaybackSlice {
    playback: PlaybackState;

    play: () => void;
    pause: () => void;
    stop: () => void;
    nextSegment: () => void;
    prevSegment: () => void;
    setCurrentSegment: (index: number) => void;
    setSpeed: (speed: number) => void;
    setScrollOffset: (offset: number) => void;
    setProgress: (progress: number) => void;
    toggleMirror: () => void;
}

export const createPlaybackSlice: StateCreator<
    TeleprompterStore,
    [],
    [],
    PlaybackSlice
> = (set, get) => ({
    playback: {
        isPlaying: false,
        isPaused: false,
        currentSegmentId: null,
        currentSegmentIndex: 0,
        scrollOffset: 0,
        totalHeight: 0,
        progress: 0,
        speed: 100,
        startTime: null,
        elapsedTime: 0,
        segmentStartTime: null,
        segmentElapsedTime: 0,
    },

    play: () => {
        const { project, playback } = get();
        if (!project || project.segments.length === 0) return;

        set({
            playback: {
                ...playback,
                isPlaying: true,
                isPaused: false,
                startTime: Date.now(),
            },
        });
    },

    pause: () => {
        set((state) => ({
            playback: {
                ...state.playback,
                isPaused: true,
            },
        }));
    },

    stop: () => {
        set((state) => ({
            playback: {
                ...state.playback,
                isPlaying: false,
                isPaused: false,
                scrollOffset: 0,
                progress: 0,
                startTime: null,
                elapsedTime: 0,
            },
        }));
    },

    nextSegment: () => {
        const { project, playback } = get();
        if (!project) return;

        const nextIndex = Math.min(playback.currentSegmentIndex + 1, project.segments.length - 1);
        const nextSegment = project.segments[nextIndex];

        if (nextSegment) {
            set({
                playback: {
                    ...playback,
                    currentSegmentId: nextSegment.id,
                    currentSegmentIndex: nextIndex,
                    scrollOffset: 0,
                    progress: 0,
                },
            });
        }
    },

    prevSegment: () => {
        const { project, playback } = get();
        if (!project) return;

        const prevIndex = Math.max(playback.currentSegmentIndex - 1, 0);
        const prevSegment = project.segments[prevIndex];

        if (prevSegment) {
            set({
                playback: {
                    ...playback,
                    currentSegmentId: prevSegment.id,
                    currentSegmentIndex: prevIndex,
                    scrollOffset: 0,
                    progress: 0,
                },
            });
        }
    },

    setCurrentSegment: (index) => {
        const { project, playback } = get();
        if (!project || index < 0 || index >= project.segments.length) return;

        const segment = project.segments[index];
        set({
            playback: {
                ...playback,
                currentSegmentId: segment.id,
                currentSegmentIndex: index,
                scrollOffset: 0,
                progress: 0,
            },
        });
    },

    setSpeed: (speed) => {
        set((state) => ({
            playback: {
                ...state.playback,
                speed: Math.max(20, Math.min(500, speed)),
            },
        }));
    },

    setScrollOffset: (offset) => {
        set((state) => ({
            playback: { ...state.playback, scrollOffset: offset },
        }));
    },

    setProgress: (progress) => {
        set((state) => ({
            playback: { ...state.playback, progress },
        }));
    },

    toggleMirror: () => {
        const { project } = get();
        if (!project) return;

        const updated = {
            ...project,
            settings: {
                ...project.settings,
                mirrorMode: !project.settings.mirrorMode,
            },
        };

        set({ project: updated, hasUnsavedChanges: true });
        scheduleAutoSave(updated);
    },
});
