import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { VisualSegment } from '../useVisualEditorState';

interface PlaybackProgressBarProps {
    totalDuration: number;
    allSegments: VisualSegment[];
    initialTime?: number;
    onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
    className?: string;
}

export const PlaybackProgressBar = React.memo<PlaybackProgressBarProps>(({
    totalDuration,
    allSegments,
    initialTime = 0,
    onClick,
    className
}) => {
    const barRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleTick = (e: CustomEvent<{ time: number }>) => {
            if (barRef.current && totalDuration > 0) {
                const progress = (e.detail.time / totalDuration) * 100;
                barRef.current.style.width = `${Math.min(100, progress)}%`;
            }
        };

        window.addEventListener('playback-tick' as any, handleTick);
        return () => window.removeEventListener('playback-tick' as any, handleTick);
    }, [totalDuration]);

    return (
        <div
            className={cn(
                "h-1.5 bg-white/10 rounded-full cursor-pointer relative group/progress overflow-hidden border border-white/5",
                className
            )}
            onClick={onClick}
        >
            <div
                ref={barRef}
                className="absolute inset-y-0 left-0 bg-primary shadow-[0_0_20px_rgba(var(--primary),0.8)] transition-all duration-100"
                style={{ width: `${totalDuration > 0 ? (initialTime / totalDuration) * 100 : 0}%` }}
            />
            {allSegments.map((seg) => (
                <div
                    key={seg.id}
                    className="absolute top-0 bottom-0 w-px bg-white/20"
                    style={{ left: `${(seg.startTime / totalDuration) * 100}%` }}
                />
            ))}
        </div>
    );
});

PlaybackProgressBar.displayName = 'PlaybackProgressBar';
