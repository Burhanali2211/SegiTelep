import React, { memo, useState, useRef, useCallback } from 'react';
import { useVisualEditorState } from '../../useVisualEditorState';
import { useUndoRedo } from '../../useUndoRedo';
import { Region } from '@/types/teleprompter.types';
import type { VisualSegment } from '../../types/visualEditor.types';
import { cn } from '@/lib/utils';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Copy, Trash2, Eye, EyeOff, Play, Target, Clock } from 'lucide-react';

// Magnetic snap threshold in percentage (relative to image)
const SEGMENT_SNAP_THRESHOLD_PERCENT = 1.5;

interface SegmentBoxProps {
  segment: VisualSegment;
  isSelected: boolean;
}

export const SegmentBox = memo<SegmentBoxProps>(({ segment, isSelected }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<'top' | 'bottom' | 'left' | 'right' | null>(null);
  const [snappedEdges, setSnappedEdges] = useState<{ left: boolean; right: boolean; top: boolean }>({ left: false, right: false, top: false });
  // Local region during drag/resize - avoids store updates on every pointer move (fixes lag)
  const [provisionalRegion, setProvisionalRegion] = useState<Region | null>(null);
  const provisionalRegionRef = useRef<Region | null>(null);
  const dragDataRef = useRef<{
    startX: number;
    startY: number;
    region: Region;
  } | null>(null);

  const updateSegment = useVisualEditorState((s) => s.updateSegment);
  const selectSegment = useVisualEditorState((s) => s.selectSegment);
  const setActiveDrag = useVisualEditorState((s) => s.setActiveDrag);
  const { saveState } = useUndoRedo();

  const applySegmentSnap = useCallback((region: Region): { region: Region; snapped: { left: boolean; right: boolean; top: boolean } } => {
    let { x, y, width, height } = region;
    const snapped = { left: false, right: false, top: false };

    if (Math.abs(x) < SEGMENT_SNAP_THRESHOLD_PERCENT) {
      x = 0;
      snapped.left = true;
    }

    const rightEdge = x + width;
    if (Math.abs(100 - rightEdge) < SEGMENT_SNAP_THRESHOLD_PERCENT) {
      x = 100 - width;
      snapped.right = true;
    }

    if (Math.abs(y) < SEGMENT_SNAP_THRESHOLD_PERCENT) {
      y = 0;
      snapped.top = true;
    }

    x = Math.max(0, Math.min(100 - width, x));
    y = Math.max(0, Math.min(100 - height, y));

    return { region: { x, y, width, height }, snapped };
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      selectSegment(segment.id, 'toggle');
    } else if (e.shiftKey) {
      selectSegment(segment.id, 'range');
    } else {
      selectSegment(segment.id, 'single');
    }
  }, [segment.id, selectSegment]);

  const handleDragStart = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isSelected) selectSegment(segment.id, 'single');
    saveState();
    setIsDragging(true);
    setActiveDrag(true);
    dragDataRef.current = { startX: e.clientX, startY: e.clientY, region: { ...segment.region } };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [segment, isSelected, selectSegment, saveState, setActiveDrag]);

  const handleDragMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !dragDataRef.current) return;
    const imageEl = document.getElementById('visual-editor-image');
    if (!imageEl) return;
    const rect = imageEl.getBoundingClientRect();
    const dx = ((e.clientX - dragDataRef.current.startX) / rect.width) * 100;
    const dy = ((e.clientY - dragDataRef.current.startY) / rect.height) * 100;
    const rawX = dragDataRef.current.region.x + dx;
    const rawY = dragDataRef.current.region.y + dy;
    const { region: snappedRegion, snapped } = applySegmentSnap({
      x: rawX, y: rawY, width: segment.region.width, height: segment.region.height,
    });
    setSnappedEdges(snapped);
    provisionalRegionRef.current = snappedRegion;
    setProvisionalRegion(snappedRegion);
  }, [isDragging, segment.region.width, segment.region.height, applySegmentSnap]);

  const handleDragEnd = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    const finalRegion = provisionalRegionRef.current ?? segment.region;
    if (provisionalRegionRef.current) {
      updateSegment(segment.id, { region: finalRegion });
    }
    provisionalRegionRef.current = null;
    setProvisionalRegion(null);
    setIsDragging(false);
    setActiveDrag(false);
    setSnappedEdges({ left: false, right: false, top: false });
    dragDataRef.current = null;
  }, [segment.id, segment.region, setActiveDrag, updateSegment]);

  const handleResizeStart = useCallback((edge: 'top' | 'bottom' | 'left' | 'right', e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    saveState();
    setIsResizing(edge);
    setActiveDrag(true);
    dragDataRef.current = { startX: e.clientX, startY: e.clientY, region: { ...segment.region } };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [segment.region, saveState, setActiveDrag]);

  const handleResizeMove = useCallback((e: React.PointerEvent) => {
    if (!isResizing || !dragDataRef.current) return;
    const imageEl = document.getElementById('visual-editor-image');
    if (!imageEl) return;
    const rect = imageEl.getBoundingClientRect();
    const dx = ((e.clientX - dragDataRef.current.startX) / rect.width) * 100;
    const dy = ((e.clientY - dragDataRef.current.startY) / rect.height) * 100;
    let newRegion = { ...segment.region };
    const newSnapped = { left: false, right: false, top: false };

    if (isResizing === 'top') {
      let newY = dragDataRef.current.region.y + dy;
      if (Math.abs(newY) < SEGMENT_SNAP_THRESHOLD_PERCENT) { newY = 0; newSnapped.top = true; }
      newY = Math.max(0, Math.min(dragDataRef.current.region.y + dragDataRef.current.region.height - 5, newY));
      const newHeight = dragDataRef.current.region.height - (newY - dragDataRef.current.region.y);
      newRegion = { ...newRegion, y: newY, height: newHeight };
    } else if (isResizing === 'bottom') {
      const newHeight = Math.max(5, Math.min(100 - dragDataRef.current.region.y, dragDataRef.current.region.height + dy));
      newRegion = { ...newRegion, height: newHeight };
    } else if (isResizing === 'left') {
      let newX = dragDataRef.current.region.x + dx;
      if (Math.abs(newX) < SEGMENT_SNAP_THRESHOLD_PERCENT) { newX = 0; newSnapped.left = true; }
      newX = Math.max(0, Math.min(dragDataRef.current.region.x + dragDataRef.current.region.width - 5, newX));
      const newWidth = dragDataRef.current.region.width - (newX - dragDataRef.current.region.x);
      newRegion = { ...newRegion, x: newX, width: newWidth };
    } else if (isResizing === 'right') {
      let newWidth = dragDataRef.current.region.width + dx;
      const rightEdge = dragDataRef.current.region.x + newWidth;
      if (Math.abs(100 - rightEdge) < SEGMENT_SNAP_THRESHOLD_PERCENT) {
        newWidth = 100 - dragDataRef.current.region.x;
        newSnapped.right = true;
      }
      newWidth = Math.max(5, Math.min(100 - dragDataRef.current.region.x, newWidth));
      newRegion = { ...newRegion, width: newWidth };
    }

    setSnappedEdges(newSnapped);
    provisionalRegionRef.current = newRegion;
    setProvisionalRegion(newRegion);
  }, [isResizing, segment.region]);

  const handleResizeEnd = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    const finalRegion = provisionalRegionRef.current ?? segment.region;
    if (provisionalRegionRef.current) {
      updateSegment(segment.id, { region: finalRegion });
    }
    provisionalRegionRef.current = null;
    setProvisionalRegion(null);
    setIsResizing(null);
    setActiveDrag(false);
    setSnappedEdges({ left: false, right: false, top: false });
    dragDataRef.current = null;
  }, [segment.id, segment.region, setActiveDrag, updateSegment]);

  // Decentralized playback state selection
  const isAtPlayhead = useVisualEditorState(s =>
    s.playbackTime >= segment.startTime && s.playbackTime < segment.endTime
  );
  const isGlobalPlaying = useVisualEditorState((s) => s.isPlaying);
  const isActiveActive = isGlobalPlaying && isAtPlayhead;

  // Design Tokens - Optimized for performance
  const baseColor = segment.color || 'rgb(79, 70, 229)';
  const isCustom = !!segment.color;

  const borderStyle = isAtPlayhead
    ? { borderColor: 'rgb(220, 38, 38)', boxShadow: '0 0 15px rgba(220, 38, 38, 0.3)' }
    : isSelected
      ? { borderColor: 'rgb(139, 92, 246)', boxShadow: '0 0 10px rgba(139, 92, 246, 0.2)' }
      : { borderColor: baseColor, opacity: isCustom ? 1 : 0.4 };

  const bgStyle = isAtPlayhead
    ? { backgroundColor: 'rgba(220, 38, 38, 0.1)' }
    : isSelected
      ? { backgroundColor: 'rgba(139, 92, 246, 0.1)' }
      : { backgroundColor: isCustom ? `${baseColor}15` : 'rgba(0, 0, 0, 0.05)' };

  const accentColor = isAtPlayhead ? 'rgb(220, 38, 38)' : isSelected ? 'rgb(139, 92, 246)' : baseColor;

  const displayRegion = provisionalRegion ?? segment.region;
  const duplicateSegment = useVisualEditorState((s) => s.duplicateSegment);
  const deleteSegments = useVisualEditorState((s) => s.deleteSegments);
  const toggleSegmentVisibility = useVisualEditorState((s) => s.toggleSegmentVisibility);
  const setPlaybackTime = useVisualEditorState((s) => s.setPlaybackTime);
  const setPlaying = useVisualEditorState((s) => s.setPlaying);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            'absolute border-2 rounded-sm group/seg will-change-transform',
            isDragging || isResizing ? 'z-50 duration-0' : 'transition-all duration-200',
            isDragging && 'cursor-grabbing scale-[1.01]',
            !isDragging && 'cursor-grab'
          )}
          style={{
            left: `${displayRegion.x}%`,
            top: `${displayRegion.y}%`,
            width: `${displayRegion.width}%`,
            height: `${displayRegion.height}%`,
            ...borderStyle,
            ...bgStyle,
          }}
          onClick={handleClick}
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
        >
          {/* Snap Indicators */}
          {snappedEdges.left && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-sky-400 z-20" />}
          {snappedEdges.right && <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-sky-400 z-20" />}
          {snappedEdges.top && <div className="absolute top-0 left-0 right-0 h-0.5 bg-sky-400 z-20" />}

          {/* Resize Handles - Improved visibility */}
          <div className="absolute -top-1.5 inset-x-4 h-3 cursor-ns-resize z-30 group-hover/seg:bg-indigo-500/10 rounded-full transition-colors" onPointerDown={(e) => handleResizeStart('top', e)} onPointerMove={handleResizeMove} onPointerUp={handleResizeEnd} />
          <div className="absolute -bottom-1.5 inset-x-4 h-3 cursor-ns-resize z-30 group-hover/seg:bg-indigo-500/10 rounded-full transition-colors" onPointerDown={(e) => handleResizeStart('bottom', e)} onPointerMove={handleResizeMove} onPointerUp={handleResizeEnd} />
          <div className="absolute -left-1.5 inset-y-4 w-3 cursor-ew-resize z-30 group-hover/seg:bg-indigo-500/10 rounded-full transition-colors" onPointerDown={(e) => handleResizeStart('left', e)} onPointerMove={handleResizeMove} onPointerUp={handleResizeEnd} />
          <div className="absolute -right-1.5 inset-y-4 w-3 cursor-ew-resize z-30 group-hover/seg:bg-indigo-500/10 rounded-full transition-colors" onPointerDown={(e) => handleResizeStart('right', e)} onPointerMove={handleResizeMove} onPointerUp={handleResizeEnd} />

          {/* Identification Badge - Turns red when playhead is over it */}
          <div
            className={cn(
              "absolute -top-2.5 -left-2.5 w-6 h-6 rounded-full text-white flex items-center justify-center text-[10px] font-black border-2 border-white shadow-lg z-40 transform transition-all duration-300 group-hover/seg:scale-110",
              isAtPlayhead && "scale-110 shadow-[0_0_10px_rgba(220,38,38,0.5)]"
            )}
            style={{ backgroundColor: accentColor }}
          >
            {segment.order + 1}
          </div>


          {/* Duration Badge Bottom Right */}
          <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/40 border border-white/5 flex items-center gap-1">
            <Clock size={8} className="text-indigo-200" />
            <span className="text-[8px] font-mono font-bold text-indigo-50 text-[0.6rem]">{(segment.endTime - segment.startTime).toFixed(0)}s</span>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={() => { setPlaybackTime(segment.startTime); setPlaying(true); }}>
          <Play size={14} className="mr-2" /> Play from here
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => { saveState(); duplicateSegment(segment.id); }}>
          <Copy size={14} className="mr-2" /> Duplicate
        </ContextMenuItem>
        <ContextMenuItem onClick={() => toggleSegmentVisibility(segment.id)}>
          {segment.isHidden ? <Eye size={14} className="mr-2" /> : <EyeOff size={14} className="mr-2" />}
          {segment.isHidden ? 'Show' : 'Hide'}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => {
          const currentTime = useVisualEditorState.getState().playbackTime;
          updateSegment(segment.id, { startTime: currentTime });
        }}>
          <Target size={14} className="mr-2" /> Set start to playhead
        </ContextMenuItem>
        <ContextMenuItem onClick={() => {
          const currentTime = useVisualEditorState.getState().playbackTime;
          updateSegment(segment.id, { endTime: currentTime });
        }}>
          <Target size={14} className="mr-2" /> Set end to playhead
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => { saveState(); deleteSegments([segment.id]); }}
        >
          <Trash2 size={14} className="mr-2" /> Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu >
  );
});

SegmentBox.displayName = 'SegmentBox';
