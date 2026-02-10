import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Smartphone, 
  QrCode, 
  Wifi, 
  WifiOff, 
  Copy, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  Settings,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { RemoteServerState } from '@/types/remote.types';

interface RemoteControlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RemoteControlDialog: React.FC<RemoteControlDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const [serverState, setServerState] = useState<RemoteServerState | null>(null);
  const [qrCodeSvg, setQrCodeSvg] = useState<string>('');
  const [isStarting, setIsStarting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'starting' | 'connected' | 'error'>('idle');
  const [connectedDevices, setConnectedDevices] = useState<string[]>([]);
  
  // Check if running in Tauri (not just browser dev mode)
  const isTauri = typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.invoke;

  const startRemoteServer = useCallback(async () => {
    if (!isTauri) {
      toast.error('Remote control requires the Tauri desktop app');
      setConnectionStatus('error');
      return;
    }

    setIsStarting(true);
    setConnectionStatus('starting');

    try {
      const state = await window.__TAURI__.invoke('start_remote_server');
      setServerState(state);
      setConnectionStatus('connected');
      
      // Generate QR code
      const qrSvg = await window.__TAURI__.invoke('generate_remote_qr', { 
        connectionUrl: state.connection_url 
      });
      setQrCodeSvg(qrSvg);
      
      toast.success('Remote control server started successfully!');
      console.log('Remote server started:', state);
      
    } catch (error) {
      console.error('Failed to start remote server:', error);
      setConnectionStatus('error');
      toast.error('Failed to start remote control server');
    } finally {
      setIsStarting(false);
    }
  }, [isTauri]);

  const copyToClipboard = useCallback(async () => {
    if (!serverState) return;

    try {
      await navigator.clipboard.writeText(serverState.connection_url);
      toast.success('Connection URL copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error('Failed to copy to clipboard');
    }
  }, [serverState]);

  const openMobileInterface = useCallback(() => {
    if (!serverState) return;
    
    window.open(serverState.connection_url, '_blank');
  }, [serverState]);

  // Listen for remote control events
  useEffect(() => {
    if (!open || !isTauri) return;

    const handleRemoteCommand = (event: any) => {
      console.log('Remote command received:', event.event);
      
      // Handle different remote commands
      switch (event.event) {
        case 'remote-play':
          // Trigger play action
          break;
        case 'remote-pause':
          // Trigger pause action
          break;
        case 'remote-stop':
          // Trigger stop action
          break;
        case 'remote-next-segment':
          // Trigger next segment
          break;
        case 'remote-prev-segment':
          // Trigger previous segment
          break;
        case 'remote-set-speed':
          // Update speed
          break;
        case 'remote-toggle-mirror':
          // Toggle mirror mode
          break;
        case 'remote-reset-position':
          // Reset position
          break;
      }
    };

    const unlistenPromise = window.__TAURI__.listen('remote-command', handleRemoteCommand);
    
    return () => {
      unlistenPromise.then(fn => fn()).catch(console.error);
    };
  }, [open, isTauri]);

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'starting':
        return <RefreshCw className="w-5 h-5 text-yellow-500 animate-spin" />;
      default:
        return <WifiOff className="w-5 h-5 text-gray-500" />;
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Server Running';
      case 'error':
        return 'Server Error';
      case 'starting':
        return 'Starting Server...';
      default:
        return 'Server Stopped';
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'starting':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Mobile Remote Control
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tauri Check Warning */}
          {!isTauri && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <WifiOff className="w-5 h-5 text-yellow-600" />
                  <div>
                    <h3 className="font-medium text-yellow-800">Tauri App Required</h3>
                    <p className="text-sm text-yellow-700">
                      Mobile remote control requires the desktop Tauri app. This feature is not available in browser mode.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Connection Status */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getConnectionStatusIcon()}
                  <div>
                    <h3 className="font-medium">{getConnectionStatusText()}</h3>
                    <p className="text-sm text-muted-foreground">
                      {serverState ? `Port: ${serverState.port}` : 'Not started'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {connectionStatus === 'idle' && (
                    <Button 
                      onClick={startRemoteServer}
                      disabled={isStarting}
                      className="min-w-[120px]"
                    >
                      {isStarting ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Starting...
                        </>
                      ) : (
                        <>
                          <Wifi className="w-4 h-4 mr-2" />
                          Start Server
                        </>
                      )}
                    </Button>
                  )}
                  
                  {serverState && (
                    <>
                      <Button variant="outline" size="sm" onClick={copyToClipboard}>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy URL
                      </Button>
                      <Button variant="outline" size="sm" onClick={openMobileInterface}>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {serverState && (
            <>
              {/* QR Code */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="w-5 h-5" />
                    Connect Mobile Device
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="bg-white p-4 rounded-lg" dangerouslySetInnerHTML={{ __html: qrCodeSvg }} />
                    
                    <div className="text-center space-y-2">
                      <p className="text-sm font-medium">Scan QR code with your phone</p>
                      <p className="text-xs text-muted-foreground">
                        Or visit: <code className="bg-muted px-2 py-1 rounded">{serverState.connection_url}</code>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Features */}
              <Card>
                <CardHeader>
                  <CardTitle>Remote Control Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl mb-2">▶️</div>
                      <div className="text-sm font-medium">Play/Pause</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl mb-2">⏹️</div>
                      <div className="text-sm font-medium">Stop</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl mb-2">⚡</div>
                      <div className="text-sm font-medium">Speed</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl mb-2">📄</div>
                      <div className="text-sm font-medium">Navigate</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Instructions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    How to Use
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium mt-0.5">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Start the remote server</p>
                      <p className="text-sm text-muted-foreground">
                        Click "Start Server" to begin the remote control service
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium mt-0.5">
                      2
                    </div>
                    <div>
                      <p className="font-medium">Connect your phone</p>
                      <p className="text-sm text-muted-foreground">
                        Scan the QR code or visit the URL on your mobile device
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium mt-0.5">
                      3
                    </div>
                    <div>
                      <p className="font-medium">Control remotely</p>
                      <p className="text-sm text-muted-foreground">
                        Use your phone to control playback, speed, and navigation
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Technical Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Technical Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Server Type:</span>
                    <span>HTTP + WebSocket</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">HTTP Port:</span>
                    <span>{serverState.port}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">WebSocket Port:</span>
                    <span>{serverState.port + 1}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Network:</span>
                    <span>Local WiFi/LAN</span>
                  </div>
                  <Separator />
                  <div className="text-xs text-muted-foreground">
                    <p><strong>Note:</strong> Both devices must be on the same network for remote control to work.</p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
