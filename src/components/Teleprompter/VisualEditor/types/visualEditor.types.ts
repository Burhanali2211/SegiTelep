import { Region } from '@/types/teleprompter.types';

export interface VisualSegment {
  id: string;
  pageIndex: number;
  region: Region;
  label: string;
  startTime: number; // seconds with centiseconds
  endTime: number;
  isHidden: boolean;
  order: number;
  color?: string;
  notes?: string;
}

export interface ImagePage {
  id: string;
  data: string; // base64 data URL
  segments: VisualSegment[];
  isPDF?: boolean; // Optional flag to distinguish PDF pages
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
