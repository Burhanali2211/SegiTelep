import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist/types/src/display/api';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

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

export class PDFProcessor {
  private pdfDocument: PDFDocumentProxy | null = null;

  /**
   * Load PDF from File object
   */
  async loadPDF(file: File): Promise<PDFInfo> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
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
        fileName: file.name,
        fileSize: file.size,
        totalPages,
        pages,
        metadata: {
          title: (metadata.info as any)?.Title,
          author: (metadata.info as any)?.Author,
          subject: (metadata.info as any)?.Subject,
          creator: (metadata.info as any)?.Creator,
          producer: (metadata.info as any)?.Producer,
          creationDate: this.parsePDFDate((metadata.info as any)?.CreationDate),
          modificationDate: this.parsePDFDate((metadata.info as any)?.ModDate),
        }
      };
    } catch (error) {
      console.error('Error loading PDF:', error);
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
      const page = await this.pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.0 });
      const scale = width / viewport.width;
      const scaledViewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;

      await page.render({
        canvasContext: context,
        viewport: scaledViewport,
        canvas,
      }).promise;

      return canvas.toDataURL('image/jpeg', 0.8);
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
      const page = await this.pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport: viewport,
        canvas,
      }).promise;

      return canvas.toDataURL('image/jpeg', 0.9);
    } catch (error) {
      console.error(`Error generating full image for page ${pageNumber}:`, error);
      throw new Error(`Failed to generate full image for page ${pageNumber}`);
    }
  }

  /**
   * Generate thumbnails for multiple pages in parallel
   */
  async generateThumbnails(pageNumbers: number[], width: number = 200): Promise<{ [key: number]: string }> {
    const promises = pageNumbers.map(async (pageNum) => {
      const thumbnail = await this.generateThumbnail(pageNum, width);
      return { pageNum, thumbnail };
    });

    const results = await Promise.all(promises);
    const thumbnails: { [key: number]: string } = {};
    
    results.forEach(({ pageNum, thumbnail }) => {
      thumbnails[pageNum] = thumbnail;
    });

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
        .map((item: any) => item.str)
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

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.pdfDocument = null;
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
