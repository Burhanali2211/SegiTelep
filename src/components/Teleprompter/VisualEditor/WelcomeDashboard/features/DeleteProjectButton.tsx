import React, { memo } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DeleteProjectButtonProps {
  projectId: string;
  projectName?: string;
  className?: string;
  onClick?: () => void;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
}

/** Clean delete project button */
export const DeleteProjectButton = memo<DeleteProjectButtonProps>(
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
            className={cn('hover:bg-red-50 hover:text-red-600 transition-colors', className)}
            onClick={handleClick}
          >
            <Trash2 size={14} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Delete project</TooltipContent>
      </Tooltip>
    );
  }
);

DeleteProjectButton.displayName = 'DeleteProjectButton';
