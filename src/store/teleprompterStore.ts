import { create } from 'zustand';
import { ProjectSlice, createProjectSlice } from './slices/projectSlice';
import { PlaybackSlice, createPlaybackSlice } from './slices/playbackSlice';
import { EditorSlice, createEditorSlice } from './slices/editorSlice';
import { SettingsSlice, createSettingsSlice } from './slices/settingsSlice';

export type TeleprompterStore = ProjectSlice & PlaybackSlice & EditorSlice & SettingsSlice;

export const useTeleprompterStore = create<TeleprompterStore>()((...a) => ({
  ...createProjectSlice(...a),
  ...createPlaybackSlice(...a),
  ...createEditorSlice(...a),
  ...createSettingsSlice(...a),
}));

