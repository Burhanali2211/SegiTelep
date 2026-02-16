import React, { useEffect, useRef } from 'react';
import { formatTime } from '../useVisualEditorState';

interface PlaybackTimeDisplayProps {
    className?: string;
    initialTime?: number;
}

/**
 * A highly optimized time display that subscribes to global events 
 * to update its content without triggering React re-renders.
 */
export const PlaybackTimeDisplay = React.memo<PlaybackTimeDisplayProps>(({ className, initialTime = 0 }) => {
    const displayRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const handleTick = (e: CustomEvent<{ time: number }>) => {
            if (displayRef.current) {
                displayRef.current.textContent = formatTime(e.detail.time);
            }
        };

        window.addEventListener('playback-tick' as any, handleTick);
        return () => window.removeEventListener('playback-tick' as any, handleTick);
    }, []);

    return (
        <span ref={displayRef} className={className}>
            {formatTime(initialTime)}
        </span>
    );
});

PlaybackTimeDisplay.displayName = 'PlaybackTimeDisplay';
