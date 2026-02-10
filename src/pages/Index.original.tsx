import React, { useEffect, useCallback, useMemo, useState, forwardRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTeleprompterStore } from '@/store/teleprompterStore';
import { createProject, getAllProjects, loadProject } from '@/core/storage/ProjectStorage';
import { isVisualSegment } from '@/types/teleprompter.types';
import {
  SegmentList,
  TeleprompterDisplay,
  ProjectManager,
  SettingsPanel,
  TextSegmentEditor,
} from '@/components/Teleprompter';
import { VisualEditor } from '@/components/Teleprompter/VisualEditor';
import { ProjectListDialog } from '@/components/Teleprompter/VisualEditor/ProjectListDialog';
import { MiniPreview } from '@/components/Teleprompter/MiniPreview';
import { AppHeader } from '@/components/Layout';
import { ScriptStatisticsDialog } from '@/components/Teleprompter/ScriptStatisticsDialog';
import { CountdownSettingsDialog } from '@/components/Teleprompter/CountdownSettingsDialog';
import { AboutDialog } from '@/components/Teleprompter/AboutDialog';
import { AudioManagerDialog } from '@/components/Teleprompter/AudioManager';
import { RemoteControlDialog, RemoteControlListener } from '@/components/Teleprompter/RemoteControl';
import { VoiceInputDialog } from '@/components/Teleprompter/VoiceInput';
import { SegmentTimerCalculator } from '@/components/Teleprompter/SegmentTimerCalculator';
import { TemplatesDialog } from '@/components/Teleprompter/TemplatesDialog';
import { exportToPDF } from '@/utils/exportPDF';
import { openExternalDisplay } from '@/utils/externalDisplay';
import { Button } from '@/components/ui/button';
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
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import {
  Keyboard,
  PanelLeftClose,
  PanelLeft,
  Minimize2,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportVisualProject, importVisualProject } from '@/core/storage/VisualProjectStorage';
import { useVisualProjectSession, getRecentProjects } from '@/hooks/useVisualProjectSession';
import { useVisualEditorState } from '@/components/Teleprompter/VisualEditor/useVisualEditorState';
import { useDeveloperConsole } from '@/hooks/useDeveloperConsole';
import { toast } from 'sonner';
import { HomePage } from './HomePage';
import { P2PSharingDialog } from '@/components/P2P/P2PSharingDialog';

type AppView = 'home' | 'text' | 'visual';

const KEYBOARD_SHORTCUTS = [
  { key: 'Space', action: 'Play / Pause' },
  { key: '←', action: 'Previous segment' },
  { key: '→', action: 'Next segment' },
  { key: '↑', action: 'Increase speed' },
  { key: '↓', action: 'Decrease speed' },
  { key: 'M', action: 'Toggle mirror' },
  { key: 'F', action: 'Fullscreen' },
  { key: 'Esc', action: 'Exit / Stop' },
  { key: 'Ctrl+S', action: 'Save project' },
  { key: 'Ctrl+N', action: 'New project' },
  { key: 'Ctrl+O', action: 'Open project' },
  { key: '?', action: 'Show shortcuts' },
];

type EditorType = 'text' | 'visual';

const Index = () => {
  // Developer console
  const { toggleConsole } = useDeveloperConsole();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Initialize app view from localStorage or default to 'home'
  const [appView, setAppView] = useState<AppView>(() => {
    const saved = localStorage.getItem('teleprompter-app-view');
    return (saved as AppView) || 'home';
  });
  
  // Initialize editor type from localStorage or default to 'text'
  const [editorType, setEditorType] = useState<EditorType>(() => {
    const saved = localStorage.getItem('teleprompter-editor-type');
    return (saved as EditorType) || 'text';
  });
  
  // Update URL when view changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (appView !== 'home') {
      params.set('view', appView);
    }
    if (editorType !== 'text') {
      params.set('editor', editorType);
    }
    
    const newUrl = params.toString() ? `/?${params.toString()}` : '/';
    navigate(newUrl, { replace: true });
  }, [appView, editorType, navigate]);
  
  // Persist app view changes to localStorage
  useEffect(() => {
    localStorage.setItem('teleprompter-app-view', appView);
  }, [appView]);
  
  // Persist editor type changes to localStorage
  useEffect(() => {
    localStorage.setItem('teleprompter-editor-type', editorType);
  }, [editorType]);
  
  // Dialog states
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [showProjectList, setShowProjectList] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showAudioManager, setShowAudioManager] = useState(false);
  const [showRemoteControl, setShowRemoteControl] = useState(false);
  const [showP2PSharing, setShowP2PSharing] = useState(false);
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const [showTimerCalculator, setShowTimerCalculator] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  
  const [initialized, setInitialized] = useState(false);
  const [recentProjects, setRecentProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [showMobileSegments, setShowMobileSegments] = useState(true);
  
  const project = useTeleprompterStore((s) => s.project);
  const selectedSegmentId = useTeleprompterStore((s) => s.editor.selectedSegmentId);
  const layoutMode = useTeleprompterStore((s) => s.editor.layoutMode);
  const segmentListCollapsed = useTeleprompterStore((s) => s.editor.segmentListCollapsed);
  const previewCollapsed = useTeleprompterStore((s) => s.editor.previewCollapsed);
  const setProject = useTeleprompterStore((s) => s.setProject);
  const hasUnsavedChanges = useTeleprompterStore((s) => s.hasUnsavedChanges);
  const saveCurrentProject = useTeleprompterStore((s) => s.saveCurrentProject);
  const addSegment = useTeleprompterStore((s) => s.addSegment);
  const setLayoutMode = useTeleprompterStore((s) => s.setLayoutMode);
  const toggleSegmentListCollapsed = useTeleprompterStore((s) => s.toggleSegmentListCollapsed);
  const togglePreviewCollapsed = useTeleprompterStore((s) => s.togglePreviewCollapsed);
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
  
  // Visual editor state
  const visualProjectName = useVisualEditorState((s) => s.projectName);
  const setVisualProjectName = useVisualEditorState((s) => s.setProjectName);
  const lastSaved = useVisualEditorState((s) => s.lastSaved);
  const pages = useVisualEditorState((s) => s.pages);
  const audioFile = useVisualEditorState((s) => s.audioFile);
  const visualIsPlaying = useVisualEditorState((s) => s.isPlaying);
  const visualSetPlaying = useVisualEditorState((s) => s.setPlaying);
  
  // Handle page visibility change to detect refresh and restore proper view
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && project) {
        // When page becomes visible and we have a project, ensure we're in the correct view
        if (appView === 'home' && project.segments.length > 0) {
          // If we have a project with segments but are on home view, 
          // switch to the appropriate editor view
          const hasVisualSegments = project.segments.some(s => 
            s.type === 'image' || s.type === 'image-region' || s.type === 'pdf-page'
          );
          if (hasVisualSegments && editorType === 'visual') {
            setAppView('visual');
          } else if (editorType === 'text') {
            setAppView('text');
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [appView, project, editorType, setAppView]);
  
  // Determine which editor to show based on selected segment type
  const selectedSegment = useMemo(() => {
    return project?.segments.find((s) => s.id === selectedSegmentId);
  }, [project?.segments, selectedSegmentId]);
  
  // Auto-detect editor type from selected segment (only when in text layout - prevents switching from visual to text)
  useEffect(() => {
    if (layoutMode !== 'default' || appView !== 'text') return;
    if (selectedSegment) {
      const isVisual = isVisualSegment(selectedSegment);
      setEditorType(isVisual ? 'visual' : 'text');
    }
  }, [selectedSegment, layoutMode, appView]);
  
  const showVisualEditor = editorType === 'visual';
  
  // Auto-switch layout mode based on editor type (only when in text app view - prevents visual→text switch on refresh)
  useEffect(() => {
    if (appView !== 'text') return;
    if (showVisualEditor && layoutMode === 'default') {
      setLayoutMode('visual-expanded');
    } else if (!showVisualEditor && layoutMode === 'visual-expanded') {
      setLayoutMode('default');
    }
  }, [showVisualEditor, layoutMode, setLayoutMode, appView]);
  
  // Fetch recent projects
  useEffect(() => {
    const fetchRecent = async () => {
      const projects = await getRecentProjects(5);
      setRecentProjects(projects.map(p => ({ id: p.id, name: p.name })));
    };
    fetchRecent();
  }, []);
  
  // Initialize text editor only when user opens it (not on app load)
  useEffect(() => {
    if (appView !== 'text') return;
    if (initialized) return;

    const init = async () => {
      const projects = await getAllProjects();
      if (projects.length > 0) {
        const recent = await loadProject(projects[0].id);
        if (recent) setProject(recent);
      } else {
        const newProject = await createProject('My First Script');
        setProject(newProject);
      }
      setInitialized(true);
    };
    init();
  }, [appView, initialized, setProject]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      const ctrl = e.ctrlKey || e.metaKey;
      
      if (ctrl && e.key === 's') {
        e.preventDefault();
        if (showVisualEditor) {
          saveVisualProject();
        } else {
          saveCurrentProject();
        }
      }
      
      if (ctrl && e.key === 'n') {
        e.preventDefault();
        if (showVisualEditor) {
          createNewVisualProject();
        }
      }
      
      if (ctrl && e.key === 'o') {
        e.preventDefault();
        setShowProjectManager(true);
      }
      
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowShortcuts(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveCurrentProject, saveVisualProject, createNewVisualProject, showVisualEditor]);
  
  // Add first segment if project is empty
  useEffect(() => {
    if (project && project.segments.length === 0) {
      addSegment({
        name: 'Introduction',
        content: `Welcome to ProTeleprompter!

This is your first segment. Click here to edit the text that will scroll on your teleprompter.

Here are some tips to get started:

• Use the segment list on the left to organize your script
• Adjust speed, font size, and colors in the editor toolbar
• Press SPACE to start/pause playback
• Use arrow keys to navigate between segments
• Press F for fullscreen mode
• Press M to mirror the display

Your text will scroll smoothly at the speed you set. Try adjusting the scroll speed using the up/down arrow keys during playback.

Delete this text and start writing your own script!`,
      });
    }
  }, [project?.id, project?.segments.length, addSegment]);
  
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
  
  // Go home handler - returns to home page from either editor
  const handleGoHome = useCallback(() => {
    setAppView('home');
    setStartupMode('welcome');
    setLayoutMode('default');
  }, [setStartupMode, setLayoutMode]);

  // Open text editor from home
  const handleOpenTextEditor = useCallback(() => {
    setAppView('text');
    setLayoutMode('default');
    setEditorType('text');
  }, [setLayoutMode]);

  // Open visual editor from home
  const handleOpenVisualEditor = useCallback(() => {
    setAppView('visual');
    setLayoutMode('visual-expanded');
    setEditorType('visual');
    setStartupMode('welcome');
  }, [setLayoutMode, setStartupMode]);
  
  // Check if can play
  const totalSegments = pages.reduce((acc, p) => acc + p.segments.filter(s => !s.isHidden).length, 0);
  const canPlay = totalSegments > 0 || (project?.segments.length ?? 0) > 0;
  
  const setShowPlayer = useVisualEditorState((s) => s.setShowPlayer);
  
  const handleOpenProject = useCallback(() => {
    if (layoutMode === 'visual-expanded') {
      setShowProjectList(true);
    } else {
      setShowProjectManager(true);
    }
  }, [layoutMode]);
  
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

  // Visual Mode Layout - Optimized for region editing
  if (layoutMode === 'visual-expanded') {
    return (
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        <RemoteControlListener />
        {/* Unified Header */}
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
          onOpenSettings={() => setShowSettings(true)}
          onOpenShortcuts={() => setShowShortcuts(true)}
          onOpenStatistics={() => setShowStatistics(true)}
          onOpenCountdown={() => setShowCountdown(true)}
          onOpenAbout={() => setShowAbout(true)}
          onOpenAudioManager={() => setShowAudioManager(true)}
          onOpenRemoteControl={() => setShowRemoteControl(true)}
          onOpenP2PSharing={() => setShowP2PSharing(true)}
          onOpenVoiceInput={() => setShowVoiceInput(true)}
          onOpenTimerCalculator={() => setShowTimerCalculator(true)}
          onOpenTemplates={() => setShowTemplates(true)}
          onExportPDF={() => exportToPDF()}
          onOpenExternalDisplay={() => openExternalDisplay()}
          onPlay={handlePlay}
          onGoHome={handleGoHome}
          onToggleDevConsole={toggleConsole}
          recentProjects={recentProjects}
          onOpenRecentProject={loadVisualProject}
          canPlay={canPlay}
          isPlaying={visualIsPlaying}
          onPlayPause={() => visualSetPlaying(false)}
        />
        
        {/* Main Content - Visual Optimized */}
        <main className="flex-1 min-h-0 flex overflow-hidden">
          <VisualEditor
            className="flex-1 min-h-0"
            onOpenAudioLibrary={() => setShowAudioManager(true)}
            onGoHome={handleGoHome}
            onEditorTypeChange={(type) => {
              setEditorType(type);
              if (type === 'text') setLayoutMode('default');
            }}
            onOpenSettings={() => setShowSettings(true)}
            onOpenShortcuts={() => setShowShortcuts(true)}
          />
        </main>
        
        {/* Dialogs */}
        <ProjectListDialog
          open={showProjectList}
          onOpenChange={setShowProjectList}
          onSelectProject={loadVisualProject}
          onNewProject={() => {
            createNewVisualProject();
            setShowProjectList(false);
          }}
          currentProjectId={visualProjectId}
        />
        <ProjectManager open={showProjectManager} onOpenChange={setShowProjectManager} />
        <SettingsPanel open={showSettings} onOpenChange={setShowSettings} />
        <KeyboardShortcutsDialog open={showShortcuts} onOpenChange={setShowShortcuts} />
        <ScriptStatisticsDialog open={showStatistics} onOpenChange={setShowStatistics} />
        <CountdownSettingsDialog open={showCountdown} onOpenChange={setShowCountdown} />
        <AboutDialog open={showAbout} onOpenChange={setShowAbout} />
        <AudioManagerDialog
          open={showAudioManager}
          onOpenChange={setShowAudioManager}
          onUseInProject={
            editorType === 'visual'
              ? (audio) => useVisualEditorState.getState().setAudioFile(audio)
              : undefined
          }
        />
        <RemoteControlDialog open={showRemoteControl} onOpenChange={setShowRemoteControl} />
        <VoiceInputDialog open={showVoiceInput} onOpenChange={setShowVoiceInput} />
        <SegmentTimerCalculator
          open={showTimerCalculator}
          onOpenChange={setShowTimerCalculator}
          onApplyDuration={
            editorType === 'visual'
              ? (duration) => {
                  const state = useVisualEditorState.getState();
                  const selected = state.getSelectedSegments();
                  if (selected.length === 1) {
                    state.updateSegment(selected[0].id, {
                      endTime: selected[0].startTime + duration,
                    });
                  }
                }
              : undefined
          }
        />
      </div>
    );
  }
  
  // Default Mode Layout - 3 Panel
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <RemoteControlListener />
      {/* Unified Header */}
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
          // For text mode, create new text project
          createProject('New Script').then(setProject);
        }}
        onOpenProject={handleOpenProject}
        onSave={saveCurrentProject}
        onExport={handleExport}
        onImport={handleImport}
        onOpenSettings={() => setShowSettings(true)}
        onOpenShortcuts={() => setShowShortcuts(true)}
        onOpenStatistics={() => setShowStatistics(true)}
        onOpenCountdown={() => setShowCountdown(true)}
        onOpenAbout={() => setShowAbout(true)}
        onOpenAudioManager={() => setShowAudioManager(true)}
        onOpenRemoteControl={() => setShowRemoteControl(true)}
        onOpenP2PSharing={() => setShowP2PSharing(true)}
        onOpenVoiceInput={() => setShowVoiceInput(true)}
        onOpenTimerCalculator={() => setShowTimerCalculator(true)}
        onOpenTemplates={() => setShowTemplates(true)}
        onExportPDF={() => exportToPDF()}
        onOpenExternalDisplay={() => openExternalDisplay()}
        onPlay={handlePlay}
        onGoHome={handleGoHome}
        onToggleDevConsole={toggleConsole}
        recentProjects={recentProjects}
        onOpenRecentProject={loadVisualProject}
        canPlay={canPlay}
        isPlaying={isTextPlaying}
        onPlayPause={handlePlayPause}
      />
      
      {/* Main Content */}
      <main className="flex-1 min-h-0 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Segment List */}
          <ResizablePanel 
            defaultSize={20} 
            minSize={15} 
            maxSize={40}
            className="hidden sm:block"
          >
            <div className="h-full overflow-hidden">
              <SegmentList />
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle className="hidden sm:block" />
          
          {/* Editor - Dynamic based on editor type */}
          <ResizablePanel defaultSize={35} minSize={25} className="flex-1">
            <div className="h-full overflow-hidden">
              {showVisualEditor ? (
                <VisualEditor className="h-full" onOpenAudioLibrary={() => setShowAudioManager(true)} />
              ) : (
                <TextSegmentEditor />
              )}
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle className="hidden lg:block" />
          
          {/* Teleprompter Display */}
          <ResizablePanel defaultSize={45} minSize={30} className="hidden lg:block">
            <div className="h-full overflow-hidden">
              <TeleprompterDisplay className="h-full" />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
        
        {/* Mobile Layout - Overlay for small screens */}
        <div className="sm:hidden fixed inset-0 bg-background z-50 flex flex-col">
          <div className="flex-1 flex flex-col">
            {/* Mobile Header */}
            <div className="flex items-center justify-between p-3 border-b border-border">
              <h2 className="text-sm font-semibold">Segments</h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowMobileSegments(!showMobileSegments)}
              >
                <Plus size={16} />
              </Button>
            </div>
            
            {/* Mobile Content */}
            <div className="flex-1 overflow-hidden">
              {showMobileSegments ? (
                <div className="h-full overflow-y-auto p-3">
                  <SegmentList />
                </div>
              ) : showVisualEditor ? (
                <div className="h-full overflow-hidden">
                  <VisualEditor className="h-full" onOpenAudioLibrary={() => setShowAudioManager(true)} />
                </div>
              ) : (
                <div className="h-full overflow-hidden">
                  <TextSegmentEditor />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      {/* Dialogs */}
      <ProjectListDialog
        open={showProjectList}
        onOpenChange={setShowProjectList}
        onSelectProject={loadVisualProject}
        onNewProject={() => {
          createNewVisualProject();
          setShowProjectList(false);
        }}
        currentProjectId={visualProjectId}
      />
      <ProjectManager open={showProjectManager} onOpenChange={setShowProjectManager} />
      <SettingsPanel open={showSettings} onOpenChange={setShowSettings} />
      <KeyboardShortcutsDialog open={showShortcuts} onOpenChange={setShowShortcuts} />
      <ScriptStatisticsDialog open={showStatistics} onOpenChange={setShowStatistics} />
      <CountdownSettingsDialog open={showCountdown} onOpenChange={setShowCountdown} />
      <AboutDialog open={showAbout} onOpenChange={setShowAbout} />
      <AudioManagerDialog
        open={showAudioManager}
        onOpenChange={setShowAudioManager}
        onUseInProject={
          editorType === 'visual'
            ? (audio) => useVisualEditorState.getState().setAudioFile(audio)
            : undefined
        }
      />
      <RemoteControlDialog open={showRemoteControl} onOpenChange={setShowRemoteControl} />
      <P2PSharingDialog open={showP2PSharing} onOpenChange={setShowP2PSharing} />
      <VoiceInputDialog open={showVoiceInput} onOpenChange={setShowVoiceInput} />
      <SegmentTimerCalculator
        open={showTimerCalculator}
        onOpenChange={setShowTimerCalculator}
        onApplyDuration={
          editorType === 'visual'
            ? (duration) => {
                const state = useVisualEditorState.getState();
                const selected = state.getSelectedSegments();
                if (selected.length === 1) {
                  state.updateSegment(selected[0].id, {
                    endTime: selected[0].startTime + duration,
                  });
                }
              }
            : undefined
        }
      />
    </div>
  );
};

// Collapsed Segment List - Icon only view (with forwardRef to fix warning)
const CollapsedSegmentList = forwardRef<HTMLDivElement>((_, ref) => {
  const project = useTeleprompterStore((s) => s.project);
  const selectedSegmentId = useTeleprompterStore((s) => s.editor.selectedSegmentId);
  const selectSegment = useTeleprompterStore((s) => s.selectSegment);
  const setCurrentSegment = useTeleprompterStore((s) => s.setCurrentSegment);
  
  if (!project) return null;
  
  const getSegmentIcon = (type: string) => {
    switch (type) {
      case 'image':
        return '🖼️';
      case 'image-region':
        return '✂️';
      case 'pdf-page':
        return '📄';
      default:
        return '📝';
    }
  };
  
  return (
    <div ref={ref} className="flex flex-col h-full py-2">
      {project.segments.map((segment, index) => (
        <Tooltip key={segment.id}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                'w-full h-10 flex items-center justify-center text-lg rounded-none',
                selectedSegmentId === segment.id
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-secondary text-muted-foreground'
              )}
              onClick={() => {
                selectSegment(segment.id);
                setCurrentSegment(index);
              }}
            >
              {getSegmentIcon(segment.type)}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">{segment.name}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
});

CollapsedSegmentList.displayName = 'CollapsedSegmentList';

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
