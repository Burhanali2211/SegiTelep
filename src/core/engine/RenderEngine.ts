// Canvas-based rendering engine for high-performance text display

import { Segment, TEXT_COLOR_OPTIONS, Region } from '@/types/teleprompter.types';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';

// Configure PDF.js worker (required for proper PDF parsing)
if (typeof window !== 'undefined' && typeof pdfjsLib.GlobalWorkerOptions !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

// Constants
const PADDING = 100;
const PDF_RENDER_SCALE = 2;
const MAX_CACHE_SIZE = 50; // Prevent memory leaks
const VIRTUAL_SCROLL_BUFFER = 2; // Render 2x viewport height

export interface RenderConfig {
  width: number;
  height: number;
  pixelRatio: number;
  guidePosition: number; // 0-100
  showGuide: boolean;
}

export interface TextMetrics {
  lines: string[];
  lineHeight: number;
  totalHeight: number;
  fontSize: number;
}

export type LoadingState = 'idle' | 'loading' | 'loaded' | 'error';

export class RenderEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private config: RenderConfig;
  private cachedMetrics: Map<string, TextMetrics> = new Map();
  private cachedImages: Map<string, HTMLImageElement> = new Map();
  private cachedPdfDocs: Map<string, any> = new Map();
  private loadingPromises: Map<string, Promise<HTMLImageElement>> = new Map();
  private loadingStates: Map<string, LoadingState> = new Map();
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private fps: number = 60;

  constructor(config: Partial<RenderConfig> = {}) {
    this.config = {
      width: 1920,
      height: 1080,
      pixelRatio: typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1,
      guidePosition: 33,
      showGuide: true,
      ...config,
    };
  }

  attachCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true, // Better performance
    });

    if (!ctx) {
      throw new Error('Failed to get 2D rendering context');
    }

    this.ctx = ctx;
    this.resize(this.config.width, this.config.height);
  }

  resize(width: number, height: number): void {
    if (!this.canvas || !this.ctx) return;

    this.config.width = width;
    this.config.height = height;

    // Set canvas size with pixel ratio for sharp text
    const ratio = this.config.pixelRatio;
    this.canvas.width = width * ratio;
    this.canvas.height = height * ratio;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    // Scale context for retina displays
    this.ctx.scale(ratio, ratio);

    // Clear metrics cache on resize
    this.cachedMetrics.clear();
  }

  setConfig(config: Partial<RenderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): RenderConfig {
    return { ...this.config };
  }

  /**
   * Get loading state for a segment
   */
  getLoadingState(segment: Segment): LoadingState {
    if (segment.type === 'text') return 'loaded';

    const key = this.getContentKey(segment);
    return this.loadingStates.get(key) || 'idle';
  }

  /**
   * Preload content for a segment (returns promise that resolves when loaded)
   */
  async preloadSegment(segment: Segment): Promise<void> {
    if (segment.type === 'text') return;
    if (!segment.content) return;

    const key = this.getContentKey(segment);

    // Already loaded
    if (this.cachedImages.has(key)) {
      return;
    }

    // Already loading
    if (this.loadingPromises.has(key)) {
      await this.loadingPromises.get(key);
      return;
    }

    // Start loading
    try {
      if (segment.type === 'pdf-page') {
        await this.loadPdfPage(segment.content, segment.pageNumber || 1);
      } else {
        await this.loadImage(segment.content);
      }
    } catch (error) {
      console.error(`Failed to preload segment ${segment.id}:`, error);
      throw error;
    }
  }

  measureText(segment: Segment): TextMetrics {
    // For image/pdf segments, return simple metrics
    if (segment.type === 'image' || segment.type === 'pdf-page' || segment.type === 'image-region') {
      return {
        lines: [],
        lineHeight: 0,
        totalHeight: 0,
        fontSize: 0,
      };
    }

    const cacheKey = `${segment.id}-${segment.fontSize}-${segment.fontFamily}-${this.config.width}`;

    if (this.cachedMetrics.has(cacheKey)) {
      return this.cachedMetrics.get(cacheKey)!;
    }

    if (!this.ctx) {
      return { lines: [], lineHeight: 0, totalHeight: 0, fontSize: segment.fontSize };
    }

    const fontSize = segment.fontSize;
    const lineHeight = fontSize * segment.lineHeight;
    const maxWidth = this.config.width - PADDING;

    this.ctx.font = `${fontSize}px ${segment.fontFamily}`;

    const words = segment.content.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = this.ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    const totalHeight = lines.length * lineHeight + this.config.height;

    const metrics: TextMetrics = {
      lines,
      lineHeight,
      totalHeight,
      fontSize,
    };

    this.cachedMetrics.set(cacheKey, metrics);
    return metrics;
  }

  private getContentKey(segment: Segment): string {
    if (segment.type === 'pdf-page') {
      return `pdf:${segment.content}:page${segment.pageNumber || 1}`;
    }
    return segment.content || '';
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    // Return cached image
    if (this.cachedImages.has(src)) {
      return Promise.resolve(this.cachedImages.get(src)!);
    }

    // Return existing loading promise
    if (this.loadingPromises.has(src)) {
      return this.loadingPromises.get(src)!;
    }

    // Start new load
    this.loadingStates.set(src, 'loading');

    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        this.enforceMaxCacheSize();
        this.cachedImages.set(src, img);
        this.loadingStates.set(src, 'loaded');
        this.loadingPromises.delete(src);
        resolve(img);
      };

      img.onerror = (error) => {
        this.loadingStates.set(src, 'error');
        this.loadingPromises.delete(src);
        reject(new Error(`Failed to load image: ${src}`));
      };

      img.src = src;
    });

    this.loadingPromises.set(src, promise);
    return promise;
  }

  private async loadPdfPage(dataUrl: string, pageNumber: number = 1): Promise<HTMLImageElement> {
    const key = `pdf:${dataUrl}:page${pageNumber}`;
    const pdfKey = `pdf_doc:${dataUrl.substring(0, 100)}`; // Use a prefix of hash if possible, but dataUrl is our key

    // Return cached page
    if (this.cachedImages.has(key)) {
      return this.cachedImages.get(key)!;
    }

    // Return existing loading promise
    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key)!;
    }

    // Start new load
    this.loadingStates.set(key, 'loading');

    const promise = (async () => {
      try {
        // Safety: If this is actually an image data URL, redirect to loadImage
        if (dataUrl.startsWith('data:image/')) {
          return this.loadImage(dataUrl);
        }

        let pdf = this.cachedPdfDocs.get(dataUrl);

        if (!pdf) {
          let uint8Array: Uint8Array;

          if (dataUrl.startsWith('data:')) {
            const [, base64Data] = dataUrl.split(',');
            if (!base64Data) throw new Error('Invalid PDF data URL');
            const binaryString = atob(base64Data);
            uint8Array = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              uint8Array[i] = binaryString.charCodeAt(i);
            }
          } else {
            // Handle blob: or other source URLs
            const response = await fetch(dataUrl);
            const arrayBuffer = await response.arrayBuffer();
            uint8Array = new Uint8Array(arrayBuffer);
          }

          pdf = await pdfjsLib.getDocument({
            data: uint8Array,
            useSystemFonts: true, // Improved compatibility
            useWorkerFetch: false,
          }).promise;

          this.cachedPdfDocs.set(dataUrl, pdf);
        }

        // Validate page number
        if (pageNumber < 1 || pageNumber > pdf.numPages) {
          throw new Error(`Invalid page number ${pageNumber}. PDF has ${pdf.numPages} pages.`);
        }

        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: PDF_RENDER_SCALE });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Could not get canvas context for PDF rendering');
        }

        await page.render({
          canvasContext: ctx,
          viewport,
          canvas
        }).promise;

        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to convert PDF canvas to image'));
          img.src = canvas.toDataURL('image/png');
        });

        // Cleanup page resources immediately
        page.cleanup();

        this.enforceMaxCacheSize();
        this.cachedImages.set(key, img);
        this.loadingStates.set(key, 'loaded');
        this.loadingPromises.delete(key);

        return img;
      } catch (error) {
        this.loadingStates.set(key, 'error');
        this.loadingPromises.delete(key);
        throw error;
      }
    })();

    this.loadingPromises.set(key, promise);
    return promise;
  }

  private enforceMaxCacheSize(): void {
    if (this.cachedImages.size >= MAX_CACHE_SIZE) {
      // Remove oldest 10 entries (simple FIFO)
      const keysToRemove = Array.from(this.cachedImages.keys()).slice(0, 10);
      keysToRemove.forEach(key => {
        this.cachedImages.delete(key);
        this.loadingStates.delete(key);
      });
    }
  }

  render(segment: Segment, scrollOffset: number, mirror: boolean = false): void {
    if (!this.ctx || !this.canvas) return;

    // Safety check for valid dimensions to prevent crashes in some browsers
    if (this.config.width <= 0 || this.config.height <= 0) return;

    const { width, height } = this.config;

    // Clear canvas
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, width, height);

    // Apply mirror transform if needed
    this.ctx.save();
    if (mirror) {
      this.ctx.translate(width, 0);
      this.ctx.scale(-1, 1);
    }

    // Handle different segment types
    if (segment.type === 'image' || segment.type === 'pdf-page') {
      this.renderImage(segment, scrollOffset);
    } else if (segment.type === 'image-region') {
      this.renderRegion(segment);
    } else {
      this.renderText(segment, scrollOffset);
    }

    this.ctx.restore();

    // Draw guide line (only for text segments)
    if (this.config.showGuide && segment.type === 'text') {
      this.drawGuide();
    }

    // Track FPS
    this.updateFps();
  }

  private renderImage(segment: Segment, scrollOffset: number): void {
    if (!this.ctx || !segment.content) return;

    const { width, height } = this.config;
    const key = this.getContentKey(segment);
    const isPdf = segment.type === 'pdf-page';

    // Check if image is cached
    if (this.cachedImages.has(key)) {
      const img = this.cachedImages.get(key)!;
      this.drawImageCentered(img, width, height);
      return;
    }

    // Check loading state
    const state = this.loadingStates.get(key) || 'idle';

    if (state === 'loading') {
      this.drawLoadingIndicator(width, height, isPdf ? 'PDF' : 'Image');
    } else if (state === 'error') {
      this.drawError(width, height, isPdf ? 'PDF failed to load' : 'Image failed to load');
    } else {
      // Start loading
      const loadPromise = isPdf
        ? this.loadPdfPage(segment.content, segment.pageNumber || 1)
        : this.loadImage(segment.content);

      this.drawLoadingIndicator(width, height, isPdf ? 'PDF' : 'Image');

      // Image will be rendered on next frame after loading completes
      loadPromise.catch(() => {
        // Error state already set in load methods
      });
    }
  }

  private renderRegion(segment: Segment): void {
    if (!this.ctx || !segment.content || !segment.region) return;

    const { width, height } = this.config;
    const region = segment.region;

    // Check if image is cached
    if (this.cachedImages.has(segment.content)) {
      const img = this.cachedImages.get(segment.content)!;
      this.drawRegionCropped(img, region, width, height);
      return;
    }

    // Check loading state
    const state = this.loadingStates.get(segment.content) || 'idle';

    if (state === 'loading') {
      this.drawLoadingIndicator(width, height, 'Region');
    } else if (state === 'error') {
      this.drawError(width, height, 'Region failed to load');
    } else {
      // Start loading
      this.loadImage(segment.content).catch(() => {
        // Error state already set
      });
      this.drawLoadingIndicator(width, height, 'Region');
    }
  }

  private drawLoadingIndicator(width: number, height: number, type: string): void {
    if (!this.ctx) return;

    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(width * 0.1, height * 0.1, width * 0.8, height * 0.8);

    this.ctx.fillStyle = '#888888';
    this.ctx.font = '24px Inter, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(`Loading ${type}...`, width / 2, height / 2);
  }

  private drawError(width: number, height: number, message: string): void {
    if (!this.ctx) return;

    this.ctx.fillStyle = '#2a1a1a';
    this.ctx.fillRect(width * 0.1, height * 0.1, width * 0.8, height * 0.8);

    this.ctx.fillStyle = '#ff6b6b';
    this.ctx.font = '24px Inter, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(message, width / 2, height / 2);
  }

  private drawRegionCropped(img: HTMLImageElement, region: Region, width: number, height: number): void {
    if (!this.ctx) return;

    // Convert percentage region to pixel coordinates on source image
    const sx = (region.x / 100) * img.width;
    const sy = (region.y / 100) * img.height;
    const sw = (region.width / 100) * img.width;
    const sh = (region.height / 100) * img.height;

    // Calculate destination dimensions maintaining aspect ratio
    const cropAspect = sw / sh;
    const canvasAspect = width / height;

    let drawWidth: number;
    let drawHeight: number;

    if (cropAspect > canvasAspect) {
      drawWidth = width;
      drawHeight = width / cropAspect;
    } else {
      drawHeight = height;
      drawWidth = height * cropAspect;
    }

    const dx = (width - drawWidth) / 2;
    const dy = (height - drawHeight) / 2;

    // Draw cropped region scaled to fit canvas
    this.ctx.drawImage(img, sx, sy, sw, sh, dx, dy, drawWidth, drawHeight);
  }

  private drawImageCentered(img: HTMLImageElement, width: number, height: number): void {
    if (!this.ctx) return;

    // Calculate aspect-fit dimensions
    const imgAspect = img.width / img.height;
    const canvasAspect = width / height;

    let drawWidth: number;
    let drawHeight: number;

    if (imgAspect > canvasAspect) {
      // Image is wider
      drawWidth = width;
      drawHeight = width / imgAspect;
    } else {
      // Image is taller
      drawHeight = height;
      drawWidth = height * imgAspect;
    }

    const x = (width - drawWidth) / 2;
    const y = (height - drawHeight) / 2;

    this.ctx.drawImage(img, x, y, drawWidth, drawHeight);
  }

  private renderText(segment: Segment, scrollOffset: number): void {
    if (!this.ctx) return;

    const { width, height } = this.config;
    const metrics = this.measureText(segment);

    // Get text color
    const colorOption = TEXT_COLOR_OPTIONS.find(c => c.value === segment.textColor);
    const textColor = colorOption?.hex || '#ffffff';

    // Set up text rendering
    this.ctx.font = `${metrics.fontSize}px ${segment.fontFamily}`;
    this.ctx.fillStyle = textColor;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';

    // Enable text anti-aliasing
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';

    // Calculate visible range (virtual scrolling with buffer)
    const bufferZone = height * VIRTUAL_SCROLL_BUFFER;
    const startLine = Math.max(0, Math.floor((scrollOffset - bufferZone) / metrics.lineHeight));
    const endLine = Math.min(metrics.lines.length, Math.ceil((scrollOffset + bufferZone) / metrics.lineHeight));

    // Render only visible lines
    const centerX = width / 2;
    const startY = height * (this.config.guidePosition / 100);

    for (let i = startLine; i < endLine; i++) {
      const y = startY + (i * metrics.lineHeight) - scrollOffset;

      // Only render if within viewport (with small buffer)
      if (y > -metrics.lineHeight && y < height + metrics.lineHeight) {
        this.ctx.fillText(metrics.lines[i], centerX, y);
      }
    }
  }

  private drawGuide(): void {
    if (!this.ctx) return;

    const { width, height, guidePosition } = this.config;
    const y = height * (guidePosition / 100);

    // Draw gradient guide line
    const gradient = this.ctx.createLinearGradient(0, y, width, y);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(0.2, '#fbbf24');
    gradient.addColorStop(0.8, '#fbbf24');
    gradient.addColorStop(1, 'transparent');

    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, y);
    this.ctx.lineTo(width, y);
    this.ctx.stroke();

    // Glow effect
    this.ctx.shadowColor = '#fbbf24';
    this.ctx.shadowBlur = 10;
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;
  }

  private updateFps(): void {
    this.frameCount++;
    const now = performance.now();

    if (now - this.lastFpsUpdate >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
  }

  getFps(): number {
    return this.fps;
  }

  clearCache(): void {
    this.cachedMetrics.clear();
    this.cachedImages.clear();
    this.loadingPromises.clear();
    this.loadingStates.clear();

    // Explicitly destroy PDF documents
    this.cachedPdfDocs.forEach(pdf => {
      try { pdf.destroy(); } catch (e) { }
    });
    this.cachedPdfDocs.clear();
  }

  destroy(): void {
    this.clearCache();
    this.ctx = null;
    this.canvas = null;
  }
}

// Singleton for global access
let renderEngineInstance: RenderEngine | null = null;

export function getRenderEngine(): RenderEngine {
  if (!renderEngineInstance) {
    renderEngineInstance = new RenderEngine();
  }
  return renderEngineInstance;
}

export function destroyRenderEngine(): void {
  if (renderEngineInstance) {
    renderEngineInstance.destroy();
    renderEngineInstance = null;
  }
}