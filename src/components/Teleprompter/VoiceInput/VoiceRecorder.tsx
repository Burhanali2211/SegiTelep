import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceRecorderProps {
  isListening: boolean;
  isSupported: boolean;
  onToggle: () => void;
  className?: string;
}

export const VoiceRecorder = memo<VoiceRecorderProps>(({
  isListening,
  isSupported,
  onToggle,
  className,
}) => {
  if (!isSupported) {
    return (
      <div className={cn('flex flex-col items-center gap-2', className)}>
        <div className="p-4 rounded-full bg-destructive/10">
          <MicOff size={32} className="text-destructive" />
        </div>
        <p className="text-sm text-destructive">
          Speech recognition not supported
        </p>
        <p className="text-xs text-muted-foreground text-center">
          Please use Chrome, Edge, or Safari for voice input
        </p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <Button
        variant={isListening ? 'default' : 'outline'}
        size="lg"
        onClick={onToggle}
        className={cn(
          'h-20 w-20 rounded-full',
          isListening && 'animate-pulse bg-destructive hover:bg-destructive/90'
        )}
      >
        {isListening ? (
          <Mic size={32} className="text-destructive-foreground" />
        ) : (
          <Mic size={32} />
        )}
      </Button>
      
      <p className="text-sm font-medium">
        {isListening ? 'Listening... Click to stop' : 'Click to start recording'}
      </p>
      
      {isListening && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 size={12} className="animate-spin" />
          Recording in progress
        </div>
      )}
    </div>
  );
});

VoiceRecorder.displayName = 'VoiceRecorder';
