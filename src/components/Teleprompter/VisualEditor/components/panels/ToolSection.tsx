import React, { memo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MousePointer2, PenTool, Link2, Link2Off, ZoomIn, ZoomOut, Maximize2, Undo2, Redo2, Copy, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUndoRedo } from '../../useUndoRedo';

interface ToolButtonProps {
  active?: boolean;
  onClick: () => void;
  icon: React.ElementType;
  tooltip: string;
  shortcut?: string;
  variant?: 'default' | 'accent';
}

const ToolButton = memo(({ active, onClick, icon: Icon, tooltip, shortcut, variant = 'default' }: ToolButtonProps) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        onClick={onClick}
        className={cn(
          'relative flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200',
          'hover:scale-105 active:scale-95',
          active
            ? variant === 'accent'
              ? 'bg-accent text-accent-foreground shadow-md shadow-accent/25'
              : 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
            : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <Icon size={16} strokeWidth={1.5} />
      </button>
    </TooltipTrigger>
    <TooltipContent side="right" className="flex items-center gap-2">
      {tooltip}
      {shortcut && <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded font-mono">{shortcut}</kbd>}
    </TooltipContent>
  </Tooltip>
));

interface ToolSectionProps {
  isDrawing: boolean;
  chainTimesMode: boolean;
  zoom: number;
  selectedSegmentIds: Set<string>;
  setDrawing: (v: boolean) => void;
  toggleChainMode: () => void;
  setZoom: (z: number) => void;
  resetView: () => void;
  copySelected: () => void;
  deleteSegments: (ids: string[]) => void;
}

export const ToolSection = memo<ToolSectionProps>(({
  isDrawing,
  chainTimesMode,
  zoom,
  selectedSegmentIds,
  setDrawing,
  toggleChainMode,
  setZoom,
  resetView,
  copySelected,
  deleteSegments,
}) => {
  const { undo, redo, canUndo, canRedo, saveState } = useUndoRedo();

  const handleDeleteSelected = () => {
    if (selectedSegmentIds.size > 0) {
      saveState();
      deleteSegments(Array.from(selectedSegmentIds));
    }
  };

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-center gap-1.5">
        <ToolButton active={!isDrawing} onClick={() => setDrawing(false)} icon={MousePointer2} tooltip="Select" shortcut="Esc" />
        <ToolButton active={isDrawing} onClick={() => setDrawing(true)} icon={PenTool} tooltip="Draw Region" shortcut="N" />
        <ToolButton active={chainTimesMode} onClick={toggleChainMode} icon={chainTimesMode ? Link2 : Link2Off} tooltip={chainTimesMode ? 'Chain Mode ON' : 'Chain Mode OFF'} variant="accent" />
      </div>

      <div className="flex items-center gap-1 p-1.5 bg-muted/30 rounded-lg">
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={() => setZoom(zoom - 0.25)} disabled={zoom <= 0.5} className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-30 transition-colors">
              <ZoomOut size={14} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Zoom Out (-)</TooltipContent>
        </Tooltip>
        <div className="flex-1 text-center">
          <span className="text-xs font-medium tabular-nums">{Math.round(zoom * 100)}%</span>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={() => setZoom(zoom + 0.25)} disabled={zoom >= 4} className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-30 transition-colors">
              <ZoomIn size={14} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Zoom In (+)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={resetView} className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              <Maximize2 size={14} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Fit to View</TooltipContent>
        </Tooltip>
      </div>
      <div className="flex items-center gap-1">
        {[0.5, 1, 2].map((preset) => (
          <Tooltip key={preset}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setZoom(preset)}
                className={cn(
                  'flex-1 h-6 rounded text-[10px] font-medium',
                  Math.abs(zoom - preset) < 0.05 ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {preset * 100}%
              </button>
            </TooltipTrigger>
            <TooltipContent>Zoom to {preset * 100}%</TooltipContent>
          </Tooltip>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={undo} disabled={!canUndo} className={cn('flex-1 flex items-center justify-center gap-1.5 h-8 rounded-md text-xs font-medium transition-all', canUndo ? 'text-muted-foreground hover:text-foreground hover:bg-muted/50' : 'text-muted-foreground/30')}>
              <Undo2 size={14} /> Undo
            </button>
          </TooltipTrigger>
          <TooltipContent>Ctrl+Z</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={redo} disabled={!canRedo} className={cn('flex-1 flex items-center justify-center gap-1.5 h-8 rounded-md text-xs font-medium transition-all', canRedo ? 'text-muted-foreground hover:text-foreground hover:bg-muted/50' : 'text-muted-foreground/30')}>
              <Redo2 size={14} /> Redo
            </button>
          </TooltipTrigger>
          <TooltipContent>Ctrl+Shift+Z</TooltipContent>
        </Tooltip>
      </div>

      {selectedSegmentIds.size > 0 && (
        <div className="flex items-center gap-2 p-2 bg-primary/10 border border-primary/20 rounded-lg animate-in fade-in slide-in-from-top-1 duration-200">
          <span className="flex-1 text-xs font-medium text-primary">{selectedSegmentIds.size} selected</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => copySelected()} className="flex items-center justify-center w-7 h-7 rounded-md text-primary hover:bg-primary/20 transition-colors">
                <Copy size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Copy (Ctrl+C)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={handleDeleteSelected} className="flex items-center justify-center w-7 h-7 rounded-md text-destructive hover:bg-destructive/20 transition-colors">
                <Trash2 size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  );
});

ToolSection.displayName = 'ToolSection';
