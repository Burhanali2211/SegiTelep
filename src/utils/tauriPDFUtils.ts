import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { readFile, stat } from '@tauri-apps/plugin-fs';
import { PDFProcessor, PDFInfo, validatePDFFile } from './pdfUtils';

/**
 * Tauri-specific PDF utilities for desktop environment
 */
export class TauriPDFProcessor extends PDFProcessor {
  /**
   * Load PDF from file path in Tauri environment
   */
  async loadPDFFromPath(filePath: string): Promise<PDFInfo> {
    try {
      const fileStats = await stat(filePath);
      const fileName = filePath.split(/[/\\]/).pop() || 'unknown.pdf';

      // Read the file as binary data
      const fileData = await readFile(filePath);

      // Use the parent class method with raw binary data and metadata
      return this.loadPDF(fileData, fileName, fileStats.size);
    } catch (error) {
      console.error('Error loading PDF from path:', error);
      throw new Error(`Failed to load PDF from path: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Open PDF file dialog in Tauri environment
 */
export async function openPDFFileDialog(): Promise<string | null> {
  try {
    const selected = await open({
      title: 'Select PDF File',
      filters: [
        {
          name: 'PDF Files',
          extensions: ['pdf']
        }
      ],
      multiple: false
    });

    return selected as string || null;
  } catch (error) {
    console.error('Error opening file dialog:', error);
    return null;
  }
}

/**
 * Check if running in Tauri environment
 */
export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

/**
 * Enhanced PDF file validation for Tauri
 */
export async function validatePDFFileInTauri(filePath?: string): Promise<{ valid: boolean; error?: string; fileInfo?: { size: number } }> {
  if (!filePath) {
    return { valid: false, error: 'No file path provided' };
  }

  try {
    // For now, just check file extension and basic validation
    // Full file metadata can be added later if needed
    if (!filePath.toLowerCase().endsWith('.pdf')) {
      return { valid: false, error: 'File must have .pdf extension' };
    }

    return { valid: true };
  } catch (error) {
    console.error('Error validating PDF file in Tauri:', error);
    return { valid: false, error: 'Failed to validate file' };
  }
}

/**
 * Get PDF file info using Tauri APIs
 */
export async function getPDFFileInfo(filePath: string): Promise<{
  name: string;
  size: number;
  path: string;
} | null> {
  try {
    const fileStats = await stat(filePath);
    const fileName = filePath.split(/[/\\]/).pop() || 'unknown.pdf';

    return {
      name: fileName,
      size: fileStats.size,
      path: filePath
    };
  } catch (error) {
    console.error('Error getting PDF file info:', error);
    return null;
  }
}

/**
 * Process PDF file completely in Tauri environment
 */
export async function processPDFInTauri(filePath?: string): Promise<{
  pdfInfo: PDFInfo | null;
  error?: string;
}> {
  try {
    if (!filePath) {
      // Open file dialog if no path provided
      filePath = await openPDFFileDialog();
      if (!filePath) {
        return { pdfInfo: null, error: 'No file selected' };
      }
    }

    // Validate file
    const validation = await validatePDFFileInTauri(filePath);
    if (!validation.valid) {
      return { pdfInfo: null, error: validation.error };
    }

    // Process PDF
    const processor = new TauriPDFProcessor();
    const pdfInfo = await processor.loadPDFFromPath(filePath);

    return { pdfInfo };
  } catch (error) {
    console.error('Error processing PDF in Tauri:', error);
    return {
      pdfInfo: null,
      error: error instanceof Error ? error.message : 'Failed to process PDF'
    };
  }
}

/**
 * Fallback for browser environment
 */
export function getPDFProcessor(): PDFProcessor {
  if (isTauriEnvironment()) {
    return new TauriPDFProcessor();
  }
  return new PDFProcessor();
}
