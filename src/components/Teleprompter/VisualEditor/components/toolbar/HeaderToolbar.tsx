import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Save, FolderOpen, Play, Pause, Loader2, Keyboard, Cloud, CloudOff, RectangleHorizontal, Plus, Download, Upload, Home, FileText, Image, Settings, HelpCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ASPECT_RATIO_PRESETS } from '../../constants/aspectRatioPresets';
import type { SaveStatus } from '../../types/visualEditor.types';
import { cn } from '@/lib/utils';

const SaveStatusIndicator = ({ status, lastSaved }: { status: SaveStatus; lastSaved: number | null }) => {
  if (status === 'saving') {
    return (
      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
        <Loader2 size={10} className="animate-spin" /> Saving...
      </span>
    );
  }
  if (status === 'saved' && lastSaved) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1 cursor-default">
            <Cloud size={10} className="text-primary" /> Saved
          </span>
        </TooltipTrigger>
        <TooltipContent>Last saved: {new Date(lastSaved).toLocaleString()}</TooltipContent>
      </Tooltip>
    );
  }
  if (status === 'error') {
    return (
      <span className="text-[10px] text-destructive flex items-center gap-1">
        <CloudOff size={10} /> Save failed
      </span>
    );
  }
  return null;
};

const ProjectNameInput = ({ value, onSave }: { value: string; onSave: (v: string) => void }) => {
  const [temp, setTemp] = React.useState(value);

  React.useEffect(() => {
    setTemp(value);
  }, [value]);

  const handleBlur = () => {
    if (temp.trim() && temp !== value) {
      onSave(temp.trim());
    } else {
      setTemp(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setTemp(value);
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <Input
      value={temp}
      onChange={(e) => setTemp(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className="h-7 w-32 sm:w-40 text-sm min-w-0"
      placeholder="Project name"
    />
  );
};

interface HeaderToolbarProps {
  projectName: string;
  setProjectName: (v: string) => void;
  saveStatus: SaveStatus;
  lastSaved: number | null;
  isDirty: boolean;
  aspectRatioConstraint: string | null;
  customAspectRatio: { width: number; height: number };
  setAspectRatioConstraint: (v: string | null) => void;
  setCustomAspectRatio: (v: { width: number; height: number }) => void;
  hasHiddenSegments: boolean;
  canPlay: boolean;
  pagesLength: number;
  autoSaveEnabled: boolean;
  onAutoSaveChange: (enabled: boolean) => void;
  onShowShortcuts: () => void;
  onOpenSettings?: () => void;
  onGoHome?: () => void;
  onEditorTypeChange?: (type: 'text' | 'visual') => void;
  onCreateProject: () => void;
  onShowProjectList: () => void;
  onSave: () => void;
  onExport: () => void;
  onImport: () => void;
  onShowAllSegments: () => void;
  onPlay: () => void;
  isPlaying?: boolean;
  onPlayPause?: () => void;
}

export const HeaderToolbar = memo<HeaderToolbarProps>(({
  projectName,
  setProjectName,
  saveStatus,
  lastSaved,
  isDirty,
  aspectRatioConstraint,
  customAspectRatio,
  setAspectRatioConstraint,
  setCustomAspectRatio,
  hasHiddenSegments,
  canPlay,
  pagesLength,
  autoSaveEnabled,
  onAutoSaveChange,
  onShowShortcuts,
  onOpenSettings,
  onGoHome,
  onEditorTypeChange,
  onCreateProject,
  onShowProjectList,
  onSave,
  onExport,
  onImport,
  onShowAllSegments,
  onPlay,
  isPlaying = false,
  onPlayPause,
}) => (
  <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-3 py-1.5 border-b border-border bg-card/50 min-w-0">
    {/* Home + Text/Visual (merged from Secondary) */}
    {onGoHome && (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2 shrink-0" onClick={onGoHome}>
            <Home size={14} className="mr-1.5" />
            Home
          </Button>
        </TooltipTrigger>
        <TooltipContent>Return to Welcome Dashboard</TooltipContent>
      </Tooltip>
    )}
    {onEditorTypeChange && (
      <>
        {onGoHome && <div className="w-px h-5 bg-border shrink-0" />}
        <Tabs value="visual" onValueChange={(v) => onEditorTypeChange(v as 'text' | 'visual')}>
          <TabsList className="h-7 shrink-0">
            <TabsTrigger value="text" className="text-xs h-6 px-2">
              <FileText size={12} className="mr-1" /> Text
            </TabsTrigger>
            <TabsTrigger value="visual" className="text-xs h-6 px-2">
              <Image size={12} className="mr-1" /> Visual
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="w-px h-5 bg-border shrink-0" />
      </>
    )}
    {/* Project name + Save status */}
    <div className="flex items-center gap-1.5 shrink-0">
      <span className="text-xs text-muted-foreground hidden sm:inline">Project:</span>
      <ProjectNameInput value={projectName} onSave={setProjectName} />
      <SaveStatusIndicator status={saveStatus} lastSaved={lastSaved} />
      {isDirty && saveStatus === 'idle' && (
        <span className="text-[10px] px-1.5 py-0.5 bg-accent/20 text-accent rounded shrink-0">Unsaved</span>
      )}
    </div>
    <div className="w-px h-5 bg-border shrink-0" />
    {/* Aspect ratio */}
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1 shrink-0">
          <Select value={aspectRatioConstraint || 'free'} onValueChange={(val) => setAspectRatioConstraint(val === 'free' ? null : val)}>
            <SelectTrigger className="h-7 w-[72px] sm:w-20 text-xs gap-1 px-2">
              <RectangleHorizontal size={12} className="shrink-0 text-muted-foreground" />
              <SelectValue placeholder="Ratio" />
            </SelectTrigger>
            <SelectContent align="start">
              {ASPECT_RATIO_PRESETS.map((preset) => (
                <SelectItem key={preset.value} value={preset.value} className="text-xs">
                  <span className="font-medium">{preset.label}</span>
                  <span className="ml-2 text-muted-foreground">{preset.description}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {aspectRatioConstraint === 'custom' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] font-mono shrink-0">
                  {customAspectRatio.width}:{customAspectRatio.height}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-44 p-2" align="start">
                <p className="text-[10px] font-medium mb-2">Custom Ratio</p>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={customAspectRatio.width}
                    onChange={(e) => setCustomAspectRatio({ ...customAspectRatio, width: parseInt(e.target.value) || 1 })}
                    className="h-6 w-14 text-xs px-2"
                    min={1}
                  />
                  <span className="text-muted-foreground text-xs">:</span>
                  <Input
                    type="number"
                    value={customAspectRatio.height}
                    onChange={(e) => setCustomAspectRatio({ ...customAspectRatio, height: parseInt(e.target.value) || 1 })}
                    className="h-6 w-14 text-xs px-2"
                    min={1}
                  />
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom">Aspect ratio constraint for drawing</TooltipContent>
    </Tooltip>
    <div className="flex-1 min-w-2" />
    {/* File dropdown */}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 shrink-0">
          <FolderOpen size={14} className="mr-1" /> File
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onCreateProject}>
          <Plus size={14} className="mr-2" /> New Project
          <span className="ml-auto text-[10px] text-muted-foreground">Ctrl+N</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onShowProjectList}>
          <FolderOpen size={14} className="mr-2" /> Open Project...
          <span className="ml-auto text-[10px] text-muted-foreground">Ctrl+O</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem checked={autoSaveEnabled} onCheckedChange={(v) => onAutoSaveChange(v === true)}>
          Auto-save
        </DropdownMenuCheckboxItem>
        <DropdownMenuItem onClick={onSave}>
          <Save size={14} className="mr-2" /> Save
          <span className="ml-auto text-[10px] text-muted-foreground">Ctrl+S</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExport} disabled={pagesLength === 0}>
          <Download size={14} className="mr-2" /> Export...
          <span className="ml-auto text-[10px] text-muted-foreground">Ctrl+Shift+S</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onImport}>
          <Upload size={14} className="mr-2" /> Import...
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 shrink-0" onClick={onSave} disabled={saveStatus === 'saving' || pagesLength === 0}>
          {saveStatus === 'saving' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>Save (⌘S)</TooltipContent>
    </Tooltip>
    {hasHiddenSegments && (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 shrink-0" onClick={onShowAllSegments}>
            <Eye size={14} className="mr-1" /> Show Hidden
          </Button>
        </TooltipTrigger>
        <TooltipContent>Show all hidden segments</TooltipContent>
      </Tooltip>
    )}
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="default"
          size="sm"
          className="h-7 px-3 shrink-0"
          onClick={isPlaying && onPlayPause ? onPlayPause : onPlay}
          disabled={!canPlay}
        >
          {isPlaying && onPlayPause ? (
            <>
              <Pause size={14} className="mr-1" /> Pause
            </>
          ) : (
            <>
              <Play size={14} className="mr-1" /> Play
            </>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isPlaying ? 'Pause playback' : canPlay ? 'Start fullscreen playback' : 'Add segments to play'}
      </TooltipContent>
    </Tooltip>
    <div className="w-px h-5 bg-border shrink-0" />
    {onOpenSettings && (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onOpenSettings}>
            <Settings size={14} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Project Settings</TooltipContent>
      </Tooltip>
    )}
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onShowShortcuts}>
          <HelpCircle size={14} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Keyboard Shortcuts (?)</TooltipContent>
    </Tooltip>
  </div>
));

HeaderToolbar.displayName = 'HeaderToolbar';
