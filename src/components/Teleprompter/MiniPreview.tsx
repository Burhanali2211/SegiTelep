import React, { memo } from 'react';
import { useTeleprompterStore } from '@/store/teleprompterStore';
import { isVisualSegment } from '@/types/teleprompter.types';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronUp,
  ChevronDown,
  Maximize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MiniPreviewProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onExpand?: () => void;
  className?: string;
}

export const MiniPreview = memo<MiniPreviewProps>(({
  collapsed = false,
  onToggleCollapse,
  onExpand,
  className,
}) => {
  const project = useTeleprompterStore((s) => s.project);
  const playback = useTeleprompterStore((s) => s.playback);
  const play = useTeleprompterStore((s) => s.play);
  const pause = useTeleprompterStore((s) => s.pause);
  const nextSegment = useTeleprompterStore((s) => s.nextSegment);
  const prevSegment = useTeleprompterStore((s) => s.prevSegment);

  const { isPlaying, isPaused, currentSegmentIndex, progress, speed } = playback;
  const currentSegment = project?.segments[currentSegmentIndex];
  const isVisual = currentSegment && isVisualSegment(currentSegment);

  if (!project || !currentSegment) {
    return null;
  }

  if (collapsed) {
    return (
      <div className={cn('flex items-center justify-between px-4 py-2 border-t border-border bg-card', className)}>
        <Button variant="ghost" size="sm" className="h-7" onClick={onToggleCollapse}>
          <ChevronUp size={14} className="mr-1" />
          Preview
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevSegment}>
            <SkipBack size={14} />
          </Button>
          <Button
            variant={isPlaying && !isPaused ? 'default' : 'secondary'}
            size="icon"
            className="h-7 w-7"
            onClick={isPlaying && !isPaused ? pause : play}
          >
            {isPlaying && !isPaused ? <Pause size={14} /> : <Play size={14} />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextSegment}>
            <SkipForward size={14} />
          </Button>
        </div>
        <span className="text-xs text-muted-foreground">
          {currentSegmentIndex + 1}/{project.segments.length}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('border-t border-border bg-card', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-7" onClick={onToggleCollapse}>
            <ChevronDown size={14} className="mr-1" />
            Preview
          </Button>
          <span className="text-sm font-medium truncate max-w-[200px]">
            {currentSegment.name}
          </span>
          {isVisual && (
            <span className="text-xs text-muted-foreground">{currentSegment.duration}s</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Segment {currentSegmentIndex + 1} of {project.segments.length}
          </span>
          {onExpand && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onExpand}>
              <Maximize2 size={14} />
            </Button>
          )}
        </div>
      </div>

      {/* Content preview */}
      <div className="flex items-center gap-4 px-4 py-3">
        {/* Thumbnail or text preview */}
        <div className="w-24 h-16 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
          {isVisual && currentSegment.content.startsWith('data:') ? (
            <img
              src={currentSegment.content}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <p className="text-xs text-muted-foreground p-2 line-clamp-3">
              {currentSegment.content.slice(0, 100)}...
            </p>
          )}
        </div>

        {/* Progress and controls */}
        <div className="flex-1 min-w-0">
          <Progress value={progress * 100} className="h-1 mb-2" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevSegment}>
                <SkipBack size={16} />
              </Button>
              <Button
                variant={isPlaying && !isPaused ? 'default' : 'secondary'}
                size="icon"
                className="h-8 w-8"
                onClick={isPlaying && !isPaused ? pause : play}
              >
                {isPlaying && !isPaused ? <Pause size={16} /> : <Play size={16} />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextSegment}>
                <SkipForward size={16} />
              </Button>
            </div>
            <span className="text-xs text-muted-foreground">
              {isVisual ? `${currentSegment.duration}s` : `${speed}px/s`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

MiniPreview.displayName = 'MiniPreview';

export default MiniPreview;
