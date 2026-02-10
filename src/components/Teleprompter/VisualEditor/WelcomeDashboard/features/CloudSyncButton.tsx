import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Cloud, CloudOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CloudSyncButtonProps {
  className?: string;
}

/** Enhanced cloud sync button with status indication */
export const CloudSyncButton = memo<CloudSyncButtonProps>(({ className }) => {
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [isConnected, setIsConnected] = React.useState(false);

  const handleClick = () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    toast.success('Syncing projects to cloud...');
    
    // Simulate sync process
    setTimeout(() => {
      setIsSyncing(false);
      setIsConnected(!isConnected);
      toast.success(isConnected ? 'Disconnected from cloud' : 'Connected to cloud successfully');
    }, 2000);
  };

  const Icon = isConnected ? Cloud : CloudOff;
  const statusColor = isConnected ? 'text-green-500' : 'text-muted-foreground';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn('h-10 w-10 hover:bg-muted/50 transition-colors relative', className)} 
          onClick={handleClick}
          disabled={isSyncing}
        >
          <Icon size={18} className={cn(statusColor, isSyncing && 'animate-spin')} />
          {isConnected && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isSyncing ? 'Syncing...' : isConnected ? 'Disconnect from cloud' : 'Connect to cloud'}
      </TooltipContent>
    </Tooltip>
  );
});

CloudSyncButton.displayName = 'CloudSyncButton';
