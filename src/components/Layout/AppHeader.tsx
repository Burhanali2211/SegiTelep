import React, { memo, useState, useEffect } from 'react';
import { MainMenuBar } from './MainMenuBar';
import { SecondaryToolbar, SaveStatus } from './SecondaryToolbar';
import { Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  onPlay: () => void;
  onGoHome: () => void;
  
  // Recent projects
  recentProjects?: Array<{ id: string; name: string }>;
  onOpenRecentProject?: (id: string) => void;
  
  // Playback state
  canPlay?: boolean;
  
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
  onPlay,
  onGoHome,
  recentProjects = [],
  onOpenRecentProject,
  canPlay = true,
  className,
}) => {
  return (
    <header className={cn('flex flex-col border-b border-border bg-card', className)}>
      {/* Main Menu Bar */}
      <div className="flex items-center h-10 px-3 border-b border-border/50">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-4">
          <Monitor size={20} className="text-primary" />
          <span className="font-semibold text-base">ProTeleprompter</span>
        </div>
        
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
          onPlay={onPlay}
          onGoHome={onGoHome}
          recentProjects={recentProjects}
          onOpenRecentProject={onOpenRecentProject}
          editorType={editorType}
          onEditorTypeChange={onEditorTypeChange}
        />
        
        {/* Spacer */}
        <div className="flex-1" />
      </div>
      
      {/* Secondary Toolbar */}
      <SecondaryToolbar
        projectName={projectName}
        onProjectNameChange={onProjectNameChange}
        hasUnsavedChanges={hasUnsavedChanges}
        saveStatus={saveStatus}
        lastSaved={lastSaved}
        editorType={editorType}
        onEditorTypeChange={onEditorTypeChange}
        onGoHome={onGoHome}
        onPlay={onPlay}
        onSave={onSave}
        onOpenSettings={onOpenSettings}
        onOpenShortcuts={onOpenShortcuts}
        canPlay={canPlay}
      />
    </header>
  );
});

AppHeader.displayName = 'AppHeader';
