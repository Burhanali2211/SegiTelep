import React, { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { DEFAULT_VOICE_COMMANDS, VoiceCommandConfig } from './types';
import { cn } from '@/lib/utils';

interface VoiceCommandsProps {
  className?: string;
}

export const VoiceCommands = memo<VoiceCommandsProps>(({ className }) => {
  return (
    <div className={cn('space-y-3', className)}>
      <p className="text-sm font-medium">Voice Commands</p>
      <p className="text-xs text-muted-foreground">
        Say any of these words to control playback:
      </p>
      
      <div className="space-y-2">
        {DEFAULT_VOICE_COMMANDS.map((config) => (
          <div 
            key={config.command} 
            className="flex items-start gap-3 py-2 px-3 rounded-lg bg-muted/50"
          >
            <span className="text-sm font-medium w-20 shrink-0">
              {config.description}
            </span>
            <div className="flex flex-wrap gap-1">
              {config.triggers.map((trigger, index) => (
                <Badge 
                  key={`${config.command}-${trigger}-${index}`} 
                  variant="secondary"
                  className="text-xs"
                >
                  "{trigger}"
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

VoiceCommands.displayName = 'VoiceCommands';
