import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Pause, 
  Square, 
  SkipBack, 
  SkipForward,
  Plus,
  Minus,
  FlipHorizontal,
} from 'lucide-react';
import { RemoteCommand, PlaybackStatus } from './types';
import { cn } from '@/lib/utils';

interface RemoteControlPanelProps {
  status: PlaybackStatus | null;
  onCommand: (command: RemoteCommand) => void;
  isConnected: boolean;
  className?: string;
}

export const RemoteControlPanel = memo<RemoteControlPanelProps>(({
  status,
  onCommand,
  isConnected,
  className,
}) => {
  const isPlaying = status?.isPlaying && !status?.isPaused;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Status display */}
      <div className="text-center py-3 px-4 bg-muted rounded-lg">
        <p className="text-sm font-medium truncate">
          {status?.projectName ?? 'No project'}
        </p>
        <p className="text-xs text-muted-foreground">
          Segment {(status?.currentSegmentIndex ?? 0) + 1} of {status?.totalSegments ?? 0}
        </p>
        <p className="text-xs text-muted-foreground">
          Speed: {status?.speed ?? 100}%
        </p>
      </div>

      {/* Main playback controls */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onCommand('previous')}
          disabled={!isConnected}
          className="h-12 w-12"
        >
          <SkipBack size={20} />
        </Button>

        <Button
          variant="default"
          size="icon"
          onClick={() => onCommand(isPlaying ? 'pause' : 'play')}
          disabled={!isConnected}
          className="h-16 w-16"
        >
          {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={() => onCommand('next')}
          disabled={!isConnected}
          className="h-12 w-12"
        >
          <SkipForward size={20} />
        </Button>
      </div>

      {/* Stop button */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={() => onCommand('stop')}
          disabled={!isConnected || !status?.isPlaying}
          className="gap-2"
        >
          <Square size={16} />
          Stop
        </Button>
      </div>

      {/* Speed controls */}
      <div className="flex items-center justify-center gap-2 pt-2 border-t">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onCommand('speed-down')}
          disabled={!isConnected}
        >
          <Minus size={18} />
        </Button>
        
        <span className="text-sm font-medium w-16 text-center tabular-nums">
          {status?.speed ?? 100}%
        </span>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onCommand('speed-up')}
          disabled={!isConnected}
        >
          <Plus size={18} />
        </Button>
      </div>

      {/* Mirror toggle */}
      <div className="flex justify-center pt-2 border-t">
        <Button
          variant="ghost"
          onClick={() => onCommand('toggle-mirror')}
          disabled={!isConnected}
          className="gap-2"
        >
          <FlipHorizontal size={16} />
          Toggle Mirror
        </Button>
      </div>
    </div>
  );
});

RemoteControlPanel.displayName = 'RemoteControlPanel';
