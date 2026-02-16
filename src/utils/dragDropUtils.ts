import { validatePDFFile, formatFileSize } from './pdfUtils';

export interface DragDropHandlers {
  onDragEnter?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, files: File[]) => void;
}

export interface DragDropState {
  isDragging: boolean;
  isDragOver: boolean;
  isValidFile: boolean;
  errorMessage?: string;
}

export class DragDropManager {
  private dragCounter: number = 0;
  private state: DragDropState = {
    isDragging: false,
    isDragOver: false,
    isValidFile: false,
  };

  /**
   * Handle drag enter event
   */
  handleDragEnter = (e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();

    this.dragCounter++;

    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      this.state.isDragging = true;
      this.state.isDragOver = true;

      // Check if dragged files are valid PDFs
      const files = Array.from(e.dataTransfer.items)
        .filter(item => item.kind === 'file')
        .map(item => item.getAsFile())
        .filter(file => file !== null) as File[];

      if (files.length > 0) {
        const validation = validatePDFFile(files[0]);
        this.state.isValidFile = validation.valid;
        this.state.errorMessage = validation.error;
      } else {
        this.state.isValidFile = false;
        this.state.errorMessage = 'Please drag a PDF file';
      }
    }
  };

  /**
   * Handle drag leave event
   */
  handleDragLeave = (e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();

    this.dragCounter--;

    if (this.dragCounter === 0) {
      this.state.isDragging = false;
      this.state.isDragOver = false;
      this.state.isValidFile = false;
      this.state.errorMessage = undefined;
    }
  };

  /**
   * Handle drag over event
   */
  handleDragOver = (e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();

    if (this.state.isDragging) {
      this.state.isDragOver = true;
    }
  };

  /**
   * Handle drop event
   */
  handleDrop = (e: React.DragEvent): File[] => {
    e.preventDefault();
    e.stopPropagation();

    this.dragCounter = 0;
    this.state.isDragging = false;
    this.state.isDragOver = false;

    const files = Array.from(e.dataTransfer.files);

    // Filter and validate PDF files
    const validPDFs = files.filter(file => {
      const validation = validatePDFFile(file);
      return validation.valid;
    });

    if (validPDFs.length === 0 && files.length > 0) {
      this.state.errorMessage = 'Please drag valid PDF files';
    } else {
      this.state.errorMessage = undefined;
    }

    return validPDFs;
  };

  /**
   * Get current state
   */
  getState(): DragDropState {
    return { ...this.state };
  };

  /**
   * Reset state
   */
  reset(): void {
    this.dragCounter = 0;
    this.state = {
      isDragging: false,
      isDragOver: false,
      isValidFile: false,
      errorMessage: undefined,
    };
  };
}

/**
 * Hook for managing drag and drop state
 */
export function useDragDrop() {
  const manager = new DragDropManager();

  return {
    handleDragEnter: manager.handleDragEnter,
    handleDragLeave: manager.handleDragLeave,
    handleDragOver: manager.handleDragOver,
    handleDrop: manager.handleDrop,
    getState: manager.getState,
    reset: manager.reset,
  };
}

/**
 * Utility to create drag drop handlers for React components
 */
export function createDragDropHandlers(
  onDrop: (files: File[]) => void,
  onDragEnter?: (e: React.DragEvent) => void,
  onDragLeave?: (e: React.DragEvent) => void,
  onDragOver?: (e: React.DragEvent) => void
) {
  const manager = new DragDropManager();

  return {
    handleDragEnter: (e: React.DragEvent) => {
      manager.handleDragEnter(e);
      onDragEnter?.(e);
    },
    handleDragLeave: (e: React.DragEvent) => {
      manager.handleDragLeave(e);
      onDragLeave?.(e);
    },
    handleDragOver: (e: React.DragEvent) => {
      manager.handleDragOver(e);
      onDragOver?.(e);
    },
    handleDrop: (e: React.DragEvent): File[] => {
      const files = manager.handleDrop(e);
      if (files.length > 0) {
        onDrop(files);
      }
      return files;
    },
    getState: manager.getState,
    reset: manager.reset,
  };
}

/**
 * Utility to check if file type is supported
 */
export function isSupportedFileType(file: File): boolean {
  const supportedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff',
  ];

  return supportedTypes.includes(file.type);
}

/**
 * Utility to get file category
 */
export function getFileCategory(file: File): 'pdf' | 'image' | 'other' {
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type.startsWith('image/')) return 'image';
  return 'other';
}

/**
 * Utility to format file info for display
 */
export function formatFileInfo(file: File): {
  name: string;
  size: string;
  type: string;
  category: 'pdf' | 'image' | 'other';
} {
  return {
    name: file.name,
    size: formatFileSize(file.size),
    type: file.type || 'Unknown',
    category: getFileCategory(file),
  };
}
