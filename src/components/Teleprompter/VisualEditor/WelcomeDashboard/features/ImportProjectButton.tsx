import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FileDown } from 'lucide-react';
import { toast } from 'sonner';

interface ImportProjectButtonProps {
  className?: string;
}

/** Mock: Import project from file */
export const ImportProjectButton = memo<ImportProjectButtonProps>(({ className }) => {
  const handleClick = () => {
    toast.info('Import project (mock)');
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" size="sm" className={className} onClick={handleClick}>
          <FileDown size={14} className="mr-1.5" />
          Import
        </Button>
      </TooltipTrigger>
      <TooltipContent>Import project from file</TooltipContent>
    </Tooltip>
  );
});

ImportProjectButton.displayName = 'ImportProjectButton';
