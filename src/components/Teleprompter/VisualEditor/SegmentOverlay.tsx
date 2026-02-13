import React, { memo, useCallback, useState, useRef } from 'react';
import { useVisualEditorState, VisualSegment, formatTime } from './useVisualEditorState';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SegmentOverlayProps {
  segment: VisualSegment;
  containerWidth: number;
  containerHeight: number;
  isSelected: boolean;
  isPlaying: boolean;
}

const safeStr = (v: unknown): string => (typeof v === 'string' ? v : '');

export const SegmentOverlay = memo<SegmentOverlayProps>(({
  segment,
  containerWidth,
  containerHeight,
  isSelected,
  isPlaying,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<'top' | 'bottom' | 'left' | 'right' | null>(null);
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [labelValue, setLabelValue] = useState(() => safeStr(segment.label));
  const dragStartRef = useRef<{ x: number; y: number; region: typeof segment.region } | null>(null);

  const updateSegment = useVisualEditorState((s) => s.updateSegment);
  const selectSegment = useVisualEditorState((s) => s.selectSegment);

  const x = (segment.region.x / 100) * containerWidth;
  const y = (segment.region.y / 100) * containerHeight;
  const w = (segment.region.width / 100) * containerWidth;
  const h = (segment.region.height / 100) * containerHeight;

  // Handle move
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();

    if (e.ctrlKey || e.metaKey) {
      selectSegment(segment.id, 'toggle');
      return;
    }

    selectSegment(segment.id, 'single');
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      region: { ...segment.region },
    };

    const handleMove = (moveEvent: MouseEvent) => {
      if (!dragStartRef.current) return;

      const dx = ((moveEvent.clientX - dragStartRef.current.x) / containerWidth) * 100;
      const dy = ((moveEvent.clientY - dragStartRef.current.y) / containerHeight) * 100;

      const newX = Math.max(0, Math.min(100 - segment.region.width, dragStartRef.current.region.x + dx));
      const newY = Math.max(0, Math.min(100 - segment.region.height, dragStartRef.current.region.y + dy));

      updateSegment(segment.id, {
        region: { ...segment.region, x: newX, y: newY },
      });
    };

    const handleUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [segment, containerWidth, containerHeight, updateSegment, selectSegment]);

  // Handle resize
  const handleResizeStart = useCallback((edge: 'top' | 'bottom' | 'left' | 'right', e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(edge);

    const startX = e.clientX;
    const startY = e.clientY;
    const startRegion = { ...segment.region };

    const handleMove = (moveEvent: MouseEvent) => {
      const dx = ((moveEvent.clientX - startX) / containerWidth) * 100;
      const dy = ((moveEvent.clientY - startY) / containerHeight) * 100;

      if (edge === 'top') {
        const newY = Math.max(0, Math.min(startRegion.y + startRegion.height - 5, startRegion.y + dy));
        const newHeight = startRegion.height - (newY - startRegion.y);
        updateSegment(segment.id, {
          region: { ...segment.region, y: newY, height: newHeight },
        });
      } else if (edge === 'bottom') {
        const newHeight = Math.max(5, Math.min(100 - startRegion.y, startRegion.height + dy));
        updateSegment(segment.id, {
          region: { ...segment.region, height: newHeight },
        });
      } else if (edge === 'left') {
        const newX = Math.max(0, Math.min(startRegion.x + startRegion.width - 5, startRegion.x + dx));
        const newWidth = startRegion.width - (newX - startRegion.x);
        updateSegment(segment.id, {
          region: { ...segment.region, x: newX, width: newWidth },
        });
      } else if (edge === 'right') {
        const newWidth = Math.max(5, Math.min(100 - startRegion.x, startRegion.width + dx));
        updateSegment(segment.id, {
          region: { ...segment.region, width: newWidth },
        });
      }
    };

    const handleUp = () => {
      setIsResizing(null);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [segment, containerWidth, containerHeight, updateSegment]);

  // Handle label edit
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingLabel(true);
    setLabelValue(safeStr(segment.label));
  }, [segment.label]);

  const handleLabelSubmit = useCallback(() => {
    updateSegment(segment.id, { label: safeStr(labelValue).trim() || 'Segment' });
    setIsEditingLabel(false);
  }, [segment.id, labelValue, updateSegment]);

  return (
    <div
      className={cn(
        'absolute border-2 transition-all duration-200',
        isPlaying && 'border-green-500 bg-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.3)]',
        isSelected && !isPlaying && 'border-blue-400 bg-blue-400/15 backdrop-blur-[2px] shadow-[0_0_15px_rgba(96,165,250,0.2)]',
        !isSelected && !isPlaying && 'border-green-500/30 bg-green-500/5',
        isDragging && 'cursor-grabbing',
        !isDragging && 'cursor-grab'
      )}
      style={{ left: x, top: y, width: w, height: h }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      {/* Top resize handle */}
      <div
        className="absolute -top-1 left-0 right-0 h-3 cursor-ns-resize hover:bg-primary/30"
        onMouseDown={(e) => handleResizeStart('top', e)}
      />

      {/* Bottom resize handle */}
      <div
        className="absolute -bottom-1 left-0 right-0 h-3 cursor-ns-resize hover:bg-primary/30"
        onMouseDown={(e) => handleResizeStart('bottom', e)}
      />

      {/* Left resize handle */}
      <div
        className="absolute -left-1 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-primary/30"
        onMouseDown={(e) => handleResizeStart('left', e)}
      />

      {/* Right resize handle */}
      <div
        className="absolute -right-1 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-primary/30"
        onMouseDown={(e) => handleResizeStart('right', e)}
      />

      {/* Label */}
      <div
        className={cn(
          'absolute top-0 left-0 px-2 py-0.5 text-[10px] font-bold tracking-tight text-black uppercase',
          isPlaying && 'bg-green-500',
          isSelected && !isPlaying && 'bg-blue-400',
          !isSelected && !isPlaying && 'bg-green-600/50 text-white backdrop-blur-sm'
        )}
        style={{ maxWidth: w }}
      >
        {isEditingLabel ? (
          <Input
            value={safeStr(labelValue)}
            onChange={(e) => setLabelValue(e.target.value)}
            onBlur={handleLabelSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleLabelSubmit()}
            className="h-5 w-20 text-xs p-0.5"
            autoFocus
          />
        ) : (
          <span className="truncate block">{typeof segment.label === 'string' ? segment.label : ''}</span>
        )}
      </div>

      {/* Time display */}
      <div className="absolute bottom-0 right-0 px-1 py-0.5 text-[10px] bg-black/70 text-white rounded-tl">
        {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
      </div>
    </div>
  );
});

SegmentOverlay.displayName = 'SegmentOverlay';
