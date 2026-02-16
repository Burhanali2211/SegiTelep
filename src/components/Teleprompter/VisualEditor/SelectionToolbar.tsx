import React, { memo, useCallback } from 'react';
import { useVisualEditorState } from './useVisualEditorState';
import { parseTime, formatDuration } from './utils/formatTime';
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
  Plus,
  Minus,
  Palette,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface BatchTimeMenuProps {
  selectedCount: number;
  getAllSegmentsOrdered: () => { id: string; startTime: number; endTime: number }[];
  selectedSegmentIds: Set<string>;
  saveState: () => void;
  spaceEvenlySelected: (start: number, end: number) => void;
  setDurationForSelected: (duration: number) => void;
  alignSelectedToGrid: (gridSeconds: number) => void;
  defaultDuration: number;
  setDefaultDuration: (duration: number) => void;
}

const BatchTimeMenu = memo(({ selectedCount, getAllSegmentsOrdered, selectedSegmentIds, saveState, spaceEvenlySelected, setDurationForSelected, alignSelectedToGrid, defaultDuration, setDefaultDuration }: BatchTimeMenuProps) => {
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
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-[10px] hover:bg-primary/10 transition-colors"
              >
                <Timer size={12} className="mr-1 text-primary" />
                {formatDuration(defaultDuration)}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Duration Settings & Apply to Selected</TooltipContent>
        </Tooltip>
        <PopoverContent side="top" className="w-56 p-3 bg-sidebar/95 backdrop-blur-xl border-white/10 shadow-2xl">
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">New Segment Duration</h4>
              <div
                className="flex items-center justify-between gap-2 p-1.5 bg-background/50 rounded-lg border border-white/5 select-none"
                onWheel={(e) => {
                  e.stopPropagation();
                  const delta = e.deltaY < 0 ? 1 : -1;
                  setDefaultDuration(Math.max(1, defaultDuration + delta));
                }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setDefaultDuration(Math.max(1, defaultDuration - 1))}
                >
                  <Minus size={12} />
                </Button>
                <div
                  className="flex-1 text-center cursor-text"
                  onDoubleClick={() => {
                    const val = window.prompt("Set default duration (e.g. 10 or 1.30):", formatDuration(defaultDuration).replace('s', ''));
                    if (val !== null) {
                      const num = parseTime(val);
                      if (!isNaN(num)) setDefaultDuration(Math.max(1, num));
                    }
                  }}
                >
                  <span className="text-sm font-mono font-black text-primary">{formatDuration(defaultDuration)}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setDefaultDuration(defaultDuration + 1)}
                >
                  <Plus size={12} />
                </Button>
              </div>
            </div>

            <div className="h-px bg-white/5" />

            <Button
              variant="secondary"
              size="sm"
              className="w-full text-[10px] font-bold h-8"
              disabled={selectedCount === 0}
              onClick={() => {
                saveState();
                setDurationForSelected(defaultDuration);
              }}
            >
              Apply to Selected ({selectedCount})
            </Button>
          </div>
        </PopoverContent>
      </Popover>
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

const ColorPickerMenu = memo(({ selectedCount, onSelect, saveState }: { selectedCount: number, onSelect: (color: string | null) => void, saveState: () => void }) => {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" disabled={selectedCount === 0}>
              <Palette size={13} className="mr-1.5 text-primary/70" />
              Color
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Change segment border color</TooltipContent>
      </Tooltip>
      <PopoverContent side="top" className="w-48 p-2 bg-sidebar/95 backdrop-blur-xl border-white/10 shadow-2xl">
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
                onSelect(c.value);
              }}
              title={c.name}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
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
  const defaultDuration = useVisualEditorState((s) => s.defaultDuration);
  const setDefaultDuration = useVisualEditorState((s) => s.setDefaultDuration);
  const aspectRatioConstraint = useVisualEditorState((s) => s.aspectRatioConstraint);
  const applyAspectRatioToSelected = useVisualEditorState((s) => s.applyAspectRatioToSelected);
  const toggleSegmentVisibility = useVisualEditorState((s) => s.toggleSegmentVisibility);
  const setPlaybackTime = useVisualEditorState((s) => s.setPlaybackTime);
  const setPlaying = useVisualEditorState((s) => s.setPlaying);
  const setSelectedSegmentsColor = useVisualEditorState((s) => s.setSelectedSegmentsColor);

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
      'w-full overflow-x-auto scrollbar-thin border-t border-white/5 bg-[#0a0a0c] shrink-0 shadow-2xl',
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

            <ColorPickerMenu
              selectedCount={selectedCount}
              onSelect={setSelectedSegmentsColor}
              saveState={saveState}
            />

            <div className="h-4 w-px bg-border/50" />

            <BatchTimeMenu
              selectedCount={selectedCount}
              getAllSegmentsOrdered={getAllSegmentsOrdered}
              selectedSegmentIds={selectedSegmentIds}
              saveState={saveState}
              spaceEvenlySelected={spaceEvenlySelected}
              setDurationForSelected={setDurationForSelected}
              alignSelectedToGrid={alignSelectedToGrid}
              defaultDuration={defaultDuration}
              setDefaultDuration={setDefaultDuration}
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
