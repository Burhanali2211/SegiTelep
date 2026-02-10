import React, { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Home,
  Play,
  Pause,
  Settings,
  HelpCircle,
  FileText,
  Image,
  Loader2,
  Cloud,
  CloudOff,
  Save,
  CheckCircle,
  AlertCircle,
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
  isPlaying?: boolean;
  onPlayPause?: () => void;
  className?: string;
}

// Enhanced save status indicator component with better visual feedback
const SaveStatusIndicator = ({ status, lastSaved }: { status: SaveStatus; lastSaved: number | null }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  if (status === 'saving') {
    return (
      <Tooltip open={showTooltip} onOpenChange={setShowTooltip}>
        <TooltipTrigger asChild>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1 cursor-pointer">
            <Loader2 size={10} className="animate-spin text-blue-500" />
            <span className="animate-pulse">Saving...</span>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Saving your project...</p>
        </TooltipContent>
      </Tooltip>
    );
  }
  
  if (status === 'saved' && lastSaved) {
    const timeAgo = new Date(lastSaved).toLocaleTimeString();
    return (
      <Tooltip open={showTooltip} onOpenChange={setShowTooltip}>
        <TooltipTrigger asChild>
          <span className="text-[10px] text-green-600 flex items-center gap-1 cursor-pointer hover:bg-green-50 px-1 py-0.5 rounded transition-colors">
            <CheckCircle size={10} className="text-green-500" />
            <span>Saved</span>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Last saved: {timeAgo}</p>
        </TooltipContent>
      </Tooltip>
    );
  }
  
  if (status === 'error') {
    return (
      <Tooltip open={showTooltip} onOpenChange={setShowTooltip}>
        <TooltipTrigger asChild>
          <span className="text-[10px] text-destructive flex items-center gap-1 cursor-pointer hover:bg-destructive/10 px-1 py-0.5 rounded transition-colors">
            <AlertCircle size={10} className="text-red-500" />
            <span>Save failed</span>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Failed to save. Please try again.</p>
        </TooltipContent>
      </Tooltip>
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
  isPlaying = false,
  onPlayPause,
  className,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async () => {
    if (isSaving || !hasUnsavedChanges) return;
    
    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      await onSave();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

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
            className="h-7 px-2 hover:bg-accent/50 transition-colors"
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
          value={typeof projectName === 'string' ? projectName : ''}
          onChange={(e) => onProjectNameChange(e.target.value)}
          className="h-7 w-44 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
          placeholder="Project name"
        />
        
        {/* Enhanced Save status */}
        <SaveStatusIndicator status={saveStatus} lastSaved={lastSaved} />
        
        {/* Unsaved indicator with better styling */}
        {hasUnsavedChanges && saveStatus === 'idle' && (
          <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded border border-amber-200 dark:border-amber-800 animate-pulse">
            Unsaved
          </span>
        )}
      </div>
      
      <div className="w-px h-5 bg-border mx-2" />
      
      {/* Mode Switcher with better visual feedback */}
      <Tabs value={editorType} onValueChange={(v) => onEditorTypeChange(v as 'text' | 'visual')}>
        <TabsList className="h-7 bg-muted/50">
          <TabsTrigger 
            value="text" 
            className="text-xs h-6 px-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            <FileText size={12} className="mr-1" />
            Text
          </TabsTrigger>
          <TabsTrigger 
            value="visual" 
            className="text-xs h-6 px-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            <Image size={12} className="mr-1" />
            Visual
          </TabsTrigger>
        </TabsList>
      </Tabs>
      
      {/* Spacer */}
      <div className="flex-1" />
      
      {/* Enhanced Quick Actions */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn(
                "h-7 px-2 transition-all hover:bg-accent/50",
                isSaving && "animate-pulse",
                saveSuccess && "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
              )}
              onClick={handleSave}
              disabled={!hasUnsavedChanges || isSaving}
            >
              {isSaving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : saveSuccess ? (
                <CheckCircle size={14} />
              ) : (
                <Save size={14} />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save (⌘S)'}
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isPlaying ? "secondary" : "default"}
              size="sm"
              className={cn(
                "h-7 px-3 transition-all",
                isPlaying && "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50",
                !canPlay && "opacity-50 cursor-not-allowed"
              )}
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
            {isPlaying ? 'Pause playback (Space)' : 'Start Playback (F)'}
          </TooltipContent>
        </Tooltip>
        
        <div className="w-px h-5 bg-border mx-1" />
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 hover:bg-accent/50 transition-colors"
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
              className="h-7 w-7 hover:bg-accent/50 transition-colors"
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
