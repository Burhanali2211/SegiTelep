import { StateCreator } from 'zustand';
import { EditorState } from '@/types/teleprompter.types';
import { TeleprompterStore } from '../teleprompterStore';

export interface EditorSlice {
    editor: EditorState;

    selectSegment: (id: string | null) => void;
    setEditing: (isEditing: boolean) => void;
    setDragging: (isDragging: boolean, segmentId?: string | null) => void;
    setLayoutMode: (mode: 'default' | 'visual-expanded' | 'fullscreen-editor') => void;
    toggleSegmentListCollapsed: () => void;
    togglePreviewCollapsed: () => void;
}

export const createEditorSlice: StateCreator<
    TeleprompterStore,
    [],
    [],
    EditorSlice
> = (set) => ({
    editor: {
        selectedSegmentId: null,
        isEditing: false,
        isDragging: false,
        draggedSegmentId: null,
        layoutMode: (() => {
            if (typeof window === 'undefined') return 'default';
            // Handle both hash-based and search-based params
            const params = new URLSearchParams(window.location.hash.includes('?') ? window.location.hash.split('?')[1] : window.location.search);
            const viewParam = params.get('view');
            return viewParam === 'visual' ? 'visual-expanded' : 'default';
        })(),
        segmentListCollapsed: false,
        previewCollapsed: false,
    },

    selectSegment: (id) => {
        set((state) => ({
            editor: { ...state.editor, selectedSegmentId: id },
        }));
    },

    setEditing: (isEditing) => {
        set((state) => ({
            editor: { ...state.editor, isEditing },
        }));
    },

    setDragging: (isDragging, segmentId = null) => {
        set((state) => ({
            editor: {
                ...state.editor,
                isDragging,
                draggedSegmentId: segmentId,
            },
        }));
    },

    setLayoutMode: (mode) => {
        set((state) => ({
            editor: { ...state.editor, layoutMode: mode },
        }));
    },

    toggleSegmentListCollapsed: () => {
        set((state) => ({
            editor: { ...state.editor, segmentListCollapsed: !state.editor.segmentListCollapsed },
        }));
    },

    togglePreviewCollapsed: () => {
        set((state) => ({
            editor: { ...state.editor, previewCollapsed: !state.editor.previewCollapsed },
        }));
    },
});
