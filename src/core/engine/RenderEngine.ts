// Canvas-based rendering engine for high-performance text display

import { Segment, TEXT_COLOR_OPTIONS } from '@/types/teleprompter.types';

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

export class RenderEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private config: RenderConfig;
  private cachedMetrics: Map<string, TextMetrics> = new Map();
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private fps: number = 60;
  
  constructor(config: Partial<RenderConfig> = {}) {
    this.config = {
      width: 1920,
      height: 1080,
      pixelRatio: window.devicePixelRatio || 1,
      guidePosition: 33,
      showGuide: true,
      ...config,
    };
  }
  
  attachCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true, // Better performance
    });
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
  
  measureText(segment: Segment): TextMetrics {
    const cacheKey = `${segment.id}-${segment.fontSize}-${segment.fontFamily}-${this.config.width}`;
    
    if (this.cachedMetrics.has(cacheKey)) {
      return this.cachedMetrics.get(cacheKey)!;
    }
    
    if (!this.ctx) {
      return { lines: [], lineHeight: 0, totalHeight: 0, fontSize: segment.fontSize };
    }
    
    const fontSize = segment.fontSize;
    const lineHeight = fontSize * segment.lineHeight;
    const maxWidth = this.config.width - 100; // Padding
    
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
    
    const totalHeight = lines.length * lineHeight + this.config.height; // Add viewport height for scroll buffer
    
    const metrics: TextMetrics = {
      lines,
      lineHeight,
      totalHeight,
      fontSize,
    };
    
    this.cachedMetrics.set(cacheKey, metrics);
    return metrics;
  }
  
  render(segment: Segment, scrollOffset: number, mirror: boolean = false): void {
    if (!this.ctx || !this.canvas) return;
    
    const { width, height } = this.config;
    const metrics = this.measureText(segment);
    
    // Clear canvas
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, width, height);
    
    // Apply mirror transform if needed
    this.ctx.save();
    if (mirror) {
      this.ctx.translate(width, 0);
      this.ctx.scale(-1, 1);
    }
    
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
    
    // Calculate visible range (virtual scrolling)
    const startLine = Math.max(0, Math.floor((scrollOffset - height) / metrics.lineHeight));
    const endLine = Math.min(metrics.lines.length, Math.ceil((scrollOffset + height * 2) / metrics.lineHeight));
    
    // Render only visible lines
    const centerX = width / 2;
    const startY = height * (this.config.guidePosition / 100); // Start from guide position
    
    for (let i = startLine; i < endLine; i++) {
      const y = startY + (i * metrics.lineHeight) - scrollOffset;
      
      // Only render if within viewport
      if (y > -metrics.lineHeight && y < height + metrics.lineHeight) {
        this.ctx.fillText(metrics.lines[i], centerX, y);
      }
    }
    
    this.ctx.restore();
    
    // Draw guide line
    if (this.config.showGuide) {
      this.drawGuide();
    }
    
    // Track FPS
    this.updateFps();
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
  }
  
  destroy(): void {
    this.cachedMetrics.clear();
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
