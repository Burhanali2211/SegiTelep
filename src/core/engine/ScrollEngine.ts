// High-performance scroll engine using requestAnimationFrame

export type ScrollCallback = (offset: number, progress: number) => void;
export type SegmentCompleteCallback = () => void;

export class ScrollEngine {
  private currentOffset: number = 0;
  private targetOffset: number = 0;
  private speed: number = 100; // pixels per second
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private rafId: number | null = null;
  private lastFrameTime: number = 0;
  
  private onScroll: ScrollCallback | null = null;
  private onSegmentComplete: SegmentCompleteCallback | null = null;
  
  constructor() {
    this.animate = this.animate.bind(this);
  }
  
  setCallbacks(
    onScroll: ScrollCallback,
    onSegmentComplete: SegmentCompleteCallback
  ): void {
    this.onScroll = onScroll;
    this.onSegmentComplete = onSegmentComplete;
  }
  
  setTarget(targetOffset: number): void {
    this.targetOffset = targetOffset;
  }
  
  setSpeed(speed: number): void {
    this.speed = Math.max(20, Math.min(500, speed));
  }
  
  getSpeed(): number {
    return this.speed;
  }
  
  getCurrentOffset(): number {
    return this.currentOffset;
  }
  
  setCurrentOffset(offset: number): void {
    this.currentOffset = offset;
  }
  
  getProgress(): number {
    if (this.targetOffset <= 0) return 0;
    return Math.min(1, this.currentOffset / this.targetOffset);
  }
  
  play(): void {
    if (this.isPlaying && !this.isPaused) return;
    
    this.isPlaying = true;
    this.isPaused = false;
    this.lastFrameTime = performance.now();
    this.rafId = requestAnimationFrame(this.animate);
  }
  
  pause(): void {
    this.isPaused = true;
  }
  
  resume(): void {
    if (!this.isPlaying) return;
    
    this.isPaused = false;
    this.lastFrameTime = performance.now();
    if (!this.rafId) {
      this.rafId = requestAnimationFrame(this.animate);
    }
  }
  
  stop(): void {
    this.isPlaying = false;
    this.isPaused = false;
    this.currentOffset = 0;
    
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
  
  seekTo(offset: number): void {
    this.currentOffset = Math.max(0, Math.min(offset, this.targetOffset));
    this.notifyScroll();
  }
  
  seekToProgress(progress: number): void {
    const clampedProgress = Math.max(0, Math.min(1, progress));
    this.currentOffset = this.targetOffset * clampedProgress;
    this.notifyScroll();
  }
  
  adjustSpeed(delta: number): void {
    this.setSpeed(this.speed + delta);
  }
  
  reset(): void {
    this.currentOffset = 0;
    this.targetOffset = 0;
    this.stop();
  }
  
  private animate(): void {
    if (!this.isPlaying) {
      this.rafId = null;
      return;
    }
    
    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;
    
    if (!this.isPaused) {
      // Calculate distance based on speed and delta time
      const distance = this.speed * (deltaTime / 1000);
      this.currentOffset += distance;
      
      // Check if segment complete
      if (this.currentOffset >= this.targetOffset) {
        this.currentOffset = this.targetOffset;
        this.notifyScroll();
        this.onSegmentComplete?.();
        return;
      }
      
      this.notifyScroll();
    }
    
    this.rafId = requestAnimationFrame(this.animate);
  }
  
  private notifyScroll(): void {
    const progress = this.getProgress();
    this.onScroll?.(this.currentOffset, progress);
  }
  
  destroy(): void {
    this.stop();
    this.onScroll = null;
    this.onSegmentComplete = null;
  }
}

// Singleton instance for global access
let scrollEngineInstance: ScrollEngine | null = null;

export function getScrollEngine(): ScrollEngine {
  if (!scrollEngineInstance) {
    scrollEngineInstance = new ScrollEngine();
  }
  return scrollEngineInstance;
}

export function destroyScrollEngine(): void {
  if (scrollEngineInstance) {
    scrollEngineInstance.destroy();
    scrollEngineInstance = null;
  }
}
