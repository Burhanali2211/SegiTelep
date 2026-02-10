import React, { memo } from 'react';
import { Layers3, PenTool, Play, Eye, EyeOff, Clock, ChevronUp, ChevronDown, Copy, Trash2 } from 'lucide-react';
import { formatTime } from '../../utils/formatTime';
import { cn } from '@/lib/utils';
import type { VisualSegment, ImagePage } from '../../types/visualEditor.types';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

interface RegionSectionProps {
  pages: ImagePage[];
  currentPageIndex: number;
  selectedSegmentIds: Set<string>;
  playbackTime: number;
  onSegmentClick: (e: React.MouseEvent, segment: VisualSegment, pageIndex: number) => void;
  onPlaySegment: (segment: VisualSegment) => void;
  onToggleVisibility: (id: string) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const RegionSection = memo<RegionSectionProps>(({
  pages,
  currentPageIndex,
  selectedSegmentIds,
  playbackTime,
  onSegmentClick,
  onPlaySegment,
  onToggleVisibility,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
}) => {
  const totalSegments = pages.reduce((acc, p) => acc + p.segments.length, 0);

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Layers3 size={12} /> Regions
        </h3>
        {totalSegments > 0 && <span className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded whitespace-nowrap shrink-0">{totalSegments}</span>}
      </div>

      {pages.length === 0 ? (
        <div className="py-6 text-center">
          <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-2">
            <Layers3 size={16} className="text-muted-foreground/50" />
          </div>
          <p className="text-xs text-muted-foreground">Add an image first</p>
        </div>
      ) : totalSegments === 0 ? (
        <div className="py-6 text-center">
          <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-2">
            <PenTool size={16} className="text-muted-foreground/50" />
          </div>
          <p className="text-xs text-muted-foreground">Draw on the image</p>
          <p className="text-[10px] text-muted-foreground/70 mt-1">
            Press <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">N</kbd> to start
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {(() => {
            let globalIndex = 0;
            return pages.map((page, pageIndex) => {
              const pageSegments = page.segments.map((segment, localIndex) => {
                const globalNum = globalIndex + localIndex + 1;
                const canMoveUp = localIndex > 0;
                const canMoveDown = localIndex < page.segments.length - 1;
                return { segment, globalNum, pageIndex, canMoveUp, canMoveDown };
              });
              globalIndex += page.segments.length;

              return (
                <React.Fragment key={page.id}>
                  {pages.length > 1 && page.segments.length > 0 && (
                    <div
                      className={cn(
                        'flex items-center justify-between gap-2 text-[10px] font-semibold px-2 py-1.5 rounded-md mb-1 min-w-0',
                        pageIndex === currentPageIndex ? 'text-primary bg-primary/10' : 'text-muted-foreground bg-muted/30'
                      )}
                    >
                      <span className="whitespace-nowrap shrink-0">Page {pageIndex + 1}</span>
                      <span className="font-normal text-muted-foreground whitespace-nowrap shrink-0">{page.segments.length} region{page.segments.length !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {pageSegments.map(({ segment, globalNum, canMoveUp, canMoveDown }) => {
                    const isSelected = selectedSegmentIds.has(segment.id);
                    const isPlaying = playbackTime >= segment.startTime && playbackTime < segment.endTime;
                    const isCurrentPage = pageIndex === currentPageIndex;

                    return (
                      <ContextMenu key={segment.id}>
                        <ContextMenuTrigger asChild>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={(e) => onSegmentClick(e, segment, pageIndex)}
                        onDoubleClick={() => onPlaySegment(segment)}
                        onKeyDown={(e) => e.key === 'Enter' && onSegmentClick(e as unknown as React.MouseEvent, segment, pageIndex)}
                        className={cn(
                          'w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all duration-150 text-left group cursor-pointer relative pr-16',
                          isPlaying && 'bg-destructive/15 ring-1 ring-destructive/30',
                          isSelected && !isPlaying && 'bg-primary/15 ring-1 ring-primary/30',
                          !isSelected && !isPlaying && 'hover:bg-muted/50',
                          !isCurrentPage && 'opacity-60'
                        )}
                      >
                        <div
                          className={cn(
                            'flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-bold shrink-0',
                            isPlaying ? 'bg-destructive text-destructive-foreground' : isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {globalNum}
                        </div>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {segment.color && <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: segment.color }} />}
                            <span className={cn('text-[11px] font-medium truncate', segment.isHidden && 'opacity-50')}>{typeof segment.label === 'string' ? segment.label : ''}</span>
                            {segment.isHidden && <EyeOff size={10} className="text-muted-foreground shrink-0" />}
                            {!isCurrentPage && pages.length > 1 && <span className="text-[9px] text-muted-foreground shrink-0">(P{pageIndex + 1})</span>}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono tabular-nums whitespace-nowrap">
                            <Clock size={9} className="shrink-0" />
                            {formatTime(segment.startTime)} – {formatTime(segment.endTime)}
                          </div>
                        </div>
                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 rounded px-0.5">
                          {onMoveUp && (
                            <button onClick={(e) => { e.stopPropagation(); onMoveUp(segment.id); }} disabled={!canMoveUp} className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-30 disabled:pointer-events-none" title="Move up">
                              <ChevronUp size={10} />
                            </button>
                          )}
                          {onMoveDown && (
                            <button onClick={(e) => { e.stopPropagation(); onMoveDown(segment.id); }} disabled={!canMoveDown} className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-30 disabled:pointer-events-none" title="Move down">
                              <ChevronDown size={10} />
                            </button>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); onPlaySegment(segment); }} className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                            <Play size={10} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); onToggleVisibility(segment.id); }} className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                            {segment.isHidden ? <EyeOff size={10} /> : <Eye size={10} />}
                          </button>
                        </div>
                      </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-48">
                          <ContextMenuItem onClick={() => onPlaySegment(segment)}>
                            <Play size={14} className="mr-2" /> Play
                          </ContextMenuItem>
                          {onDuplicate && (
                            <ContextMenuItem onClick={() => onDuplicate(segment.id)}>
                              <Copy size={14} className="mr-2" /> Duplicate
                            </ContextMenuItem>
                          )}
                          <ContextMenuItem onClick={() => onToggleVisibility(segment.id)}>
                            {segment.isHidden ? <Eye size={14} className="mr-2" /> : <EyeOff size={14} className="mr-2" />}
                            {segment.isHidden ? 'Show' : 'Hide'}
                          </ContextMenuItem>
                          {onDelete && (
                            <>
                              <ContextMenuSeparator />
                              <ContextMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(segment.id)}>
                                <Trash2 size={14} className="mr-2" /> Delete
                              </ContextMenuItem>
                            </>
                          )}
                        </ContextMenuContent>
                      </ContextMenu>
                    );
                  })}
                </React.Fragment>
              );
            });
          })()}
        </div>
      )}
    </section>
  );
});

RegionSection.displayName = 'RegionSection';
