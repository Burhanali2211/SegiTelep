import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AssetManager } from '@/core/storage/AssetManager';
import { cn } from '@/lib/utils';

export const ExternalPlayer: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [state, setState] = useState<any>(null);
    const [isConnected, setIsConnected] = useState(false);
    const imageCacheRef = useRef<Record<string, HTMLImageElement>>({});

    useEffect(() => {
        const channel = new BroadcastChannel('teleprompter-external-display');

        const handleMessage = (event: MessageEvent) => {
            const { type, payload } = event.data;

            if (type === 'state-update') {
                setState(payload);
                setIsConnected(true);
            }
        };

        channel.onmessage = handleMessage;

        // Signal ready
        channel.postMessage({ type: 'external-display-ready' });

        return () => channel.close();
    }, []);

    const drawSegment = useCallback((img: HTMLImageElement, region: any) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Sharpness
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
        }

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const regionX = (region.x / 100) * img.width;
        const regionY = (region.y / 100) * img.height;
        const regionW = (region.width / 100) * img.width;
        const regionH = (region.height / 100) * img.height;

        const scale = Math.min(canvas.width / regionW, canvas.height / regionH);
        const drawW = regionW * scale;
        const drawH = regionH * scale;
        const drawX = (canvas.width - drawW) / 2;
        const drawY = (canvas.height - drawH) / 2;

        ctx.drawImage(
            img,
            regionX, regionY, regionW, regionH,
            drawX, drawY, drawW, drawH
        );
    }, []);

    useEffect(() => {
        if (!state?.visualState) return;

        const { visualState, settings } = state;
        const currentTime = visualState.playbackTime || 0;

        // Find active segment
        const allSegments = visualState.pages.flatMap((p: any) =>
            p.segments.filter((s: any) => !s.isHidden).map((s: any) => ({
                ...s,
                pageId: p.id,
                pageData: p.data,
                assetId: p.assetId
            }))
        ).sort((a: any, b: any) => a.startTime - b.startTime);

        const activeSegment = allSegments.find((s: any) =>
            currentTime >= s.startTime && currentTime < s.endTime
        ) || allSegments[0];

        if (!activeSegment) return;

        const resolveAndDraw = async () => {
            let src = activeSegment.pageData;

            // Resolve asset if only ID is provided
            if (activeSegment.assetId && (!src || !src.startsWith('data:') && !src.startsWith('blob:'))) {
                src = await AssetManager.getAssetUrl(activeSegment.assetId);
            }

            if (!src) return;

            if (imageCacheRef.current[src]) {
                drawSegment(imageCacheRef.current[src], activeSegment.region);
            } else {
                const img = new Image();
                img.onload = () => {
                    imageCacheRef.current[src] = img;
                    drawSegment(img, activeSegment.region);
                };
                img.src = src;
            }
        };

        resolveAndDraw();
    }, [state, drawSegment]);

    return (
        <div className="fixed inset-0 bg-black flex flex-col overflow-hidden">
            <canvas
                ref={canvasRef}
                className={cn(
                    "w-full h-full",
                    state?.settings?.mirrorMode && "scale-x-[-1]"
                )}
            />

            {!isConnected && (
                <div className="absolute inset-0 flex items-center justify-center text-white/40 font-medium">
                    Waiting for main window...
                </div>
            )}

            {/* Guide line overlays */}
            <div className="absolute left-0 right-0 h-1 bg-red-500/30 top-[40%] pointer-events-none" />

            {/* Status Bar */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4 text-[10px] text-white/30 uppercase tracking-widest font-bold bg-black/50 px-4 py-2 rounded-full backdrop-blur-md border border-white/5">
                <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", isConnected ? "bg-green-500" : "bg-red-500")} />
                    {isConnected ? 'Link Active' : 'Disconnected'}
                </div>
                {state?.visualState?.isPlaying && (
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        Live
                    </div>
                )}
            </div>
        </div>
    );
};
