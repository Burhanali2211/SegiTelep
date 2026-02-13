import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DeleteProjectButtonProps {
  projectId: string;
  projectName?: string;
  className?: string;
  onClick?: () => void;
}

/** Clean delete project button */
export const DeleteProjectButton = memo<DeleteProjectButtonProps>(
  ({ projectId, projectName, className, onClick }) => {
    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onClick) onClick();
    };

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8 hover:bg-red-50 hover:text-red-600 transition-colors', className)}
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
