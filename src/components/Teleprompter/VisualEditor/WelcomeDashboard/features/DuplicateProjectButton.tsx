import React, { memo } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DuplicateProjectButtonProps {
  projectId: string;
  projectName?: string;
  className?: string;
  onClick?: () => void;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
}

/** Clean duplicate project button */
export const DuplicateProjectButton = memo<DuplicateProjectButtonProps>(
  ({ projectId, projectName, className, onClick, variant = "ghost", size = "icon" }) => {
    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onClick) onClick();
    };

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className={cn('hover:bg-blue-50 hover:text-blue-600 transition-colors', className)}
            onClick={handleClick}
          >
            <Copy size={14} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Duplicate project</TooltipContent>
      </Tooltip>
    );
  }
);

DuplicateProjectButton.displayName = 'DuplicateProjectButton';
