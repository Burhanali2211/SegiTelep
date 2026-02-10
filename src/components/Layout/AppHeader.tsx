import React, { memo, useState } from 'react';
import { MainMenuBar } from './MainMenuBar';
import { SaveStatus } from './SecondaryToolbar';
import { Menu, X, Play, Pause, Save, Home, Settings, HelpCircle, FileText, Image, Loader2, CheckCircle, AlertCircle, Edit3, ChevronDown, Clock, Music, Timer, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AppLogo } from './AppLogo';

// Editable Project Name Component
const EditableProjectName = memo<{ 
  projectName: string; 
  onProjectNameChange: (name: string) => void;
}>(({ projectName, onProjectNameChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(projectName);

  React.useEffect(() => {
    setTempName(projectName);
  }, [projectName]);

  const handleSave = () => {
    if (tempName.trim() && tempName !== projectName) {
      onProjectNameChange(tempName.trim());
    } else {
      setTempName(projectName);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempName(projectName);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          value={tempName}
          onChange={(e) => setTempName(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="h-7 w-44 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
          placeholder="Project name"
          autoFocus
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Project:</span>
      <div 
        className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted/50 cursor-pointer transition-colors group min-w-0 max-w-44"
        onClick={() => setIsEditing(true)}
        title="Click to edit project name"
      >
        <span className="text-sm truncate flex-1 min-w-0">{projectName || 'Untitled Project'}</span>
        <Edit3 size={12} className="text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
      </div>
    </div>
  );
});

// Enhanced Play Button with Teleprompter Settings
const EnhancedPlayButton = memo<{
  canPlay: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onPlayPause?: () => void;
  onOpenCountdown: () => void;
  onOpenAudioManager?: () => void;
  onOpenTimerCalculator: () => void;
  onOpenPlayerIndicatorSettings?: () => void;
}>(({ 
  canPlay, 
  isPlaying, 
  onPlay, 
  onPlayPause, 
  onOpenCountdown, 
  onOpenAudioManager, 
  onOpenTimerCalculator,
  onOpenPlayerIndicatorSettings 
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="default" 
          size="sm" 
          className="h-7 px-3 gap-1 transition-all hover:scale-105 active:scale-95"
          disabled={!canPlay}
        >
          {isPlaying && onPlayPause ? (
            <>
              <div className="w-1.5 h-1.5 bg-current rounded-full animate-pulse" />
              Pause
            </>
          ) : (
            <>
              <Play size={12} />
              Play
            </>
          )}
          <ChevronDown size={10} className="opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onPlay}>
          <Play size={14} className="mr-2" />
          {isPlaying ? 'Restart Playback' : 'Start Playback'}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={onOpenCountdown}>
          <Clock size={14} className="mr-2" />
          Countdown Settings
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={onOpenTimerCalculator}>
          <Timer size={14} className="mr-2" />
          Timer Calculator
        </DropdownMenuItem>
        
        {onOpenAudioManager && (
          <DropdownMenuItem onClick={onOpenAudioManager}>
            <Music size={14} className="mr-2" />
            Audio Manager
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={onOpenPlayerIndicatorSettings}>
          <Eye size={14} className="mr-2" />
          Player Indicator Settings
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

EnhancedPlayButton.displayName = 'EnhancedPlayButton';
const SaveStatusIndicator = ({ status, lastSaved }: { status: SaveStatus; lastSaved: number | null }) => {
  if (status === 'saving') {
    return (
      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
        <Loader2 size={10} className="animate-spin text-blue-500" />
        <span className="animate-pulse">Saving...</span>
      </span>
    );
  }
  
  if (status === 'saved' && lastSaved) {
    const timeAgo = new Date(lastSaved).toLocaleTimeString();
    return (
      <Tooltip>
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
      <Tooltip>
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

interface AppHeaderProps {
  // Project state
  projectName: string;
  onProjectNameChange: (name: string) => void;
  hasUnsavedChanges: boolean;
  saveStatus: SaveStatus;
  lastSaved: number | null;
  
  // Editor mode
  editorType: 'text' | 'visual';
  onEditorTypeChange: (type: 'text' | 'visual') => void;
  
  // Actions
  onNewProject: () => void;
  onOpenProject: () => void;
  onSave: () => void;
  onExport: () => void;
  onImport: () => void;
  onOpenSettings: () => void;
  onOpenShortcuts: () => void;
  onOpenStatistics: () => void;
  onOpenCountdown: () => void;
  onOpenAbout: () => void;
  onOpenAudioManager?: () => void;
  onOpenRemoteControl?: () => void;
  onOpenVoiceInput?: () => void;
  onOpenTimerCalculator: () => void;
  onOpenTemplates: () => void;
  onExportPDF: () => void;
  onOpenExternalDisplay: () => void;
  onPlay: () => void;
  onGoHome: () => void;
  onToggleDevConsole?: () => void;
  onOpenPlayerIndicatorSettings?: () => void;
  
  // Recent projects
  recentProjects?: Array<{ id: string; name: string }>;
  onOpenRecentProject?: (id: string) => void;
  
  // Playback state
  canPlay?: boolean;
  isPlaying?: boolean;
  onPlayPause?: () => void;
  
  className?: string;
}

export const AppHeader = memo<AppHeaderProps>(({
  projectName,
  onProjectNameChange,
  hasUnsavedChanges,
  saveStatus,
  lastSaved,
  editorType,
  onEditorTypeChange,
  onNewProject,
  onOpenProject,
  onSave,
  onExport,
  onImport,
  onOpenSettings,
  onOpenShortcuts,
  onOpenStatistics,
  onOpenCountdown,
  onOpenAbout,
  onOpenAudioManager,
  onOpenRemoteControl,
  onOpenVoiceInput,
  onOpenTimerCalculator,
  onOpenTemplates,
  onExportPDF,
  onOpenExternalDisplay,
  onPlay,
  onGoHome,
  onToggleDevConsole,
  onOpenPlayerIndicatorSettings,
  recentProjects = [],
  onOpenRecentProject,
  canPlay = true,
  isPlaying = false,
  onPlayPause,
  className,
}) => {
  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className={cn('flex flex-col border-b border-border bg-card', className)}>
      {/* Consolidated Desktop Header */}
      <div className="hidden sm:flex items-center h-12 px-3 border-b border-border/50">
        {/* Logo */}
        <AppLogo size="md" textSize="base" className="mr-4" />
        
        {/* Menu Bar */}
        <MainMenuBar
          onNewProject={onNewProject}
          onOpenProject={onOpenProject}
          onSave={onSave}
          onExport={onExport}
          onImport={onImport}
          onOpenSettings={onOpenSettings}
          onOpenShortcuts={onOpenShortcuts}
          onOpenStatistics={onOpenStatistics}
          onOpenCountdown={onOpenCountdown}
          onOpenAbout={onOpenAbout}
          onOpenAudioManager={onOpenAudioManager}
          onOpenRemoteControl={onOpenRemoteControl}
          onOpenVoiceInput={onOpenVoiceInput}
          onOpenTimerCalculator={onOpenTimerCalculator}
          onOpenTemplates={onOpenTemplates}
          onExportPDF={onExportPDF}
          onOpenExternalDisplay={onOpenExternalDisplay}
          onPlay={onPlay}
          onGoHome={onGoHome}
          onToggleDevConsole={onToggleDevConsole}
          recentProjects={recentProjects}
          onOpenRecentProject={onOpenRecentProject}
          editorType={editorType}
          onEditorTypeChange={onEditorTypeChange}
        />
        
        {/* Spacer */}
        <div className="flex-1" />
        
        {/* Project Controls Section */}
        <div className="flex items-center gap-3 mr-4">
          {/* Editable Project Name */}
          <EditableProjectName 
            projectName={typeof projectName === 'string' ? projectName : ''}
            onProjectNameChange={onProjectNameChange}
          />
          
          {/* Save status */}
          <SaveStatusIndicator status={saveStatus} lastSaved={lastSaved} />
          
          {/* Unsaved indicator */}
          {hasUnsavedChanges && saveStatus === 'idle' && (
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded border border-amber-200 dark:border-amber-800 animate-pulse">
              Unsaved
            </span>
          )}
        </div>
        
        {/* Quick Actions */}
        <div className="flex items-center gap-1">
          {/* Save Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2 transition-all hover:bg-accent/50"
                onClick={onSave}
                disabled={!hasUnsavedChanges}
              >
                <Save size={12} className="mr-1" />
                Save
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {hasUnsavedChanges ? 'Save project (Ctrl+S)' : 'No changes to save'}
            </TooltipContent>
          </Tooltip>
          
          {/* Enhanced Play Button with Teleprompter Settings */}
          <EnhancedPlayButton
            canPlay={canPlay}
            isPlaying={isPlaying}
            onPlay={onPlay}
            onPlayPause={onPlayPause}
            onOpenCountdown={onOpenCountdown}
            onOpenAudioManager={onOpenAudioManager}
            onOpenTimerCalculator={onOpenTimerCalculator}
            onOpenPlayerIndicatorSettings={onOpenPlayerIndicatorSettings}
          />
        </div>
      </div>
      
      {/* Mobile Header - Enhanced with project controls */}
      <div className="sm:hidden flex flex-col border-b border-border/50">
        {/* Top Mobile Bar */}
        <div className="flex items-center justify-between h-10 px-3">
          {/* Logo and Mobile Menu */}
          <div className="flex items-center gap-3">
            {/* Mobile Menu Trigger */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Menu size={16} />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <div className="flex flex-col h-full">
                  {/* Mobile Menu Header */}
                  <div className="flex items-center justify-between p-4 border-b">
                    <AppLogo size="md" textSize="base" />
                    <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                      <X size={18} />
                    </Button>
                  </div>
                  
                  {/* Mobile Menu Content */}
                  <div className="flex-1 overflow-y-auto">
                    <MainMenuBar
                      onNewProject={onNewProject}
                      onOpenProject={onOpenProject}
                      onSave={onSave}
                      onExport={onExport}
                      onImport={onImport}
                      onOpenSettings={onOpenSettings}
                      onOpenShortcuts={onOpenShortcuts}
                      onOpenStatistics={onOpenStatistics}
                      onOpenCountdown={onOpenCountdown}
                      onOpenAbout={onOpenAbout}
                      onOpenAudioManager={onOpenAudioManager}
                      onOpenRemoteControl={onOpenRemoteControl}
                      onOpenVoiceInput={onOpenVoiceInput}
                      onOpenTimerCalculator={onOpenTimerCalculator}
                      onOpenTemplates={onOpenTemplates}
                      onExportPDF={onExportPDF}
                      onOpenExternalDisplay={onOpenExternalDisplay}
                      onPlay={onPlay}
                      onGoHome={onGoHome}
                      onToggleDevConsole={onToggleDevConsole}
                      recentProjects={recentProjects}
                      onOpenRecentProject={onOpenRecentProject}
                      editorType={editorType}
                      onEditorTypeChange={onEditorTypeChange}
                    />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            
            {/* Logo - Mobile */}
            <AppLogo size="sm" textSize="sm" />
          </div>
          
          {/* Mobile Quick Actions */}
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={onSave}
              disabled={!hasUnsavedChanges}
            >
              <Save size={14} />
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              className="h-7 px-2"
              onClick={onPlay}
              disabled={!canPlay}
            >
              {isPlaying && onPlayPause ? (
                <Pause size={12} />
              ) : (
                <Play size={12} />
              )}
            </Button>
          </div>
        </div>
        
        {/* Mobile Project Bar */}
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/30">
          <div className="flex-1 min-w-0">
            <EditableProjectName 
              projectName={typeof projectName === 'string' ? projectName : ''}
              onProjectNameChange={onProjectNameChange}
            />
          </div>
          
          {/* Mobile Save Status */}
          <SaveStatusIndicator status={saveStatus} lastSaved={lastSaved} />
        </div>
      </div>
    </header>
  );
});

AppHeader.displayName = 'AppHeader';
