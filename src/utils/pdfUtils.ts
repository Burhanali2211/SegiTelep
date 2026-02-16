import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

// Re-exporting types from the types folder
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';
export type { PDFDocumentProxy };

export interface PDFPageInfo {
  pageNumber: number;
  width: number;
  height: number;
  scale: number;
  thumbnail?: string; // base64 data URL
  fullImage?: string; // base64 data URL
}

export interface PDFInfo {
  fileName: string;
  fileSize: number;
  totalPages: number;
  pages: PDFPageInfo[];
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modificationDate?: Date;
  };
}

interface PDFMetadataInfo {
  Title?: string;
  Author?: string;
  Subject?: string;
  Creator?: string;
  Producer?: string;
  CreationDate?: string;
  ModDate?: string;
}

interface PDFTextItem {
  str: string;
  dir?: string;
  width?: number;
  height?: number;
  transform?: number[];
  fontName?: string;
}

export class PDFProcessor {
  private pdfDocument: PDFDocumentProxy | null = null;

  async loadPDF(file: File | Uint8Array, fileName?: string, fileSize?: number): Promise<PDFInfo> {
    try {
      let data: Uint8Array;
      let name = fileName || 'unknown.pdf';
      let size = fileSize || 0;

      if (file instanceof File) {
        const arrayBuffer = await file.arrayBuffer();
        data = new Uint8Array(arrayBuffer);
        name = file.name;
        size = file.size;
      } else {
        data = file;
        if (!size) size = file.length;
      }

      const loadingTask = pdfjsLib.getDocument({
        data,
        useWorkerFetch: false, // Ensure we don't try to fetch worker as data
        isEvalSupported: true,
      });
      this.pdfDocument = await loadingTask.promise;

      const metadata = await this.pdfDocument.getMetadata();
      const totalPages = this.pdfDocument.numPages;

      const pages: PDFPageInfo[] = [];

      // Process each page
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await this.pdfDocument.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.0 });

        pages.push({
          pageNumber: pageNum,
          width: viewport.width,
          height: viewport.height,
          scale: 1.0,
        });
      }

      return {
        fileName: name,
        fileSize: size,
        totalPages,
        pages,
        metadata: {
          title: (metadata.info as PDFMetadataInfo)?.Title,
          author: (metadata.info as PDFMetadataInfo)?.Author,
          subject: (metadata.info as PDFMetadataInfo)?.Subject,
          creator: (metadata.info as PDFMetadataInfo)?.Creator,
          producer: (metadata.info as PDFMetadataInfo)?.Producer,
          creationDate: this.parsePDFDate((metadata.info as PDFMetadataInfo)?.CreationDate),
          modificationDate: this.parsePDFDate((metadata.info as PDFMetadataInfo)?.ModDate),
        }
      };
    } catch (error) {
      console.error('Error loading PDF:', error);
      this.cleanup(); // Clean up on failure
      throw new Error(`Failed to load PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate thumbnail for a specific page
   */
  async generateThumbnail(pageNumber: number, width: number = 200): Promise<string> {
    if (!this.pdfDocument) {
      throw new Error('PDF not loaded');
    }

    try {
      if (pageNumber < 1 || pageNumber > this.pdfDocument.numPages) {
        throw new Error(`Invalid page number: ${pageNumber}`);
      }
      const page = await this.pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.0 });
      const scale = width / viewport.width;
      const scaledViewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { alpha: false })!;

      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;

      // Fill with white background
      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: context,
        viewport: scaledViewport,
        canvas: canvas,
      }).promise;

      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      page.cleanup();
      return dataUrl;
    } catch (error) {
      console.error(`Error generating thumbnail for page ${pageNumber}:`, error);
      throw new Error(`Failed to generate thumbnail for page ${pageNumber}`);
    }
  }

  /**
   * Generate full resolution image for a specific page
   */
  async generateFullImage(pageNumber: number, scale: number = 2.0): Promise<string> {
    if (!this.pdfDocument) {
      throw new Error('PDF not loaded');
    }

    try {
      if (pageNumber < 1 || pageNumber > this.pdfDocument.numPages) {
        throw new Error(`Invalid page number: ${pageNumber}`);
      }
      const page = await this.pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { alpha: false })!;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Fill with white background
      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      }).promise;

      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      page.cleanup();
      return dataUrl;
    } catch (error) {
      console.error(`Error generating full image for page ${pageNumber}:`, error);
      throw new Error(`Failed to generate full image for page ${pageNumber}`);
    }
  }

  /**
   * Generate thumbnails for multiple pages with concurrency control 
   * to prevent blocking the main thread or crashing the browser.
   */
  async generateThumbnails(pageNumbers: number[], width: number = 200): Promise<{ [key: number]: string }> {
    const thumbnails: { [key: number]: string } = {};
    const CONCURRENCY_LIMIT = 3; // Render 3 pages at a time max

    // Process in chunks
    for (let i = 0; i < pageNumbers.length; i += CONCURRENCY_LIMIT) {
      const chunk = pageNumbers.slice(i, i + CONCURRENCY_LIMIT);
      await Promise.all(chunk.map(async (pageNum) => {
        try {
          const thumbnail = await this.generateThumbnail(pageNum, width);
          thumbnails[pageNum] = thumbnail;
        } catch (error) {
          console.warn(`Failed to generate thumbnail for page ${pageNum}:`, error);
        }
      }));
    }

    return thumbnails;
  }

  /**
   * Get selected pages as images
   */
  async getSelectedPages(selectedPages: number[], scale: number = 2.0): Promise<{ pageNumber: number; imageData: string }[]> {
    if (!this.pdfDocument) {
      throw new Error('PDF not loaded');
    }

    const promises = selectedPages.map(async (pageNumber) => {
      const imageData = await this.generateFullImage(pageNumber, scale);
      return { pageNumber, imageData };
    });

    return Promise.all(promises);
  }

  /**
   * Extract text content from a specific page
   */
  async extractTextFromPage(pageNumber: number): Promise<string> {
    if (!this.pdfDocument) {
      throw new Error('PDF not loaded');
    }

    try {
      const page = await this.pdfDocument.getPage(pageNumber);
      const textContent = await page.getTextContent();

      const text = textContent.items
        .map((item) => (item as PDFTextItem).str)
        .join(' ');

      return text.trim();
    } catch (error) {
      console.error(`Error extracting text from page ${pageNumber}:`, error);
      throw new Error(`Failed to extract text from page ${pageNumber}`);
    }
  }

  /**
   * Get PDF document info
   */
  getDocumentInfo(): PDFDocumentProxy | null {
    return this.pdfDocument;
  }

  cleanup(): void {
    if (this.pdfDocument) {
      this.pdfDocument.destroy();
      this.pdfDocument = null;
    }
  }

  /**
   * Parse PDF date string to Date object
   */
  private parsePDFDate(dateString?: string): Date | undefined {
    if (!dateString) return undefined;

    try {
      // PDF dates are in format: D:YYYYMMDDHHmmSSOHH'mm'
      // Remove the D: prefix if present
      const cleanDate = dateString.replace(/^D:/, '');

      // Try to create a date object
      const date = new Date(cleanDate);

      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return undefined;
      }

      return date;
    } catch (error) {
      console.warn('Error parsing PDF date:', error);
      return undefined;
    }
  }
}

/**
 * Utility function to validate PDF file
 */
export function validatePDFFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (file.type !== 'application/pdf') {
    return { valid: false, error: 'Please select a PDF file' };
  }

  // Check file size (100MB limit)
  const maxSize = 100 * 1024 * 1024; // 100MB
  if (file.size > maxSize) {
    return { valid: false, error: 'PDF file must be less than 100MB' };
  }

  // Check file extension
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return { valid: false, error: 'File must have .pdf extension' };
  }

  return { valid: true };
}

/**
 * Utility function to format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Utility function to format date
 */
export function formatDate(date?: Date): string {
  if (!date) return 'Unknown';

  // Check if the date is valid
  if (isNaN(date.getTime())) {
    return 'Unknown';
  }

  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch (error) {
    console.warn('Error formatting date:', error);
    return 'Unknown';
  }
}
