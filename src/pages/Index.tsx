import React, { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeleprompterStore } from '@/store/teleprompterStore';
import {
  SettingsPanel,
} from '@/components/Teleprompter';
import { AppHeader, AppSidebar } from '@/components/Layout';
import { VisualEditorLayout } from '@/components/Layout/VisualEditorLayout';
import { ProjectListDialog } from '@/components/Teleprompter/VisualEditor/ProjectListDialog';
import { ScriptStatisticsDialog } from '@/components/Teleprompter/ScriptStatisticsDialog';
import { CountdownSettingsDialog } from '@/components/Teleprompter/CountdownSettingsDialog';
import { AboutDialog } from '@/components/Teleprompter/AboutDialog';
import { AudioManagerDialog } from '@/components/Teleprompter/AudioManager';
import { RemoteControlDialog } from '@/components/Teleprompter/RemoteControl/RemoteControlDialog';
import { SidebarInset } from '@/components/ui/sidebar';
import { VoiceInputDialog } from '@/components/Teleprompter/VoiceInput';
import { SegmentTimerCalculator } from '@/components/Teleprompter/SegmentTimerCalculator';
import { TemplatesDialog } from '@/components/Teleprompter/TemplatesDialog';
import { exportToPDF } from '@/utils/exportPDF';
import { openExternalDisplay } from '@/utils/externalDisplay';
import {
  TooltipProvider,
} from '@/components/ui/tooltip';
import { exportVisualProject, importVisualProject } from '@/core/storage/VisualProjectStorage';
import { useVisualProjectSession, getRecentProjects } from '@/hooks/useVisualProjectSession';
import { useVisualEditorState } from '@/components/Teleprompter/VisualEditor/useVisualEditorState';
import { toast } from 'sonner';
import { HomePage } from './HomePage';
import { PlayerIndicatorSettingsDialog } from '@/components/Teleprompter/PlayerIndicatorSettingsDialog';
import { UserProfileDialog } from '@/components/User/UserProfileDialog';
import { useUserStore } from '@/store/userStore';
import { cn } from '@/lib/utils';

// Custom hooks
import { useAppViewState, AppView } from '@/hooks/useAppViewState';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useDialogController } from '@/hooks/useDialogController';
import { useApplyVisualAudio } from '@/hooks/useApplyVisualAudio';
import { useApplyVisualDuration } from '@/hooks/useApplyVisualDuration';

const Index = () => {
  const navigate = useNavigate();

  // App view state management
  const { appView, setAppView } = useAppViewState();

  // Dialog management
  const dialogs = useDialogController();

  // User store
  const { loadUser } = useUserStore();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Store selectors
  const layoutMode = useTeleprompterStore((s) => s.editor.layoutMode);
  const setLayoutMode = useTeleprompterStore((s) => s.setLayoutMode);

  // Visual editor session
  const {
    saveProject: saveVisualProject,
    loadProject: loadVisualProject,
    createNewProject: createNewVisualProject,
    projectId: visualProjectId,
    isDirty: visualIsDirty,
    saveStatus,
    startupMode,
    setStartupMode,
  } = useVisualProjectSession();

  // Restore visual project session on component mount if needed
  useEffect(() => {
    const restoreVisualSession = async () => {
      const lastProjectId = localStorage.getItem('lastVisualProjectId');
      const savedAppView = localStorage.getItem('teleprompter-app-view') as AppView;

      // If we have a visual project session and should be in visual mode
      if (lastProjectId && savedAppView === 'visual') {
        try {
          const success = await loadVisualProject(lastProjectId);
          if (success) {
            setAppView('visual');
            setLayoutMode('visual-expanded');
            setStartupMode('editor');
          }
        } catch (error) {
          console.error('Failed to restore visual session:', error);
        }
      }
    };

    restoreVisualSession();
  }, [loadVisualProject, setAppView, setLayoutMode, setStartupMode]);

  // Visual editor state
  const visualProjectName = useVisualEditorState((s) => s.projectName);
  const setVisualProjectName = useVisualEditorState((s) => s.setProjectName);
  const lastSaved = useVisualEditorState((s) => s.lastSaved);
  const pages = useVisualEditorState((s) => s.pages);
  const audioFile = useVisualEditorState((s) => s.audioFile);
  const visualIsPlaying = useVisualEditorState((s) => s.isPlaying);
  const visualSetPlaying = useVisualEditorState((s) => s.setPlaying);
  const setShowPlayer = useVisualEditorState((s) => s.setShowPlayer);

  // Custom hooks for business logic
  const { applyAudio } = useApplyVisualAudio();
  const { applyDuration } = useApplyVisualDuration();

  // Local state
  const [recentProjects, setRecentProjects] = useState<Array<{ id: string; name: string }>>([]);

  // Auto-switch layout mode based on app view
  useEffect(() => {
    if (appView === 'visual') {
      if (layoutMode !== 'visual-expanded') {
        setLayoutMode('visual-expanded');
      }
    } else {
      if (layoutMode !== 'default') {
        setLayoutMode('default');
      }
    }
  }, [layoutMode, setLayoutMode, appView]);

  // Handle page visibility change to detect refresh and restore proper view
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const savedAppView = localStorage.getItem('teleprompter-app-view') as AppView;

        if (appView === 'home' && savedAppView === 'visual') {
          setAppView('visual');
          setLayoutMode('visual-expanded');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [appView, setAppView, setLayoutMode]);

  // Fetch recent projects
  const fetchRecent = useCallback(async () => {
    const projects = await getRecentProjects(5);
    setRecentProjects(projects.map(p => ({ id: p.id, name: p.name })));
  }, []);

  useEffect(() => {
    fetchRecent();
  }, [fetchRecent]);

  // Refresh recent projects when save status changes to 'saved'
  useEffect(() => {
    if (saveStatus === 'saved') {
      fetchRecent();
    }
  }, [saveStatus, fetchRecent]);

  const handleSave = useCallback(async () => {
    await saveVisualProject();
    fetchRecent();
  }, [saveVisualProject, fetchRecent]);

  const handleLoadVisualProject = useCallback(async (id: string) => {
    try {
      const success = await loadVisualProject(id);
      if (success) {
        fetchRecent();
        setAppView('visual');
        setLayoutMode('visual-expanded');
        setStartupMode('editor');
      }
      return success;
    } catch (error) {
      console.error('Failed to load project:', error);
      toast.error('Failed to load project. It may be corrupted or no longer exists.');
      return false;
    }
  }, [loadVisualProject, fetchRecent, setAppView, setLayoutMode, setStartupMode]);

  const handleNewProject = useCallback(async () => {
    await createNewVisualProject();
    fetchRecent();
    setAppView('visual');
    setLayoutMode('visual-expanded');
    setStartupMode('editor');
  }, [createNewVisualProject, fetchRecent, setAppView, setLayoutMode, setStartupMode]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSave: handleSave,
    onNew: handleNewProject,
    onOpen: () => dialogs.open('projectList'),
    onShowShortcuts: () => dialogs.open('shortcuts'),
    editorType: 'visual',
    showVisualEditor: true,
  });

  // Navigation handlers
  const handleGoHome = useCallback(() => {
    setAppView('home');
    setStartupMode('welcome');
    setLayoutMode('default');
  }, [setAppView, setStartupMode, setLayoutMode]);

  const handleOpenVisualEditor = useCallback(() => {
    setAppView('visual');
    setLayoutMode('visual-expanded');
    setStartupMode('welcome');
  }, [setAppView, setLayoutMode, setStartupMode]);

  const handleSidebarNavigate = useCallback((section: string) => {
    switch (section) {
      case 'dashboard':
        handleGoHome();
        break;
      case 'visual-editor':
        handleOpenVisualEditor();
        break;
      case 'templates':
        dialogs.open('templates');
        break;
      case 'timer-calculator':
        dialogs.open('timerCalculator');
        break;
      case 'statistics':
        dialogs.open('statistics');
        break;
      case 'audio-manager':
        dialogs.open('audioManager');
        break;
      case 'remote-control':
        dialogs.open('remoteControl');
        break;
      case 'voice-input':
        dialogs.open('voiceInput');
        break;
      case 'profile':
        dialogs.open('userProfile');
        break;
      default:
      // No-op
    }
  }, [handleGoHome, handleOpenVisualEditor, dialogs]);

  // Export handler
  const handleExport = useCallback(() => {
    if (pages.length === 0) {
      toast.error('Add at least one image before exporting');
      return;
    }

    exportVisualProject({
      id: visualProjectId || 'exported',
      name: visualProjectName,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      pages,
      audioFile,
    });
    toast.success('Project exported');
  }, [visualProjectId, visualProjectName, pages, audioFile]);

  // Import handler
  const handleImport = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.visualprompt.json,.json';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const imported = await importVisualProject(file);
        await loadVisualProject(imported.id);
        toast.success(`Imported: ${imported.name}`);
        setAppView('visual');
        setLayoutMode('visual-expanded');
        setStartupMode('editor');
      } catch (error) {
        toast.error('Failed to import project. Invalid file format.');
      }
    };

    input.click();
  }, [loadVisualProject, setAppView, setLayoutMode, setStartupMode]);

  const handleOpenProject = useCallback(() => {
    dialogs.open('projectList');
  }, [dialogs]);

  const handlePlay = useCallback(() => {
    setLayoutMode('visual-expanded');
    setShowPlayer(true);
  }, [setLayoutMode, setShowPlayer]);

  // Check if can play
  const totalSegments = pages.reduce((acc, p) => acc + p.segments.filter(s => !s.isHidden).length, 0);
  const canPlay = totalSegments > 0;

  // Render logic - all hooks must be above this point

  // Home page view
  if (appView === 'home') {
    return (
      <HomePage
        onOpenVisualEditor={handleOpenVisualEditor}
      />
    );
  }

  // Visual Editor View
  const isWelcome = startupMode === 'welcome';

  return (
    <div className="h-screen flex bg-background overflow-hidden w-full">
      {!isWelcome && (
        <AppSidebar
          projectName={visualProjectName}
          isPlaying={visualIsPlaying}
          recentProjects={recentProjects}
          onNavigate={handleSidebarNavigate}
          onProjectSelect={handleLoadVisualProject}
          onTogglePlayback={() => visualSetPlaying(!visualIsPlaying)}
          onOpenCountdown={() => dialogs.open('countdown')}
          onOpenAudioManager={() => dialogs.open('audioManager')}
          onOpenTimerCalculator={() => dialogs.open('timerCalculator')}
          onOpenPlayerIndicatorSettings={() => dialogs.open('playerIndicatorSettings')}
          onPlay={handlePlay}
        />
      )}

      <SidebarInset className={cn("flex flex-col min-w-0 h-full overflow-hidden", isWelcome && "ml-0")}>
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {!isWelcome && (
            <AppHeader
              projectName={visualProjectName}
              onProjectNameChange={setVisualProjectName}
              hasUnsavedChanges={visualIsDirty}
              saveStatus={saveStatus}
              lastSaved={lastSaved}
              onNewProject={handleNewProject}
              onOpenProject={handleOpenProject}
              onSave={handleSave}
              onExport={handleExport}
              onImport={handleImport}
              onOpenSettings={() => dialogs.open('settings')}
              onOpenShortcuts={() => dialogs.open('shortcuts')}
              onOpenStatistics={() => dialogs.open('statistics')}
              onOpenCountdown={() => dialogs.open('countdown')}
              onOpenAbout={() => dialogs.open('about')}
              onOpenAudioManager={() => dialogs.open('audioManager')}
              onOpenRemoteControl={() => dialogs.open('remoteControl')}
              onOpenVoiceInput={() => dialogs.open('voiceInput')}
              onOpenTimerCalculator={() => dialogs.open('timerCalculator')}
              onOpenTemplates={() => dialogs.open('templates')}
              onExportPDF={() => exportToPDF()}
              onOpenExternalDisplay={() => openExternalDisplay()}
              onPlay={handlePlay}
              onGoHome={handleGoHome}
              onOpenPlayerIndicatorSettings={() => dialogs.open('playerIndicatorSettings')}
              recentProjects={recentProjects}
              onOpenRecentProject={handleLoadVisualProject}
              canPlay={canPlay}
              isPlaying={visualIsPlaying}
              onPlayPause={() => visualSetPlaying(false)}
              onNavigate={handleSidebarNavigate}
            />

          )}

          <VisualEditorLayout
            onOpenAudioLibrary={() => dialogs.open('audioManager')}
            onGoHome={handleGoHome}
            onOpenSettings={() => dialogs.open('settings')}
            onOpenShortcuts={() => dialogs.open('shortcuts')}
          />

          <DialogsSection
            dialogs={dialogs}
            loadVisualProject={handleLoadVisualProject}
            createNewVisualProject={handleNewProject}
            visualProjectId={visualProjectId}
            applyAudio={applyAudio}
            applyDuration={applyDuration}
          />
        </div>
      </SidebarInset>
    </div>
  );
};

// Reusable dialogs section to keep main render clean
const DialogsSection = ({
  dialogs,
  loadVisualProject,
  createNewVisualProject,
  visualProjectId,
  applyAudio,
  applyDuration,
}: {
  dialogs: any;
  loadVisualProject: (id: string) => Promise<boolean>;
  createNewVisualProject: () => Promise<void>;
  visualProjectId: string | null;
  applyAudio: (audio: { id: string; name: string; data: string; duration: number }) => void;
  applyDuration: (duration: number) => void;
}) => (
  <TooltipProvider>
    <ProjectListDialog
      open={dialogs.isOpen('projectList')}
      onOpenChange={(open) => dialogs.toggle('projectList', open)}
      onSelectProject={loadVisualProject}
      onNewProject={createNewVisualProject}
      currentProjectId={visualProjectId}
    />

    <SettingsPanel
      open={dialogs.isOpen('settings')}
      onOpenChange={(open) => dialogs.toggle('settings', open)}
    />

    <ScriptStatisticsDialog
      open={dialogs.isOpen('statistics')}
      onOpenChange={(open) => dialogs.toggle('statistics', open)}
    />

    <CountdownSettingsDialog
      open={dialogs.isOpen('countdown')}
      onOpenChange={(open) => dialogs.toggle('countdown', open)}
    />

    <AboutDialog
      open={dialogs.isOpen('about')}
      onOpenChange={(open) => dialogs.toggle('about', open)}
    />

    <AudioManagerDialog
      open={dialogs.isOpen('audioManager')}
      onOpenChange={(open) => dialogs.toggle('audioManager', open)}
      onUseInProject={applyAudio}
    />

    <RemoteControlDialog
      open={dialogs.isOpen('remoteControl')}
      onOpenChange={(open) => dialogs.toggle('remoteControl', open)}
    />

    <VoiceInputDialog
      open={dialogs.isOpen('voiceInput')}
      onOpenChange={(open) => dialogs.toggle('voiceInput', open)}
    />

    <SegmentTimerCalculator
      open={dialogs.isOpen('timerCalculator')}
      onOpenChange={(open) => dialogs.toggle('timerCalculator', open)}
      onApplyDuration={applyDuration}
    />

    <TemplatesDialog
      open={dialogs.isOpen('templates')}
      onOpenChange={(open) => dialogs.toggle('templates', open)}
      onSelectTemplate={(content) => {
        // Handle template selection if needed in Visual mode
        console.log('Template selected:', content);
      }}
    />

    <PlayerIndicatorSettingsDialog
      open={dialogs.isOpen('playerIndicatorSettings')}
      onOpenChange={(open) => dialogs.toggle('playerIndicatorSettings', open)}
    />

    <UserProfileDialog
      open={dialogs.isOpen('userProfile')}
      onOpenChange={(open) => dialogs.toggle('userProfile', open)}
    />
  </TooltipProvider>
);

export default Index;
