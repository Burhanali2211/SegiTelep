import React, { memo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Copy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TranscriptionDisplayProps {
  transcript: string;
  interimTranscript: string;
  onClear: () => void;
  onCopy?: () => void;
  className?: string;
}

export const TranscriptionDisplay = memo<TranscriptionDisplayProps>(({
  transcript,
  interimTranscript,
  onClear,
  onCopy,
  className,
}) => {
  const handleCopy = () => {
    if (transcript) {
      navigator.clipboard.writeText(transcript);
      toast.success('Copied to clipboard');
    }
    onCopy?.();
  };

  const hasContent = transcript || interimTranscript;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Transcription</p>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            disabled={!transcript}
            className="h-7 w-7"
          >
            <Copy size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClear}
            disabled={!hasContent}
            className="h-7 w-7"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
      
      <ScrollArea className="h-40 rounded-lg border bg-muted/50 p-3">
        {hasContent ? (
          <p className="text-sm leading-relaxed">
            {transcript}
            {interimTranscript && (
              <span className="text-muted-foreground italic">
                {interimTranscript}
              </span>
            )}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            Start recording to see transcription here
          </p>
        )}
      </ScrollArea>
    </div>
  );
});

TranscriptionDisplay.displayName = 'TranscriptionDisplay';
