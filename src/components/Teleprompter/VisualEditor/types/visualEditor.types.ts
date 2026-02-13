import { Region } from '@/types/teleprompter.types';
import { VisualSegment, ImagePage } from '@/core/projects/models';

export type { VisualSegment, ImagePage };

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
