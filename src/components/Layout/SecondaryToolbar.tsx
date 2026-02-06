import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Home,
  Play,
  Settings,
  HelpCircle,
  FileText,
  Image,
  Loader2,
  Cloud,
  CloudOff,
  Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface SecondaryToolbarProps {
  projectName: string;
  onProjectNameChange: (name: string) => void;
  hasUnsavedChanges: boolean;
  saveStatus: SaveStatus;
  lastSaved: number | null;
  editorType: 'text' | 'visual';
  onEditorTypeChange: (type: 'text' | 'visual') => void;
  onGoHome: () => void;
  onPlay: () => void;
  onSave: () => void;
  onOpenSettings: () => void;
  onOpenShortcuts: () => void;
  canPlay?: boolean;
  className?: string;
}

// Save status indicator component
const SaveStatusIndicator = ({ status, lastSaved }: { status: SaveStatus; lastSaved: number | null }) => {
  if (status === 'saving') {
    return (
      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
        <Loader2 size={10} className="animate-spin" />
        Saving...
      </span>
    );
  }
  
  if (status === 'saved' && lastSaved) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1 cursor-default">
            <Cloud size={10} className="text-primary" />
            Saved
          </span>
        </TooltipTrigger>
        <TooltipContent>
          Last saved: {new Date(lastSaved).toLocaleString()}
        </TooltipContent>
      </Tooltip>
    );
  }
  
  if (status === 'error') {
    return (
      <span className="text-[10px] text-destructive flex items-center gap-1">
        <CloudOff size={10} />
        Save failed
      </span>
    );
  }
  
  return null;
};

export const SecondaryToolbar = memo<SecondaryToolbarProps>(({
  projectName,
  onProjectNameChange,
  hasUnsavedChanges,
  saveStatus,
  lastSaved,
  editorType,
  onEditorTypeChange,
  onGoHome,
  onPlay,
  onSave,
  onOpenSettings,
  onOpenShortcuts,
  canPlay = true,
  className,
}) => {
  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-1.5 border-b border-border bg-card/50',
      className
    )}>
      {/* Home Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 px-2"
            onClick={onGoHome}
          >
            <Home size={16} className="mr-1.5" />
            Home
          </Button>
        </TooltipTrigger>
        <TooltipContent>Return to Welcome Dashboard</TooltipContent>
      </Tooltip>
      
      <div className="w-px h-5 bg-border" />
      
      {/* Project Name */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Project:</span>
        <Input
          value={projectName}
          onChange={(e) => onProjectNameChange(e.target.value)}
          className="h-7 w-44 text-sm"
          placeholder="Project name"
        />
        
        {/* Save status */}
        <SaveStatusIndicator status={saveStatus} lastSaved={lastSaved} />
        
        {/* Unsaved indicator */}
        {hasUnsavedChanges && saveStatus === 'idle' && (
          <span className="text-[10px] px-1.5 py-0.5 bg-accent/20 text-accent rounded">
            Unsaved
          </span>
        )}
      </div>
      
      <div className="w-px h-5 bg-border mx-2" />
      
      {/* Mode Switcher */}
      <Tabs value={editorType} onValueChange={(v) => onEditorTypeChange(v as 'text' | 'visual')}>
        <TabsList className="h-7">
          <TabsTrigger value="text" className="text-xs h-6 px-2.5">
            <FileText size={12} className="mr-1" />
            Text
          </TabsTrigger>
          <TabsTrigger value="visual" className="text-xs h-6 px-2.5">
            <Image size={12} className="mr-1" />
            Visual
          </TabsTrigger>
        </TabsList>
      </Tabs>
      
      {/* Spacer */}
      <div className="flex-1" />
      
      {/* Quick Actions */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 px-2"
              onClick={onSave}
              disabled={!hasUnsavedChanges}
            >
              <Save size={14} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Save (⌘S)</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="default" 
              size="sm" 
              className="h-7 px-3"
              onClick={onPlay}
              disabled={!canPlay}
            >
              <Play size={14} className="mr-1" />
              Play
            </Button>
          </TooltipTrigger>
          <TooltipContent>Start Playback (F)</TooltipContent>
        </Tooltip>
        
        <div className="w-px h-5 bg-border mx-1" />
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={onOpenSettings}
            >
              <Settings size={14} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Project Settings</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={onOpenShortcuts}
            >
              <HelpCircle size={14} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Keyboard Shortcuts (?)</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
});

SecondaryToolbar.displayName = 'SecondaryToolbar';
