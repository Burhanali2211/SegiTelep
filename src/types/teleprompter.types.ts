// Core Types for Teleprompter Application

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
  type: 'text' | 'image' | 'pdf-page';
  name: string;
  order: number;
  
  // Content
  content: string; // Text content or asset reference ID
  
  // Playback settings
  scrollSpeed: number; // pixels per second
  duration: number; // seconds (for static content)
  
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
}

export interface RenderState {
  width: number;
  height: number;
  pixelRatio: number;
  fps: number;
  frameTime: number;
}

export interface EditorState {
  selectedSegmentId: string | null;
  isEditing: boolean;
  isDragging: boolean;
  draggedSegmentId: string | null;
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
  duration: 10,
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
