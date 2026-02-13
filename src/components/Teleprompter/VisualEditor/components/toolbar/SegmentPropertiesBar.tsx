import React, { memo, useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatTime, parseTime } from '../../utils/formatTime';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useVisualEditorState } from '../../useVisualEditorState';
import { cn } from '@/lib/utils';
import type { VisualSegment } from '../../types/visualEditor.types';

interface SegmentPropertiesBarProps {
  segment: VisualSegment;
  onClose?: () => void;
  className?: string;
}

const safeString = (v: unknown): string =>
  typeof v === 'string' ? v : '';

export const SegmentPropertiesBar = memo<SegmentPropertiesBarProps>(({ segment, onClose, className }) => {
  const [label, setLabel] = useState(() => safeString(segment.label));
  const [editingStart, setEditingStart] = useState(false);
  const [editingEnd, setEditingEnd] = useState(false);
  const [startValue, setStartValue] = useState(formatTime(segment.startTime));
  const [endValue, setEndValue] = useState(formatTime(segment.endTime));

  const updateSegment = useVisualEditorState((s) => s.updateSegment);
  const setPlaybackTime = useVisualEditorState((s) => s.setPlaybackTime);
  const setPlaying = useVisualEditorState((s) => s.setPlaying);

  useEffect(() => {
    setLabel(safeString(segment.label));
    setStartValue(formatTime(segment.startTime));
    setEndValue(formatTime(segment.endTime));
  }, [segment.id, segment.label, segment.startTime, segment.endTime]);

  const handleLabelBlur = useCallback(() => {
    const trimmed = safeString(label).trim();
    const segLabel = safeString(segment.label);
    if (trimmed && trimmed !== segLabel) {
      updateSegment(segment.id, { label: trimmed });
    } else {
      setLabel(segLabel);
    }
  }, [label, segment.id, segment.label, updateSegment]);

  const handleStartSubmit = useCallback(() => {
    const time = parseTime(startValue);
    if (!isNaN(time)) {
      updateSegment(segment.id, { startTime: time });
    }
    setEditingStart(false);
  }, [startValue, segment.id, updateSegment]);

  const handleEndSubmit = useCallback(() => {
    const time = parseTime(endValue);
    if (!isNaN(time)) {
      updateSegment(segment.id, { endTime: time });
    }
    setEditingEnd(false);
  }, [endValue, segment.id, updateSegment]);

  const adjustTime = useCallback((field: 'start' | 'end', delta: number) => {
    const current = field === 'start' ? segment.startTime : segment.endTime;
    const newTime = Math.max(0, current + delta);
    updateSegment(segment.id, { [field === 'start' ? 'startTime' : 'endTime']: newTime });
  }, [segment.id, segment.startTime, segment.endTime, updateSegment]);

  const handlePlay = useCallback(() => {
    setPlaybackTime(segment.startTime);
    setPlaying(true);
  }, [segment.startTime, setPlaybackTime, setPlaying]);

  const duration = segment.endTime - segment.startTime;

  return (
    <div className={cn('flex items-center gap-3 px-3 py-2 bg-card/95 backdrop-blur-sm', className)}>
      <div className="flex items-center gap-2 min-w-[140px]">
        <span className="text-[10px] text-muted-foreground shrink-0">Label</span>
        <Input
          value={safeString(label)}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={handleLabelBlur}
          onKeyDown={(e) => e.key === 'Enter' && handleLabelBlur()}
          className="h-7 text-xs"
          placeholder="Segment label"
        />
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-muted-foreground w-8">Start</span>
        {editingStart ? (
          <Input
            value={startValue}
            onChange={(e) => setStartValue(e.target.value)}
            onBlur={handleStartSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleStartSubmit()}
            className="h-6 w-20 text-xs px-1"
            autoFocus
          />
        ) : (
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => adjustTime('start', -0.1)}>
              <ChevronLeft size={12} />
            </Button>
            <button className="h-6 px-2 text-xs font-mono border rounded" onClick={() => setEditingStart(true)}>
              {formatTime(segment.startTime)}
            </button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => adjustTime('start', 0.1)}>
              <ChevronRight size={12} />
            </Button>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-muted-foreground w-8">End</span>
        {editingEnd ? (
          <Input
            value={endValue}
            onChange={(e) => setEndValue(e.target.value)}
            onBlur={handleEndSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleEndSubmit()}
            className="h-6 w-20 text-xs px-1"
            autoFocus
          />
        ) : (
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => adjustTime('end', -0.1)}>
              <ChevronLeft size={12} />
            </Button>
            <button className="h-6 px-2 text-xs font-mono border rounded" onClick={() => setEditingEnd(true)}>
              {formatTime(segment.endTime)}
            </button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => adjustTime('end', 0.1)}>
              <ChevronRight size={12} />
            </Button>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-muted-foreground">Duration</span>
        <span className="text-xs font-mono">{formatTime(duration)}</span>
      </div>
      <Button variant="outline" size="sm" className="h-7" onClick={handlePlay}>
        Play
      </Button>
      {onClose && (
        <Button variant="ghost" size="sm" className="h-7" onClick={onClose}>
          Close
        </Button>
      )}
    </div>
  );
});

SegmentPropertiesBar.displayName = 'SegmentPropertiesBar';
