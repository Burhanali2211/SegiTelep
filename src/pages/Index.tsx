import React, { useEffect, useCallback, useMemo, useState, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeleprompterStore } from '@/store/teleprompterStore';
import { createProject } from '@/core/storage/ProjectStorage';
import { isVisualSegment } from '@/types/teleprompter.types';
import {
  ProjectManager,
  SettingsPanel,
} from '@/components/Teleprompter';
import { AppHeader } from '@/components/Layout';
import { TextEditorLayout } from '@/components/Layout/TextEditorLayout';
import { VisualEditorLayout } from '@/components/Layout/VisualEditorLayout';
import { ProjectListDialog } from '@/components/Teleprompter/VisualEditor/ProjectListDialog';
import { ScriptStatisticsDialog } from '@/components/Teleprompter/ScriptStatisticsDialog';
import { CountdownSettingsDialog } from '@/components/Teleprompter/CountdownSettingsDialog';
import { AboutDialog } from '@/components/Teleprompter/AboutDialog';
import { AudioManagerDialog } from '@/components/Teleprompter/AudioManager';
import { RemoteControlDialog } from '@/components/Teleprompter/RemoteControl/RemoteControlDialog';
import { useRemoteControl } from '@/hooks/useRemoteControl';
import { VoiceInputDialog } from '@/components/Teleprompter/VoiceInput';
import { SegmentTimerCalculator } from '@/components/Teleprompter/SegmentTimerCalculator';
import { TemplatesDialog } from '@/components/Teleprompter/TemplatesDialog';
import { exportToPDF } from '@/utils/exportPDF';
import { openExternalDisplay } from '@/utils/externalDisplay';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportVisualProject, importVisualProject } from '@/core/storage/VisualProjectStorage';
import { useVisualProjectSession, getRecentProjects } from '@/hooks/useVisualProjectSession';
import { useVisualEditorState } from '@/components/Teleprompter/VisualEditor/useVisualEditorState';
import { useDeveloperConsole } from '@/hooks/useDeveloperConsole';
import { toast } from 'sonner';
import { HomePage } from './HomePage';
import { PlayerIndicatorSettingsDialog } from '@/components/Teleprompter/PlayerIndicatorSettingsDialog';

// Custom hooks
import { useAppViewState, EditorType, AppView } from '@/hooks/useAppViewState';
import { useTeleprompterStartup } from '@/hooks/useTeleprompterStartup';
import { useKeyboardShortcuts, KEYBOARD_SHORTCUTS } from '@/hooks/useKeyboardShortcuts';
import { useDialogController } from '@/hooks/useDialogController';
import { useApplyVisualAudio } from '@/hooks/useApplyVisualAudio';
import { useApplyVisualDuration } from '@/hooks/useApplyVisualDuration';

const Index = () => {
  // Developer console
  const { toggleConsole } = useDeveloperConsole();
  const navigate = useNavigate();
  
  // App view state management
  const { appView, setAppView, editorType, setEditorType } = useAppViewState();
  
  // Teleprompter startup logic
  const { initialized } = useTeleprompterStartup(appView);
  
  // Dialog management
  const dialogs = useDialogController();
  
  // Store selectors
  const project = useTeleprompterStore((s) => s.project);
  const selectedSegmentId = useTeleprompterStore((s) => s.editor.selectedSegmentId);
  const layoutMode = useTeleprompterStore((s) => s.editor.layoutMode);
  const setProject = useTeleprompterStore((s) => s.setProject);
  const hasUnsavedChanges = useTeleprompterStore((s) => s.hasUnsavedChanges);
  const saveCurrentProject = useTeleprompterStore((s) => s.saveCurrentProject);
  const setLayoutMode = useTeleprompterStore((s) => s.setLayoutMode);
  const playback = useTeleprompterStore((s) => s.playback);
  const play = useTeleprompterStore((s) => s.play);
  const pause = useTeleprompterStore((s) => s.pause);
  
  // Visual editor session
  const {
    saveProject: saveVisualProject,
    loadProject: loadVisualProject,
    createNewProject: createNewVisualProject,
    projectId: visualProjectId,
    isDirty: visualIsDirty,
    saveStatus,
    isLoading: visualIsLoading,
    startupMode,
    setStartupMode,
  } = useVisualProjectSession();
  
  // Restore visual project session on component mount if needed
  useEffect(() => {
    const restoreVisualSession = async () => {
      const lastProjectId = localStorage.getItem('lastVisualProjectId');
      const savedAppView = localStorage.getItem('teleprompter-app-view') as AppView;
      const savedEditorType = localStorage.getItem('teleprompter-editor-type') as EditorType;
      
      // If we have a visual project session and should be in visual mode
      if (lastProjectId && savedAppView === 'visual' && savedEditorType === 'visual') {
        try {
          await loadVisualProject(lastProjectId);
          setAppView('visual');
          setEditorType('visual');
          setLayoutMode('visual-expanded');
        } catch (error) {
          console.error('Failed to restore visual session:', error);
        }
      }
    };
    
    restoreVisualSession();
  }, [loadVisualProject, setAppView, setEditorType, setLayoutMode]);
  
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
  
  // Remote control hook
  const { getCurrentStatus } = useRemoteControl();
  
  // Local state
  const [recentProjects, setRecentProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [showMobileSegments, setShowMobileSegments] = useState(true);
  
  // Determine which editor to show based on selected segment type
  const selectedSegment = useMemo(() => {
    return project?.segments.find((s) => s.id === selectedSegmentId);
  }, [project?.segments, selectedSegmentId]);
  
  // Auto-detect editor type from selected segment
  useEffect(() => {
    if (layoutMode !== 'default' || appView !== 'text') return;
    if (selectedSegment) {
      const isVisual = isVisualSegment(selectedSegment);
      setEditorType(isVisual ? 'visual' : 'text');
    }
  }, [selectedSegment, layoutMode, appView, setEditorType]);
  
  const showVisualEditor = editorType === 'visual';
  
  // Auto-switch layout mode based on editor type
  useEffect(() => {
    if (appView !== 'text') return;
    if (showVisualEditor && layoutMode === 'default') {
      setLayoutMode('visual-expanded');
    } else if (!showVisualEditor && layoutMode === 'visual-expanded') {
      setLayoutMode('default');
    }
  }, [showVisualEditor, layoutMode, setLayoutMode, appView]);
  
  // Handle page visibility change to detect refresh and restore proper view
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && project) {
        // Get the saved view from localStorage to restore the correct state
        const savedAppView = localStorage.getItem('teleprompter-app-view') as AppView;
        const savedEditorType = localStorage.getItem('teleprompter-editor-type') as EditorType;
        
        // Only restore if we're incorrectly on home view but have saved state
        if (appView === 'home' && savedAppView && savedAppView !== 'home' && project.segments.length > 0) {
          // Restore the saved app view
          setAppView(savedAppView);
          
          // Also restore editor type if it was visual
          if (savedEditorType === 'visual') {
            setEditorType('visual');
            // If visual editor, also set the correct layout mode
            const hasVisualSegments = project.segments.some(s => 
              s.type === 'image' || s.type === 'image-region' || s.type === 'pdf-page'
            );
            if (hasVisualSegments) {
              setLayoutMode('visual-expanded');
            }
          } else if (savedEditorType === 'text') {
            setEditorType('text');
            setLayoutMode('default');
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [appView, project, editorType, setAppView, setEditorType, setLayoutMode]);
  
  // Fetch recent projects
  useEffect(() => {
    const fetchRecent = async () => {
      const projects = await getRecentProjects(5);
      setRecentProjects(projects.map(p => ({ id: p.id, name: p.name })));
    };
    fetchRecent();
  }, []);
  
  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSave: () => showVisualEditor ? saveVisualProject() : saveCurrentProject(),
    onNew: () => showVisualEditor && createNewVisualProject(),
    onOpen: () => dialogs.open('projectManager'),
    onShowShortcuts: () => dialogs.open('shortcuts'),
    editorType,
    showVisualEditor,
  });
  
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
      } catch (error) {
        toast.error('Failed to import project. Invalid file format.');
      }
    };
    
    input.click();
  }, [loadVisualProject]);
  
  // Navigation handlers
  const handleGoHome = useCallback(() => {
    setAppView('home');
    setStartupMode('welcome');
    setLayoutMode('default');
  }, [setStartupMode, setLayoutMode]);

  const handleOpenTextEditor = useCallback(() => {
    setAppView('text');
    setLayoutMode('default');
    setEditorType('text');
  }, [setLayoutMode]);

  const handleOpenVisualEditor = useCallback(() => {
    setAppView('visual');
    setLayoutMode('visual-expanded');
    setEditorType('visual');
    setStartupMode('welcome');
  }, [setLayoutMode, setStartupMode]);
  
  const handleOpenProject = useCallback(() => {
    if (layoutMode === 'visual-expanded') {
      dialogs.open('projectList');
    } else {
      dialogs.open('projectManager');
    }
  }, [layoutMode, dialogs]);
  
  const handlePlay = useCallback(() => {
    if (showVisualEditor) {
      setLayoutMode('visual-expanded');
      setShowPlayer(true);
    }
  }, [showVisualEditor, setLayoutMode, setShowPlayer]);

  const handlePlayPause = useCallback(() => {
    if (playback.isPlaying && !playback.isPaused) pause();
    else play();
  }, [playback.isPlaying, playback.isPaused, play, pause]);

  // Check if can play
  const totalSegments = pages.reduce((acc, p) => acc + p.segments.filter(s => !s.isHidden).length, 0);
  const canPlay = totalSegments > 0 || (project?.segments.length ?? 0) > 0;
  const isTextPlaying = playback.isPlaying && !playback.isPaused;
  
  // Home page - default view on app open and refresh
  if (appView === 'home') {
    return (
      <HomePage
        onOpenTextEditor={handleOpenTextEditor}
        onOpenVisualEditor={handleOpenVisualEditor}
      />
    );
  }

  // Text editor loading
  if (appView === 'text' && !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Visual Mode Layout
  if (layoutMode === 'visual-expanded') {
    return (
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        {/* Header */}
        <AppHeader
          projectName={visualProjectName}
          onProjectNameChange={setVisualProjectName}
          hasUnsavedChanges={visualIsDirty}
          saveStatus={saveStatus}
          lastSaved={lastSaved}
          editorType={editorType}
          onEditorTypeChange={(type) => {
            setEditorType(type);
            if (type === 'text') {
              setLayoutMode('default');
            }
          }}
          onNewProject={createNewVisualProject}
          onOpenProject={handleOpenProject}
          onSave={saveVisualProject}
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
          onToggleDevConsole={toggleConsole}
          onOpenPlayerIndicatorSettings={() => dialogs.open('playerIndicatorSettings')}
          recentProjects={recentProjects}
          onOpenRecentProject={async (id: string) => {
            try {
              await loadVisualProject(id);
            } catch (error) {
              console.error('Failed to load recent project:', error);
              toast.error('Failed to load project. It may be corrupted or no longer exists.');
            }
          }}
          canPlay={canPlay}
          isPlaying={visualIsPlaying}
          onPlayPause={() => visualSetPlaying(false)}
        />
        
        {/* Main Content */}
        <VisualEditorLayout
          onOpenAudioLibrary={() => dialogs.open('audioManager')}
          onGoHome={handleGoHome}
          onEditorTypeChange={(type) => {
            setEditorType(type);
            if (type === 'text') setLayoutMode('default');
          }}
          onOpenSettings={() => dialogs.open('settings')}
          onOpenShortcuts={() => dialogs.open('shortcuts')}
        />
        
        {/* Dialogs */}
        <DialogsSection
          dialogs={dialogs}
          loadVisualProject={async (id: string) => {
            try {
              await loadVisualProject(id);
            } catch (error) {
              console.error('Failed to load recent project:', error);
              toast.error('Failed to load project. It may be corrupted or no longer exists.');
            }
          }}
          createNewVisualProject={createNewVisualProject}
          visualProjectId={visualProjectId}
          editorType={editorType}
          applyAudio={applyAudio}
          applyDuration={applyDuration}
        />
      </div>
    );
  }
  
  // Default Mode Layout
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <AppHeader
        projectName={project?.name ?? 'Untitled'}
        onProjectNameChange={(name) => {
          if (project) {
            useTeleprompterStore.getState().updateProjectName(name);
          }
        }}
        hasUnsavedChanges={hasUnsavedChanges}
        saveStatus={saveStatus}
        lastSaved={lastSaved}
        editorType={editorType}
        onEditorTypeChange={(type) => {
          setEditorType(type);
          if (type === 'visual') {
            setLayoutMode('visual-expanded');
          }
        }}
        onNewProject={() => {
          createProject('New Script').then(setProject);
        }}
        onOpenProject={handleOpenProject}
        onSave={saveCurrentProject}
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
        onToggleDevConsole={toggleConsole}
        onOpenPlayerIndicatorSettings={() => dialogs.open('playerIndicatorSettings')}
        recentProjects={recentProjects}
        onOpenRecentProject={async (id: string) => {
            try {
              await loadVisualProject(id);
            } catch (error) {
              console.error('Failed to load recent project:', error);
              toast.error('Failed to load project. It may be corrupted or no longer exists.');
            }
          }}
        canPlay={canPlay}
        isPlaying={isTextPlaying}
        onPlayPause={handlePlayPause}
      />
      
      {/* Main Content */}
      <TextEditorLayout
        showVisualEditor={showVisualEditor}
        showMobileSegments={showMobileSegments}
        onToggleMobileSegments={() => setShowMobileSegments(!showMobileSegments)}
        onOpenAudioManager={() => dialogs.open('audioManager')}
      />
      
      {/* Dialogs */}
      <DialogsSection
        dialogs={dialogs}
        loadVisualProject={async (id: string) => {
            try {
              await loadVisualProject(id);
            } catch (error) {
              console.error('Failed to load recent project:', error);
              toast.error('Failed to load project. It may be corrupted or no longer exists.');
            }
          }}
        createNewVisualProject={createNewVisualProject}
        visualProjectId={visualProjectId}
        editorType={editorType}
        applyAudio={applyAudio}
        applyDuration={applyDuration}
      />
    </div>
  );
};

// Extracted dialogs component to reduce repetition
const DialogsSection: React.FC<{
  dialogs: ReturnType<typeof useDialogController>;
  loadVisualProject: (id: string) => Promise<void>;
  createNewVisualProject: () => void;
  visualProjectId: string | undefined;
  editorType: EditorType;
  applyAudio: (audio: any) => void;
  applyDuration: (duration: number) => void;
}> = ({ dialogs, loadVisualProject, createNewVisualProject, visualProjectId, editorType, applyAudio, applyDuration }) => {
  return (
    <>
      <ProjectListDialog
        open={dialogs.isOpen('projectList')}
        onOpenChange={() => dialogs.close('projectList')}
        onSelectProject={loadVisualProject}
        onNewProject={() => {
          createNewVisualProject();
          dialogs.close('projectList');
        }}
        currentProjectId={visualProjectId}
      />
      <ProjectManager open={dialogs.isOpen('projectManager')} onOpenChange={() => dialogs.close('projectManager')} />
      <SettingsPanel open={dialogs.isOpen('settings')} onOpenChange={() => dialogs.close('settings')} />
      <KeyboardShortcutsDialog open={dialogs.isOpen('shortcuts')} onOpenChange={() => dialogs.close('shortcuts')} />
      <ScriptStatisticsDialog open={dialogs.isOpen('statistics')} onOpenChange={() => dialogs.close('statistics')} />
      <CountdownSettingsDialog open={dialogs.isOpen('countdown')} onOpenChange={() => dialogs.close('countdown')} />
      <AboutDialog open={dialogs.isOpen('about')} onOpenChange={() => dialogs.close('about')} />
      <AudioManagerDialog
        open={dialogs.isOpen('audioManager')}
        onOpenChange={() => dialogs.close('audioManager')}
        onUseInProject={editorType === 'visual' ? applyAudio : undefined}
      />
      <RemoteControlDialog open={dialogs.isOpen('remoteControl')} onOpenChange={() => dialogs.close('remoteControl')} />
      <VoiceInputDialog open={dialogs.isOpen('voiceInput')} onOpenChange={() => dialogs.close('voiceInput')} />
      <SegmentTimerCalculator
        open={dialogs.isOpen('timerCalculator')}
        onOpenChange={() => dialogs.close('timerCalculator')}
        onApplyDuration={editorType === 'visual' ? applyDuration : undefined}
      />
      <TemplatesDialog 
        open={dialogs.isOpen('templates')} 
        onOpenChange={() => dialogs.close('templates')}
        onSelectTemplate={(content) => {
          // Handle template selection
          console.log('Template selected:', content);
        }}
      />
      <PlayerIndicatorSettingsDialog
        open={dialogs.isOpen('playerIndicatorSettings')}
        onOpenChange={() => dialogs.close('playerIndicatorSettings')}
      />
    </>
  );
};

// Keyboard Shortcuts Dialog
const KeyboardShortcutsDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard size={20} />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 py-4">
          {KEYBOARD_SHORTCUTS.map((shortcut) => (
            <div key={shortcut.key} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted">
              <span className="text-sm text-muted-foreground">{shortcut.action}</span>
              <kbd className="px-2 py-1 text-xs bg-muted rounded border shadow-sm font-mono">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Index;
