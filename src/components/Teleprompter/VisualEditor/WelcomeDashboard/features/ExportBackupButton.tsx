import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Archive } from 'lucide-react';
import { toast } from 'sonner';

interface ExportBackupButtonProps {
  className?: string;
}

/** Mock: Export / backup all projects */
export const ExportBackupButton = memo<ExportBackupButtonProps>(({ className }) => {
  const handleClick = () => {
    toast.info('Export backup (mock)');
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="sm" className={className} onClick={handleClick}>
          <Archive size={14} className="mr-1.5" />
          Backup
        </Button>
      </TooltipTrigger>
      <TooltipContent>Export backup of all projects</TooltipContent>
    </Tooltip>
  );
});

ExportBackupButton.displayName = 'ExportBackupButton';
