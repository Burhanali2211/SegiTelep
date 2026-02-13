import React, { memo, useState, useCallback, useMemo } from 'react';
import { MainMenuBar } from './MainMenuBar';
import { SaveStatus } from '@/types/teleprompter.types';
import {
  X,
  Play,
  Pause,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Edit3,
  ChevronDown,
  Clock,
  Music,
  Timer,
  Eye,
  Circle,
  Check,
  User,
  LogOut,
  Bell,
  Settings as SettingsIcon,
  CreditCard
} from 'lucide-react';
import { useUserStore } from '@/store/userStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AppLogo } from './AppLogo';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { AspectRatioSelector } from '@/components/Teleprompter/VisualEditor/components/toolbar/AspectRatioSelector';

// Editable Project Name Component - Enhanced
const EditableProjectName = memo<{
  projectName: string;
  onProjectNameChange: (name: string) => void;
}>(({ projectName, onProjectNameChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(projectName);

  React.useEffect(() => {
    setTempName(projectName);
  }, [projectName]);

  const handleSave = useCallback(() => {
    if (tempName.trim() && tempName !== projectName) {
      onProjectNameChange(tempName.trim());
    } else {
      setTempName(projectName);
    }
    setIsEditing(false);
  }, [tempName, projectName, onProjectNameChange]);

  const handleCancel = useCallback(() => {
    setTempName(projectName);
    setIsEditing(false);
  }, [projectName]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  }, [handleSave, handleCancel]);

  if (isEditing) {
    return (
      <div className="flex items-center gap-1.5 animate-in fade-in-0 zoom-in-95 duration-150">
        <Input
          value={tempName}
          onChange={(e) => setTempName(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="h-7 w-48 text-sm font-medium bg-background border-primary/50 focus-visible:ring-primary/30 focus-visible:border-primary transition-all shadow-sm"
          placeholder="Enter project name"
          autoFocus
          maxLength={50}
        />
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-green-500/10 hover:text-green-600"
            onClick={handleSave}
          >
            <Check size={12} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
            onClick={handleCancel}
          >
            <X size={12} />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-accent/50 cursor-pointer transition-all duration-200 group border border-transparent hover:border-border/50 min-w-0 max-w-56"
          onClick={() => setIsEditing(true)}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Project:</span>
            <span className="text-sm font-semibold truncate text-foreground/90">
              {projectName || 'Untitled Project'}
            </span>
          </div>
          <Edit3
            size={11}
            className="text-muted-foreground/50 group-hover:text-primary transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
          />
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        Click to rename project
      </TooltipContent>
    </Tooltip>
  );
});

EditableProjectName.displayName = 'EditableProjectName';



// Save Status Indicator - Enhanced
const SaveStatusIndicator = memo<{
  status: SaveStatus;
  lastSaved: number | null;
}>(({ status, lastSaved }) => {
  const getTimeAgo = useCallback((timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return new Date(timestamp).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  if (status === 'saving') {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20">
        <Loader2 size={11} className="animate-spin text-blue-600 dark:text-blue-400" />
        <span className="text-[10px] text-blue-700 dark:text-blue-400 font-semibold">Saving...</span>
      </div>
    );
  }

  if (status === 'saved' && lastSaved) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20 cursor-pointer hover:bg-green-500/20 transition-colors">
            <CheckCircle size={11} className="text-green-600 dark:text-green-400" />
            <span className="text-[10px] text-green-700 dark:text-green-400 font-semibold">
              Saved {getTimeAgo(lastSaved)}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <p>Last saved: {new Date(lastSaved).toLocaleString()}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (status === 'error') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 border border-red-500/20 cursor-pointer hover:bg-red-500/20 transition-colors">
            <AlertCircle size={11} className="text-red-600 dark:text-red-400" />
            <span className="text-[10px] text-red-700 dark:text-red-400 font-semibold">Save failed</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <p>Failed to save. Click to retry.</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return null;
});

SaveStatusIndicator.displayName = 'SaveStatusIndicator';

interface AppHeaderProps {
  projectName: string;
  onProjectNameChange: (name: string) => void;
  hasUnsavedChanges: boolean;
  saveStatus: SaveStatus;
  lastSaved: number | null;
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
  onOpenPlayerIndicatorSettings?: () => void;
  recentProjects?: Array<{ id: string; name: string }>;
  onOpenRecentProject?: (id: string) => void;
  canPlay?: boolean;
  isPlaying?: boolean;
  onPlayPause?: () => void;
  onNavigate?: (section: string) => void;
  className?: string;
}



export const AppHeader = memo<AppHeaderProps>(({
  projectName,
  onProjectNameChange,
  hasUnsavedChanges,
  saveStatus,
  lastSaved,
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
  onOpenPlayerIndicatorSettings,
  recentProjects = [],
  onOpenRecentProject,
  canPlay = true,
  isPlaying = false,
  onPlayPause,
  onNavigate,
  className,
}) => {

  const user = useUserStore((s) => s.user);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const safeProjectName = useMemo(() =>
    typeof projectName === 'string' ? projectName : 'Untitled Project',
    [projectName]
  );

  const handleSaveClick = useCallback(() => {
    if (hasUnsavedChanges) {
      onSave();
    }
  }, [hasUnsavedChanges, onSave]);

  return (
    <header className={cn(
      'flex flex-col border-b border-border/50 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80',
      className
    )}>
      {/* Desktop Header */}
      <div className="hidden lg:flex items-center h-14 px-4 gap-4">
        {/* Left Section: Logo + Menu */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <SidebarTrigger className="h-8 w-8 hover:bg-accent/50 transition-colors" />
          <AppLogo size="md" textSize="base" className="select-none" />

          <div className="w-px h-6 bg-border/50" />

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
            recentProjects={recentProjects}
            onOpenRecentProject={onOpenRecentProject}
          />
        </div>

        {/* Center Section: Project Info */}
        <div className="flex items-center gap-3 flex-1 justify-center min-w-0">
          <EditableProjectName
            projectName={safeProjectName}
            onProjectNameChange={onProjectNameChange}
          />

          {/* Status Indicators */}
          <div className="flex items-center gap-2">
            <SaveStatusIndicator status={saveStatus} lastSaved={lastSaved} />

            {hasUnsavedChanges && saveStatus === 'idle' && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 animate-pulse">
                <Circle size={6} className="text-amber-600 dark:text-amber-400 fill-current" />
                <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">
                  Unsaved
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Section: Actions */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
          <>
            <div>
              <AspectRatioSelector />
            </div>
            <div className="w-px h-6 bg-border/50" />
          </>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 px-3 gap-1.5 font-medium transition-all shadow-sm hidden sm:flex",
                  hasUnsavedChanges
                    ? "border-primary/50 bg-primary/5 hover:bg-primary/10 text-primary hover:text-primary"
                    : "opacity-50 cursor-not-allowed"
                )}
                onClick={handleSaveClick}
                disabled={!hasUnsavedChanges}
              >
                <Save size={13} />
                <span className="text-xs hidden lg:inline">Save</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {hasUnsavedChanges ? 'Save project (Ctrl+S)' : 'No changes to save'}
            </TooltipContent>
          </Tooltip>

          <div className="w-px h-6 bg-border/50" />

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 px-2 hover:bg-accent/50 gap-2 transition-all">
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7 border border-primary/20">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden xl:flex flex-col items-start leading-tight">
                    <span className="text-xs font-bold text-foreground/90">{user?.name || "Guest User"}</span>
                    <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter">{user?.role || "Viewer"}</span>
                  </div>
                  <ChevronDown size={12} className="text-muted-foreground/50" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-popover/95 backdrop-blur-xl border-border/50 shadow-xl">
              <div className="flex items-center gap-3 p-4 bg-primary/5 border-b border-border/50">
                <Avatar className="h-10 w-10 border-2 border-primary/20">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback>{user?.name?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{user?.name || "Guest User"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email || "No email"}</p>
                </div>
              </div>
              <div className="p-1">
                <DropdownMenuItem onClick={() => onNavigate?.('profile')} className="cursor-pointer focus:bg-accent/50 py-2">
                  <User size={14} className="mr-2 text-muted-foreground" />
                  <span className="text-xs">Profile Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer focus:bg-accent/50 py-2">
                  <Bell size={14} className="mr-2 text-muted-foreground" />
                  <span className="text-xs">Notifications</span>
                  <Badge className="ml-auto h-4 px-1 bg-primary/10 text-primary border-none text-[9px]">3</Badge>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer focus:bg-accent/50 py-2">
                  <CreditCard size={14} className="mr-2 text-muted-foreground" />
                  <span className="text-xs">Subscription</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border/50" />
                <DropdownMenuItem onClick={onOpenSettings} className="cursor-pointer focus:bg-accent/50 py-2">
                  <SettingsIcon size={14} className="mr-2 text-muted-foreground" />
                  <span className="text-xs">Preferences</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border/50" />
                <DropdownMenuItem className="text-destructive focus:bg-destructive/10 cursor-pointer py-2">
                  <LogOut size={14} className="mr-2" />
                  <span className="text-xs font-medium">Log Out</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

      </div>

      {/* Tablet Header (medium screens) */}
      <div className="hidden md:flex lg:hidden items-center h-12 px-3 gap-3">
        <SidebarTrigger className="h-8 w-8" />
        <AppLogo size="sm" textSize="sm" />

        <div className="w-px h-5 bg-border/50" />

        <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden">
          <EditableProjectName
            projectName={safeProjectName}
            onProjectNameChange={onProjectNameChange}
          />
          <AspectRatioSelector className="hidden md:flex scale-90 origin-left" />
        </div>

        <SaveStatusIndicator status={saveStatus} lastSaved={lastSaved} />

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleSaveClick}
            disabled={!hasUnsavedChanges}
          >
            <Save size={14} />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-primary/20">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback className="text-[10px]">{user?.name?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => onNavigate?.('profile')}>Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenSettings}>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">Log Out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </div>

      {/* Mobile Header */}
      <div className="flex md:hidden flex-col">
        {/* Top Mobile Bar */}
        <div className="flex items-center justify-between h-12 px-3 border-b border-border/30">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <SidebarTrigger className="h-8 w-8 flex-shrink-0" />
            <AppLogo size="sm" textSize="sm" className="flex-shrink-0" />
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {hasUnsavedChanges && (
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleSaveClick}
              disabled={!hasUnsavedChanges}
            >
              <Save size={14} />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-primary/20">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="text-[8px]">{user?.name?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => onNavigate?.('profile')}>Profile</DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenSettings}>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">Log Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

        </div>

        {/* Mobile Project Info Bar */}
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border/20 overflow-x-auto no-scrollbar">
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <EditableProjectName
              projectName={safeProjectName}
              onProjectNameChange={onProjectNameChange}
            />
            <AspectRatioSelector className="scale-90 origin-left" />
          </div>
          <SaveStatusIndicator status={saveStatus} lastSaved={lastSaved} />
        </div>
      </div>
    </header>
  );
});

AppHeader.displayName = 'AppHeader';