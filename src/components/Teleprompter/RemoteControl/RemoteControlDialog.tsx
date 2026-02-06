import React, { memo, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Radio, Smartphone, Monitor } from 'lucide-react';
import { useRemoteControl } from './useRemoteControl';
import { QRCodeDisplay } from './QRCodeDisplay';
import { RemoteControlPanel } from './RemoteControlPanel';
import { ConnectionStatus } from './ConnectionStatus';

interface RemoteControlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RemoteControlDialog = memo<RemoteControlDialogProps>(({
  open,
  onOpenChange,
}) => {
  // Controller mode - we're sending commands
  const { isConnected, lastPing, status, sendCommand } = useRemoteControl({ 
    isController: true 
  });

  // Generate remote control URL
  const remoteUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/remote`;
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio size={20} className="text-primary" />
            Remote Control
          </DialogTitle>
          <DialogDescription>
            Control your teleprompter from another device or browser tab
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="qr" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="qr" className="gap-2">
              <Smartphone size={14} />
              Mobile
            </TabsTrigger>
            <TabsTrigger value="panel" className="gap-2">
              <Monitor size={14} />
              Control Panel
            </TabsTrigger>
          </TabsList>

          <TabsContent value="qr" className="mt-4">
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-muted-foreground text-center">
                Scan this QR code with your phone or open the URL in another browser tab
              </p>
              
              <QRCodeDisplay url={remoteUrl} size={180} />
              
              <div className="text-xs text-muted-foreground text-center space-y-1">
                <p>Both devices must be on the same network</p>
                <p>Or open in another tab on this device</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="panel" className="mt-4">
            <div className="space-y-4">
              <ConnectionStatus isConnected={isConnected} lastPing={lastPing} />
              
              <RemoteControlPanel
                status={status}
                onCommand={sendCommand}
                isConnected={isConnected}
              />
              
              {!isConnected && (
                <p className="text-xs text-muted-foreground text-center">
                  Open the teleprompter in fullscreen mode to enable remote control
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
});

RemoteControlDialog.displayName = 'RemoteControlDialog';
