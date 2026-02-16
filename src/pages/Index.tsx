import React, { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeleprompterStore } from '@/store/teleprompterStore';
import { AppHeader, AppSidebar } from '@/components/Layout';
import { VisualEditorLayout } from '@/components/Layout/VisualEditorLayout';
import { SidebarInset } from '@/components/ui/sidebar';
const ProjectListDialog = React.lazy(() => import('@/components/Teleprompter/VisualEditor/ProjectListDialog').then(m => ({ default: m.ProjectListDialog })));
const CountdownSettingsDialog = React.lazy(() => import('@/components/Teleprompter/CountdownSettingsDialog').then(m => ({ default: m.CountdownSettingsDialog })));
const AboutDialog = React.lazy(() => import('@/components/Teleprompter/AboutDialog').then(m => ({ default: m.AboutDialog })));
const AudioManagerDialog = React.lazy(() => import('@/components/Teleprompter/AudioManager').then(m => ({ default: m.AudioManagerDialog })));
const RemoteControlDialog = React.lazy(() => import('@/components/Teleprompter/RemoteControl/RemoteControlDialog').then(m => ({ default: m.RemoteControlDialog })));
const PDFPageSelector = React.lazy(() => import('@/components/Teleprompter/PDFPageSelector').then(m => ({ default: m.PDFPageSelector })));
const PlayerIndicatorSettingsDialog = React.lazy(() => import('@/components/Teleprompter/PlayerIndicatorSettingsDialog').then(m => ({ default: m.PlayerIndicatorSettingsDialog })));
const UserProfileDialog = React.lazy(() => import('@/components/User/UserProfileDialog').then(m => ({ default: m.UserProfileDialog })));
const SettingsPanel = React.lazy(() => import('@/components/Teleprompter').then(m => ({ default: m.SettingsPanel })));
import { ProjectService } from '@/core/projects/ProjectService';
import { handleFileImport, createProjectFromPDFPages } from '@/core/projects/fileImportHandlers';
import { type VisualProject } from '@/core/projects/models';
import {
  TooltipProvider,
} from '@/components/ui/tooltip';
import { exportVisualProject, importVisualProject } from '@/core/storage/VisualProjectStorage';
import { useVisualProjectSession, getRecentProjects } from '@/hooks/useVisualProjectSession';
import { useVisualEditorState } from '@/components/Teleprompter/VisualEditor/useVisualEditorState';
import { toast } from 'sonner';
import { HomePage } from './HomePage';
import { useUserStore } from '@/store/userStore';
import { cn } from '@/lib/utils';

// Custom hooks
import { useAppViewState, AppView } from '@/hooks/useAppViewState';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useDialogController } from '@/hooks/useDialogController';
import { useApplyVisualAudio } from '@/hooks/useApplyVisualAudio';
import { useApplyVisualDuration } from '@/hooks/useApplyVisualDuration';
import { useRemoteControl } from '@/hooks/useRemoteControl';

const Index = () => {
  const navigate = useNavigate();

  // App view state management
  const { appView, setAppView } = useAppViewState();

  // Dialog management
  const dialogs = useDialogController();

  // User store
  const { loadUser } = useUserStore();

  // Remote Control Handlers
  const { handleRemoteCommand } = useRemoteControl();

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

  // State for PDF Selector
  const [isPDFSelectorOpen, setIsPDFSelectorOpen] = useState(false);
  const [pendingPDF, setPendingPDF] = useState<File | string | null>(null);

  const handlePDFPagesSelected = useCallback(async (selectedPages: { pageNumber: number; imageData: string }[]) => {
    if (selectedPages.length === 0 || !pendingPDF) return;

    try {
      const project = await createProjectFromPDFPages(pendingPDF, selectedPages);
      await loadVisualProject(project.id);
      toast.success(`Imported ${selectedPages.length} pages from PDF`);

      setAppView('visual');
      setLayoutMode('visual-expanded');
      setStartupMode('editor');
      setPendingPDF(null);
    } catch (error) {
      console.error('Failed to create project from PDF:', error);
      toast.error('Failed to import PDF pages');
    }
  }, [pendingPDF, loadVisualProject, setAppView, setLayoutMode, setStartupMode]);

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

    // Cleanup logic removed from background to prevent accidental data loss of non-recent projects.
    // Maintenance should be performed via dedicated settings/storage management.
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
      case 'audio-manager':
        dialogs.open('audioManager');
        break;
      case 'remote-control':
        dialogs.open('remoteControl');
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
    // Support all requested types
    input.accept = '.visualprompt.json,.json,.pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const result = await handleFileImport(file);

        if (result.type === 'project') {
          await loadVisualProject(result.project.id);
          toast.success(`Imported: ${result.project.name}`);
          setAppView('visual');
          setLayoutMode('visual-expanded');
          setStartupMode('editor');
        } else if (result.type === 'pdf') {
          setPendingPDF(result.file);
          setIsPDFSelectorOpen(true);
        } else if (result.type === 'error') {
          toast.error(result.message);
        }
      } catch (error) {
        toast.error('Failed to import file. An unexpected error occurred.');
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

  const handleTogglePlayback = useCallback(() => visualSetPlaying(!visualIsPlaying), [visualSetPlaying, visualIsPlaying]);
  const handlePlayPause = useCallback((playing: boolean) => visualSetPlaying(playing), [visualSetPlaying]);
  const handleOpenCountdown = useCallback(() => dialogs.open('countdown'), [dialogs]);
  const handleOpenAudioManager = useCallback(() => dialogs.open('audioManager'), [dialogs]);
  const handleOpenPlayerIndicatorSettings = useCallback(() => dialogs.open('playerIndicatorSettings'), [dialogs]);
  const handleOpenSettings = useCallback(() => dialogs.open('settings'), [dialogs]);
  const handleOpenShortcuts = useCallback(() => dialogs.open('shortcuts'), [dialogs]);
  const handleOpenAbout = useCallback(() => dialogs.open('about'), [dialogs]);
  const handleOpenRemoteControl = useCallback(() => dialogs.open('remoteControl'), [dialogs]);

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
          onTogglePlayback={handleTogglePlayback}
          onOpenCountdown={handleOpenCountdown}
          onOpenAudioManager={handleOpenAudioManager}
          onOpenPlayerIndicatorSettings={handleOpenPlayerIndicatorSettings}
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
              onOpenSettings={handleOpenSettings}
              onOpenShortcuts={handleOpenShortcuts}
              onOpenCountdown={handleOpenCountdown}
              onOpenAbout={handleOpenAbout}
              onOpenAudioManager={handleOpenAudioManager}
              onOpenRemoteControl={handleOpenRemoteControl}
              onPlay={handlePlay}
              onGoHome={handleGoHome}
              onOpenPlayerIndicatorSettings={handleOpenPlayerIndicatorSettings}
              recentProjects={recentProjects}
              onOpenRecentProject={handleLoadVisualProject}
              canPlay={canPlay}
              isPlaying={visualIsPlaying}
              onPlayPause={() => handlePlayPause(false)}
              onNavigate={handleSidebarNavigate}
            />
          )}

          <VisualEditorLayout
            onOpenAudioLibrary={handleOpenAudioManager}
            onGoHome={handleGoHome}
            onOpenSettings={handleOpenSettings}
            onOpenShortcuts={handleOpenShortcuts}
            onOpenProjectList={() => dialogs.open('projectList')}
            onOpenPDFSelector={(file) => {
              setPendingPDF(file);
              setIsPDFSelectorOpen(true);
            }}
          />
        </div>
      </SidebarInset>

      <DialogsSection
        dialogs={dialogs}
        loadVisualProject={handleLoadVisualProject}
        createNewVisualProject={handleNewProject}
        visualProjectId={visualProjectId}
        applyAudio={applyAudio}
        applyDuration={applyDuration}
        isPDFSelectorOpen={isPDFSelectorOpen}
        setIsPDFSelectorOpen={setIsPDFSelectorOpen}
        handlePDFPagesSelected={handlePDFPagesSelected}
        pendingPDF={pendingPDF}
        setPendingPDF={setPendingPDF}
      />
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
  isPDFSelectorOpen,
  setIsPDFSelectorOpen,
  handlePDFPagesSelected,
  pendingPDF,
  setPendingPDF,
}: {
  dialogs: any;
  loadVisualProject: (id: string) => Promise<boolean>;
  createNewVisualProject: (name?: string) => Promise<void>;
  visualProjectId: string | null;
  applyAudio: (audio: { id: string; name: string; data: string; duration: number }) => void;
  applyDuration: (duration: number) => void;
  isPDFSelectorOpen: boolean;
  setIsPDFSelectorOpen: (open: boolean) => void;
  handlePDFPagesSelected: (pages: { pageNumber: number; imageData: string }[]) => void;
  pendingPDF: File | string | null;
  setPendingPDF: (pdf: File | string | null) => void;
}) => (
  <TooltipProvider>
    <React.Suspense fallback={null}>
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

      <PlayerIndicatorSettingsDialog
        open={dialogs.isOpen('playerIndicatorSettings')}
        onOpenChange={(open) => dialogs.toggle('playerIndicatorSettings', open)}
      />

      <PDFPageSelector
        open={isPDFSelectorOpen}
        onOpenChange={(open) => {
          setIsPDFSelectorOpen(open);
          if (!open) setPendingPDF(null);
        }}
        onPagesSelected={handlePDFPagesSelected}
        pdfSource={pendingPDF}
      />

      <UserProfileDialog
        open={dialogs.isOpen('userProfile')}
        onOpenChange={(open) => dialogs.toggle('userProfile', open)}
      />
    </React.Suspense>
  </TooltipProvider>
);

export default Index;
