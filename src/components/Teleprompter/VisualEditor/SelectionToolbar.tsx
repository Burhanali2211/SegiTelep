import React, { memo, useCallback } from 'react';
import { useVisualEditorState } from './useVisualEditorState';
import { useUndoRedo } from './useUndoRedo';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Trash2,
  Copy,
  ClipboardPaste,
  Square,
  CheckSquare,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Play,
  LayoutGrid,
  Timer,
  AlignHorizontalSpaceAround,
  RectangleHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BatchTimeMenuProps {
  selectedCount: number;
  getAllSegmentsOrdered: () => { id: string; startTime: number; endTime: number }[];
  selectedSegmentIds: Set<string>;
  saveState: () => void;
  spaceEvenlySelected: (start: number, end: number) => void;
  setDurationForSelected: (duration: number) => void;
  alignSelectedToGrid: (gridSeconds: number) => void;
}

const BatchTimeMenu = memo(({ selectedCount, getAllSegmentsOrdered, selectedSegmentIds, saveState, spaceEvenlySelected, setDurationForSelected, alignSelectedToGrid }: BatchTimeMenuProps) => {
  const ordered = getAllSegmentsOrdered().filter(s => selectedSegmentIds.has(s.id));
  const firstStart = ordered[0]?.startTime ?? 0;
  const lastEnd = ordered[ordered.length - 1]?.endTime ?? 0;
  const totalRange = lastEnd - firstStart;

  return (
    <div className="flex items-center gap-0.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-[10px]"
            disabled={selectedCount < 2}
            onClick={() => {
              saveState();
              spaceEvenlySelected(firstStart, lastEnd);
            }}
          >
            <AlignHorizontalSpaceAround size={12} className="mr-1" />
            Even
          </Button>
        </TooltipTrigger>
        <TooltipContent>Distribute selected segments evenly in time range</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-[10px]"
            disabled={selectedCount === 0}
            onClick={() => {
              saveState();
              setDurationForSelected(5);
            }}
          >
            <Timer size={12} className="mr-1" />
            5s each
          </Button>
        </TooltipTrigger>
        <TooltipContent>Set duration to 5 seconds for all selected</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-[10px]"
            disabled={selectedCount === 0}
            onClick={() => {
              saveState();
              alignSelectedToGrid(0.5);
            }}
          >
            <LayoutGrid size={12} className="mr-1" />
            Snap 0.5s
          </Button>
        </TooltipTrigger>
        <TooltipContent>Snap times to 0.5 second grid</TooltipContent>
      </Tooltip>
    </div>
  );
});

interface SelectionToolbarProps {
  className?: string;
}

export const SelectionToolbar = memo<SelectionToolbarProps>(({ className }) => {
  const selectedSegmentIds = useVisualEditorState((s) => s.selectedSegmentIds);
  const clipboard = useVisualEditorState((s) => s.clipboard);
  const currentPage = useVisualEditorState((s) => s.getCurrentPage());

  const deleteSegments = useVisualEditorState((s) => s.deleteSegments);
  const copySelected = useVisualEditorState((s) => s.copySelected);
  const paste = useVisualEditorState((s) => s.paste);
  const selectAll = useVisualEditorState((s) => s.selectAll);
  const deselectAll = useVisualEditorState((s) => s.deselectAll);
  const shiftSelectedTimes = useVisualEditorState((s) => s.shiftSelectedTimes);
  const spaceEvenlySelected = useVisualEditorState((s) => s.spaceEvenlySelected);
  const setDurationForSelected = useVisualEditorState((s) => s.setDurationForSelected);
  const alignSelectedToGrid = useVisualEditorState((s) => s.alignSelectedToGrid);
  const getAllSegmentsOrdered = useVisualEditorState((s) => s.getAllSegmentsOrdered);
  const aspectRatioConstraint = useVisualEditorState((s) => s.aspectRatioConstraint);
  const applyAspectRatioToSelected = useVisualEditorState((s) => s.applyAspectRatioToSelected);
  const toggleSegmentVisibility = useVisualEditorState((s) => s.toggleSegmentVisibility);
  const setPlaybackTime = useVisualEditorState((s) => s.setPlaybackTime);
  const setPlaying = useVisualEditorState((s) => s.setPlaying);

  const { saveState } = useUndoRedo();

  const selectedCount = selectedSegmentIds.size;
  const hasSelection = selectedCount > 0;

  const selectedSegments = currentPage?.segments.filter(s => selectedSegmentIds.has(s.id)) || [];
  const singleSelected = selectedSegments.length === 1 ? selectedSegments[0] : null;

  const handleDelete = useCallback(() => {
    saveState();
    deleteSegments(Array.from(selectedSegmentIds));
  }, [saveState, deleteSegments, selectedSegmentIds]);

  const handleCopy = useCallback(() => {
    copySelected();
  }, [copySelected]);

  const handlePaste = useCallback(() => {
    saveState();
    paste();
  }, [saveState, paste]);

  const handleShift = useCallback((delta: number) => {
    saveState();
    shiftSelectedTimes(delta);
  }, [saveState, shiftSelectedTimes]);

  const handleToggleVisibility = useCallback(() => {
    selectedSegmentIds.forEach((id) => {
      toggleSegmentVisibility(id);
    });
  }, [selectedSegmentIds, toggleSegmentVisibility]);

  const handlePlaySelection = useCallback(() => {
    if (singleSelected) {
      setPlaybackTime(singleSelected.startTime);
      setPlaying(true);
    }
  }, [singleSelected, setPlaybackTime, setPlaying]);

  if (!hasSelection && clipboard.length === 0) return null;

  return (
    <div className={cn(
      'w-full overflow-x-auto scrollbar-thin border-t border-white/5 bg-black/40 backdrop-blur-md supports-[backdrop-filter]:bg-black/20 shrink-0 shadow-2xl',
      className
    )}>
      <div className="flex items-center gap-2 px-3 py-1 w-max min-w-full text-xs">
        {hasSelection && (
          <>
            <span className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-tight">
              {selectedCount} selected
            </span>

            <div className="h-4 w-px bg-border/50" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={handleDelete}>
                  <Trash2 size={13} className="mr-1.5 text-destructive/70" />
                  Delete
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete selected (Del)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={handleCopy}>
                  <Copy size={13} className="mr-1.5" />
                  Copy
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy (Ctrl+C)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={handleToggleVisibility}>
                  <EyeOff size={13} className="mr-1.5" />
                  Hide
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle visibility</TooltipContent>
            </Tooltip>

            <div className="h-4 w-px bg-border/50" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={() => handleShift(-1)}>
                  <ArrowLeft size={13} className="mr-1 text-primary/70" />
                  -1s
                </Button>
              </TooltipTrigger>
              <TooltipContent>Shift times back 1 second</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={() => handleShift(1)}>
                  <ArrowRight size={13} className="mr-1 text-primary/70" />
                  +1s
                </Button>
              </TooltipTrigger>
              <TooltipContent>Shift times forward 1 second</TooltipContent>
            </Tooltip>

            <div className="h-4 w-px bg-border/50" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  disabled={selectedCount === 0 || !aspectRatioConstraint}
                  onClick={() => {
                    saveState();
                    applyAspectRatioToSelected(aspectRatioConstraint);
                  }}
                >
                  <RectangleHorizontal size={13} className="mr-1.5 text-primary/70" />
                  Ratio
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {aspectRatioConstraint ? `Apply ${aspectRatioConstraint} to selected` : 'Select an aspect ratio first'}
              </TooltipContent>
            </Tooltip>

            <div className="h-4 w-px bg-border/50" />

            <BatchTimeMenu
              selectedCount={selectedCount}
              getAllSegmentsOrdered={getAllSegmentsOrdered}
              selectedSegmentIds={selectedSegmentIds}
              saveState={saveState}
              spaceEvenlySelected={spaceEvenlySelected}
              setDurationForSelected={setDurationForSelected}
              alignSelectedToGrid={alignSelectedToGrid}
            />

            {singleSelected && (
              <>
                <div className="h-4 w-px bg-border/50" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={handlePlaySelection}>
                      <Play size={13} className="mr-1.5 fill-primary text-primary" />
                      Preview
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Play this segment</TooltipContent>
                </Tooltip>
              </>
            )}

            <div className="h-4 w-px bg-border/50" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={deselectAll}>
                  <Square size={13} className="mr-1.5" />
                  Clear
                </Button>
              </TooltipTrigger>
              <TooltipContent>Deselect all (Esc)</TooltipContent>
            </Tooltip>
          </>
        )}

        {clipboard.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={handlePaste}>
                <ClipboardPaste size={13} className="mr-1.5 text-primary" />
                Paste ({clipboard.length})
              </Button>
            </TooltipTrigger>
            <TooltipContent>Paste (Ctrl+V)</TooltipContent>
          </Tooltip>
        )}

        <div className="flex-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={selectAll}>
              <CheckSquare size={13} className="mr-1.5" />
              Select All
            </Button>
          </TooltipTrigger>
          <TooltipContent>Select all (Ctrl+A)</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
});

SelectionToolbar.displayName = 'SelectionToolbar';
