import { Region } from '@/types/teleprompter.types';

export interface VisualSegment {
    id: string;
    pageIndex: number;
    region: Region;
    label: string;
    startTime: number;
    endTime: number;
    isHidden?: boolean;
    order: number;
    color?: string;
    notes?: string;
}

export interface ImagePage {
    id: string;
    assetId?: string;
    data?: string; // URL, Base64, or File Path. Optional to match UI types.
    segments: VisualSegment[];
    isPDF?: boolean;
    _mimeType?: string; // Internal use for NativeStorage reconstruction
}

export interface VisualProject {
    id: string;
    name: string;
    createdAt: number;
    modifiedAt: number;
    pages: ImagePage[];
    audioFile: { id: string; name: string; data: string; duration: number; mimeType?: string } | null;
}

export interface ProjectMetadata {
    id: string;
    name: string;
    createdAt: number;
    modifiedAt: number;
    pageCount: number;
    pages?: unknown[];
    audioFile?: unknown;
    audioFileName: string | null;
}
