import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Keyboard } from 'lucide-react';

interface KeyboardShortcutsButtonProps {
  onClick?: () => void;
  className?: string;
}

/** Mock: Open keyboard shortcuts overlay */
export const KeyboardShortcutsButton = memo<KeyboardShortcutsButtonProps>(
  ({ onClick, className }) => {
    const handleClick = () => {
      onClick?.();
    };

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className={className} onClick={handleClick}>
            <Keyboard size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Keyboard shortcuts (?)</TooltipContent>
      </Tooltip>
    );
  }
);

KeyboardShortcutsButton.displayName = 'KeyboardShortcutsButton';
