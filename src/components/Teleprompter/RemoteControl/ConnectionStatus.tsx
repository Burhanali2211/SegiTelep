import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { Wifi, WifiOff } from 'lucide-react';

interface ConnectionStatusProps {
  isConnected: boolean;
  lastPing?: number | null;
  className?: string;
}

export const ConnectionStatus = memo<ConnectionStatusProps>(({
  isConnected,
  lastPing,
  className,
}) => {
  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
      isConnected ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive',
      className
    )}>
      {isConnected ? (
        <>
          <Wifi size={16} />
          <span>Connected</span>
          {lastPing !== null && lastPing !== undefined && (
            <span className="text-xs opacity-70">({lastPing}ms)</span>
          )}
        </>
      ) : (
        <>
          <WifiOff size={16} />
          <span>Waiting for connection...</span>
        </>
      )}
    </div>
  );
});

ConnectionStatus.displayName = 'ConnectionStatus';
