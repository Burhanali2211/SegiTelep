import { create } from 'zustand';
import { ProjectSlice, createProjectSlice } from './slices/projectSlice';
import { PlaybackSlice, createPlaybackSlice } from './slices/playbackSlice';
import { EditorSlice, createEditorSlice } from './slices/editorSlice';

export type TeleprompterStore = ProjectSlice & PlaybackSlice & EditorSlice;

export const useTeleprompterStore = create<TeleprompterStore>()((...a) => ({
  ...createProjectSlice(...a),
  ...createPlaybackSlice(...a),
  ...createEditorSlice(...a),
}));

