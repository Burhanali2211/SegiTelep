import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Volume2, VolumeX } from 'lucide-react';

interface AudioPreviewProps {
  volume: number;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
}

export const AudioPreview = memo<AudioPreviewProps>(({
  volume,
  onVolumeChange,
  onToggleMute,
}) => {
  return (
    <div className="flex items-center gap-4 pt-4 border-t border-border">
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleMute}
        className="shrink-0"
      >
        {volume > 0 ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </Button>
      
      <Slider
        value={[volume]}
        onValueChange={([v]) => onVolumeChange(v)}
        min={0}
        max={100}
        className="flex-1"
      />
      
      <span className="text-sm text-muted-foreground w-12 text-right tabular-nums">
        {volume}%
      </span>
    </div>
  );
});

AudioPreview.displayName = 'AudioPreview';
