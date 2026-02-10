import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DuplicateProjectButtonProps {
  projectId: string;
  projectName?: string;
  className?: string;
}

/** Clean duplicate project button */
export const DuplicateProjectButton = memo<DuplicateProjectButtonProps>(
  ({ projectId, projectName, className }) => {
    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      toast.info(`Duplicate "${projectName || 'project'}" (mock)`);
    };

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8 hover:bg-blue-50 hover:text-blue-600 transition-colors', className)}
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
