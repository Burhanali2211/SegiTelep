import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Smartphone,
  QrCode,
  WifiOff,
  Copy,
  RefreshCw,
  CheckCircle,
  XCircle,
  ExternalLink,
  Zap,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { RemoteServerState } from '@/types/remote.types';
import { invoke } from '@tauri-apps/api/core';
import { useTeleprompterStore } from '@/store/teleprompterStore';
import { listen } from '@tauri-apps/api/event';

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

  const remoteEnabled = useTeleprompterStore((s) => s.settings.remoteEnabled);
  const setRemoteEnabled = useTeleprompterStore((s) => s.setRemoteEnabled);

  // Robust check for Tauri v2 environment
  const isTauri = typeof window !== 'undefined' && (
    (window as any).__TAURI_INTERNALS__ !== undefined ||
    (window as any).__TAURI__ !== undefined ||
    navigator.userAgent.includes('Tauri')
  );

  const startRemoteServer = useCallback(async () => {
    if (!isTauri) {
      toast.error('Local Remote requires the Tauri desktop app');
      setConnectionStatus('error');
      return;
    }

    setIsStarting(true);
    setConnectionStatus('starting');

    try {
      const state = await invoke<RemoteServerState>('start_remote_server');
      setServerState(state);
      setConnectionStatus('connected');

      // Generate QR code
      const qrSvg = await invoke<string>('generate_remote_qr', {
        connectionUrl: state.connection_url
      });
      setQrCodeSvg(qrSvg);

      // Automatically enable the global setting if user manually starts from dialog
      setRemoteEnabled(true);

      toast.success('Remote control server started successfully!');
    } catch (error) {
      console.error('Failed to start remote server:', error);
      setConnectionStatus('error');
      toast.error('Failed to start remote control server');
    } finally {
      setIsStarting(false);
    }
  }, [isTauri, setRemoteEnabled]);

  const copyToClipboard = useCallback(async () => {
    if (!serverState) return;
    try {
      await navigator.clipboard.writeText(serverState.connection_url);
      toast.success('Connection URL copied!');
    } catch (error) {
      toast.error('Failed to copy');
    }
  }, [serverState]);

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'starting': return <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />;
      default: return <WifiOff className="w-5 h-5 text-zinc-500" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col gap-0 p-0 rounded-[2rem] border-white/5 bg-slate-950/90 backdrop-blur-3xl shadow-[0_0_100px_rgba(0,0,0,0.5)]">
        <DialogHeader className="p-8 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-inner">
              <Smartphone size={24} className="drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black tracking-tight text-white">Device Pairing</DialogTitle>
              <DialogDescription className="text-slate-400 font-medium">Connect your mobile as a tactile controller</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!remoteEnabled ? (
            <div className="bg-slate-900/50 border border-amber-500/20 p-10 text-center space-y-6 rounded-[2rem] relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-amber-500/10 blur-[80px] rounded-full" />
              <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/20 rounded-3xl flex items-center justify-center text-amber-500 mx-auto relative z-10">
                <Smartphone size={40} strokeWidth={1} />
              </div>
              <div className="space-y-2 relative z-10">
                <h3 className="text-2xl font-black tracking-tight text-white">Remote Services Offline</h3>
                <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
                  For maximum performance and local privacy, remote background services are currently powered down.
                </p>
              </div>
              <Button
                onClick={() => setRemoteEnabled(true)}
                className="bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-[0.15em] px-10 rounded-full h-14 shadow-[0_10px_30px_rgba(245,158,11,0.3)] transition-all hover:scale-105 active:scale-95 relative z-10"
              >
                Activate Services
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                  <h3 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Tactile Link Status</h3>
                </div>
                {connectionStatus === 'connected' && (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black uppercase tracking-widest px-3 py-1">
                    <CheckCircle className="w-3 h-3 mr-1.5" /> Live
                  </Badge>
                )}
              </div>

              {!serverState ? (
                <Button
                  onClick={startRemoteServer}
                  disabled={isStarting || !isTauri}
                  className="w-full h-20 rounded-[2rem] bg-white/[0.03] hover:bg-white/[0.08] text-white border border-white/10 font-black uppercase tracking-[0.2em] gap-4 shadow-2xl transition-all active:scale-[0.98] group"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                    {isStarting ? <RefreshCw className="animate-spin" /> : <QrCode size={20} />}
                  </div>
                  Establish Local Connection
                </Button>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="p-6 bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-4 border-white/5 flex justify-center items-center aspect-square relative group">
                    <div className="absolute inset-0 bg-blue-500/5 blur-2xl group-hover:bg-blue-500/10 transition-colors" />
                    {qrCodeSvg ? (
                      <div className="w-full h-full relative z-10" dangerouslySetInnerHTML={{ __html: qrCodeSvg }} />
                    ) : (
                      <RefreshCw className="animate-spin text-slate-400" />
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-1">Network Identity</p>
                      <div className="flex items-center gap-3 p-4 bg-white/[0.03] border border-white/5 rounded-2xl group transition-all hover:bg-white/[0.05]">
                        <span className="text-xs font-mono font-bold text-blue-400/80 truncate flex-1">{serverState.connection_url}</span>
                        <Button variant="ghost" size="icon" onClick={copyToClipboard} className="h-10 w-10 rounded-full hover:bg-blue-500/20 hover:text-blue-400">
                          <Copy size={16} />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <Button variant="outline" className="rounded-2xl h-14 text-[11px] font-black uppercase tracking-[0.2em] border-white/10 hover:bg-white/5 text-slate-300 gap-3" onClick={() => window.open(serverState.connection_url, '_blank')}>
                        <ExternalLink size={16} /> Open Desktop Console
                      </Button>
                      <Button variant="ghost" className="rounded-2xl h-14 text-[11px] font-black uppercase tracking-[0.2em] text-red-500/70 hover:text-red-400 hover:bg-red-500/10 gap-3" onClick={() => setServerState(null)}>
                        <WifiOff size={16} /> Disconnect Link
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-8 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full text-[11px] font-black uppercase tracking-[0.2em] px-8 text-slate-400 hover:text-white">Close Window</Button>
          {remoteEnabled && (
            <div className="flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase tracking-[0.25em] bg-emerald-500/5 px-4 py-2 rounded-full border border-emerald-500/10">
              <CheckCircle size={14} /> Secure Local Sync
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
