// Core Types for Teleprompter Application

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface Region {
  x: number;      // percentage 0-100
  y: number;      // percentage 0-100
  width: number;  // percentage 0-100
  height: number; // percentage 0-100
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  modifiedAt: number;
  segments: Segment[];
  settings: ProjectSettings;
}

export interface Segment {
  id: string;
  type: 'text' | 'image' | 'image-region' | 'pdf-page';
  name: string;
  order: number;

  // Content
  content: string; // Text content or asset reference (base64 data URL)

  // Region for cropped segments
  region?: Region;
  sourceAssetId?: string; // Reference to source image for regions

  // Audio
  audioId?: string;
  syncToAudio?: boolean; // If true, use audio duration

  // Playback settings
  scrollSpeed: number; // pixels per second (for text)
  duration: number; // seconds (for static content like images)

  // Visual settings
  fontSize: number;
  fontFamily: string;
  textColor: 'green' | 'white' | 'yellow';
  lineHeight: number;
  mirror: boolean;
}

export interface ProjectSettings {
  defaultScrollSpeed: number;
  defaultFontSize: number;
  defaultFontFamily: string;
  defaultTextColor: 'green' | 'white' | 'yellow';
  defaultLineHeight: number;
  mirrorMode: boolean;
  showGuide: boolean;
  guidePosition: number; // 0-100 percentage from top
  autoHideControls: boolean;
  controlsHideDelay: number; // milliseconds
}

export interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentSegmentId: string | null;
  currentSegmentIndex: number;
  scrollOffset: number;
  totalHeight: number;
  progress: number; // 0-1
  speed: number;
  startTime: number | null;
  elapsedTime: number;
  // Duration playback for visual segments
  segmentStartTime: number | null;
  segmentElapsedTime: number;
}

export interface RenderState {
  width: number;
  height: number;
  pixelRatio: number;
  fps: number;
  frameTime: number;
}

export type LayoutMode = 'default' | 'visual-expanded' | 'fullscreen-editor';

export interface EditorState {
  selectedSegmentId: string | null;
  isEditing: boolean;
  isDragging: boolean;
  draggedSegmentId: string | null;
  layoutMode: LayoutMode;
  segmentListCollapsed: boolean;
  previewCollapsed: boolean;
}

// Audio file stored in localStorage
export interface AudioFile {
  id: string;
  name: string;
  data: string;
  duration: number;
}

// Default values
export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  defaultScrollSpeed: 100,
  defaultFontSize: 48,
  defaultFontFamily: 'Inter',
  defaultTextColor: 'white',
  defaultLineHeight: 1.8,
  mirrorMode: false,
  showGuide: true,
  guidePosition: 33,
  autoHideControls: true,
  controlsHideDelay: 3000,
};

export const DEFAULT_SEGMENT: Omit<Segment, 'id' | 'order' | 'name'> = {
  type: 'text',
  content: '',
  scrollSpeed: 100,
  duration: 5,
  fontSize: 48,
  fontFamily: 'Inter',
  textColor: 'white',
  lineHeight: 1.8,
  mirror: false,
};

export const SPEED_PRESETS = [20, 40, 60, 80, 100, 120, 150, 200, 300, 500];

export const FONT_OPTIONS = [
  'Inter',
  'Arial',
  'Georgia',
  'Times New Roman',
  'Verdana',
  'Helvetica',
  'Roboto Mono',
];

export const TEXT_COLOR_OPTIONS: Array<{ value: 'green' | 'white' | 'yellow'; label: string; hex: string }> = [
  { value: 'green', label: 'Green', hex: '#00ff00' },
  { value: 'white', label: 'White', hex: '#ffffff' },
  { value: 'yellow', label: 'Yellow', hex: '#ffff00' },
];

// Helper to check if segment is visual type
export const isVisualSegment = (segment: Segment): boolean => {
  return segment.type === 'image' || segment.type === 'image-region' || segment.type === 'pdf-page';
};
