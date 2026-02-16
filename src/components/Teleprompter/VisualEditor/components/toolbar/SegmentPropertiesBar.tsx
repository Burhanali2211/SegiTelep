import React, { memo, useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatTime, parseTime, formatDuration } from '../../utils/formatTime';
import { ChevronLeft, ChevronRight, Palette, Play, Pause, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useUndoRedo } from '../../useUndoRedo';
import { useVisualEditorState } from '../../useVisualEditorState';
import { cn } from '@/lib/utils';
import type { VisualSegment } from '../../types/visualEditor.types';

interface SegmentPropertiesBarProps {
  segment: VisualSegment;
  onClose?: () => void;
  className?: string;
}

const PRESET_COLORS = [
  { name: 'Default', value: null },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Lime', value: '#84cc16' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Fuchsia', value: '#d946ef' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Rose', value: '#f43f5e' },
];

const safeString = (v: unknown): string =>
  typeof v === 'string' ? v : '';

export const SegmentPropertiesBar = memo<SegmentPropertiesBarProps>(({ segment, onClose, className }) => {
  const updateSegment = useVisualEditorState((s) => s.updateSegment);
  const setPlaybackTime = useVisualEditorState((s) => s.setPlaybackTime);
  const setPlaying = useVisualEditorState((s) => s.setPlaying);
  const isPlaying = useVisualEditorState((s) => s.isPlaying);
  const [isEditingDuration, setIsEditingDuration] = useState(false);
  const [tempDuration, setTempDuration] = useState('');
  const { saveState } = useUndoRedo();


  const handleDurationAdjust = useCallback((delta: number) => {
    const currentDuration = segment.endTime - segment.startTime;
    const newDuration = Math.max(1, currentDuration + delta);
    updateSegment(segment.id, { endTime: segment.startTime + newDuration });
  }, [segment.id, segment.startTime, updateSegment]);

  const handleDurationBlur = useCallback(() => {
    const val = parseTime(tempDuration);
    if (!isNaN(val)) {
      handleDurationAdjust(val - (segment.endTime - segment.startTime));
    }
    setIsEditingDuration(false);
  }, [tempDuration, segment.endTime, segment.startTime, handleDurationAdjust]);

  const handlePlayToggle = useCallback(() => {
    if (isPlaying) {
      setPlaying(false);
    } else {
      setPlaybackTime(segment.startTime);
      setPlaying(true);
    }
  }, [isPlaying, segment.startTime, setPlaybackTime, setPlaying]);

  const duration = segment.endTime - segment.startTime;

  return (
    <div className={cn('flex items-center gap-3 px-3 py-1.5 bg-card/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300', className)}>
      <div
        className="flex items-center gap-1.5 bg-background/50 border border-white/5 rounded-lg px-2 py-0.5 select-none"
        onWheel={(e) => {
          e.stopPropagation();
          const delta = e.deltaY < 0 ? 1 : -1;
          handleDurationAdjust(delta);
        }}
      >
        <label className="text-[10px] font-bold uppercase text-muted-foreground/50 tracking-widest mr-1">Duration</label>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-destructive/10 text-destructive/70"
            onClick={() => handleDurationAdjust(-1)}
          >
            <ChevronLeft size={14} />
          </Button>

          <div className="min-w-[40px] flex justify-center cursor-text">
            {isEditingDuration ? (
              <input
                autoFocus
                className="w-12 text-center bg-transparent border-none outline-none text-[11px] font-mono font-black text-primary p-0"
                value={tempDuration}
                onChange={(e) => setTempDuration(e.target.value)}
                onBlur={handleDurationBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleDurationBlur();
                  if (e.key === 'Escape') {
                    setIsEditingDuration(false);
                    setTempDuration(Math.round(duration).toString());
                    setTempDuration(formatDuration(duration).replace('s', ''));
                  }
                }}
              />
            ) : (
              <div
                className="text-[11px] font-mono font-black text-primary"
                onDoubleClick={() => {
                  setIsEditingDuration(true);
                  setTempDuration(formatDuration(duration).replace('s', ''));
                }}
              >
                {formatDuration(duration)}
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-primary/10 text-primary"
            onClick={() => handleDurationAdjust(1)}
          >
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>

      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] gap-1.5 transition-all hover:bg-muted/50">
                <Palette size={13} className="text-primary/70" />
                <div
                  className="w-3 h-3 rounded-full border border-white/20"
                  style={{ backgroundColor: segment.color || 'rgb(99, 102, 241)' }}
                />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Segment Color</TooltipContent>
        </Tooltip>
        <PopoverContent side="bottom" className="w-48 p-2 bg-card/95 backdrop-blur-xl border-white/10 shadow-2xl z-[100]">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2 px-1">Modern Palette</h4>
          <div className="grid grid-cols-5 gap-1.5">
            {PRESET_COLORS.map((c) => (
              <button
                key={c.name}
                className={cn(
                  "h-6 w-full rounded-md border border-white/10 transition-transform hover:scale-110 active:scale-95",
                  !c.value && "bg-indigo-600/30 border-indigo-500/50"
                )}
                style={c.value ? { backgroundColor: c.value } : {}}
                onClick={() => {
                  saveState();
                  updateSegment(segment.id, { color: c.value });
                }}
                title={c.name}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <div className="h-4 w-px bg-white/10 mx-1" />

      <Button
        variant={isPlaying ? "secondary" : "default"}
        size="sm"
        className="h-7 px-3 gap-2 font-bold text-[10px] uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
        onClick={handlePlayToggle}
      >
        {isPlaying ? <Pause size={12} className="fill-current" /> : <Play size={12} className="fill-current" />}
        {isPlaying ? "Pause" : "Play"}
      </Button>

      {onClose && (
        <>
          <div className="h-4 w-px bg-white/10 mx-1" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full hover:bg-destructive/10 hover:text-destructive group-hover:rotate-90 transition-all duration-300"
                onClick={onClose}
              >
                <X size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Close Toolbar</TooltipContent>
          </Tooltip>
        </>
      )}
    </div>
  );
});

SegmentPropertiesBar.displayName = 'SegmentPropertiesBar';
