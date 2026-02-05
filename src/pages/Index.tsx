import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useTeleprompterStore } from '@/store/teleprompterStore';
import { createProject, getAllProjects, loadProject } from '@/core/storage/ProjectStorage';
import { isVisualSegment } from '@/types/teleprompter.types';
import {
  SegmentList,
  TeleprompterDisplay,
  ProjectManager,
  SettingsPanel,
  TextSegmentEditor,
  VisualSegmentEditor,
} from '@/components/Teleprompter';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Menu,
  FolderOpen,
  Save,
  Settings,
  Monitor,
  Keyboard,
  HelpCircle,
} from 'lucide-react';

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
];

const Index = () => {
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [initialized, setInitialized] = useState(false);
  
  const project = useTeleprompterStore((s) => s.project);
  const selectedSegmentId = useTeleprompterStore((s) => s.editor.selectedSegmentId);
  const setProject = useTeleprompterStore((s) => s.setProject);
  const hasUnsavedChanges = useTeleprompterStore((s) => s.hasUnsavedChanges);
  const saveCurrentProject = useTeleprompterStore((s) => s.saveCurrentProject);
  const addSegment = useTeleprompterStore((s) => s.addSegment);
  
  // Determine which editor to show based on selected segment type
  const selectedSegment = useMemo(() => {
    return project?.segments.find((s) => s.id === selectedSegmentId);
  }, [project?.segments, selectedSegmentId]);
  
  const showVisualEditor = selectedSegment && isVisualSegment(selectedSegment);
  
  // Initialize - load most recent project or create new
  useEffect(() => {
    const init = async () => {
      const projects = await getAllProjects();
      
      if (projects.length > 0) {
        // Load most recent
        const recent = await loadProject(projects[0].id);
        if (recent) {
          setProject(recent);
        }
      } else {
        // Create default project
        const newProject = await createProject('My First Script');
        setProject(newProject);
      }
      
      setInitialized(true);
    };
    
    init();
  }, [setProject]);
  
  // Keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveCurrentProject();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveCurrentProject]);
  
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
  
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu size={20} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setShowProjectManager(true)}>
                <FolderOpen size={16} className="mr-2" />
                Open Project
              </DropdownMenuItem>
              <DropdownMenuItem onClick={saveCurrentProject} disabled={!hasUnsavedChanges}>
                <Save size={16} className="mr-2" />
                Save
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowShortcuts(true)}>
                <Keyboard size={16} className="mr-2" />
                Keyboard Shortcuts
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowSettings(true)}>
                <Settings size={16} className="mr-2" />
                Project Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="flex items-center gap-2">
            <Monitor size={20} className="text-primary" />
            <span className="font-semibold text-lg">ProTeleprompter</span>
          </div>
          
          {project && (
            <div className="flex items-center gap-2 ml-4 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{project.name}</span>
              {hasUnsavedChanges && (
                <span className="text-xs px-1.5 py-0.5 bg-accent/20 text-accent rounded">
                  Unsaved
                </span>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
                <Settings size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Project Settings</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setShowShortcuts(true)}>
                <Keyboard size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Keyboard shortcuts</TooltipContent>
          </Tooltip>
          
          <Button variant="ghost" size="icon" onClick={() => setShowProjectManager(true)}>
            <FolderOpen size={18} />
          </Button>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 min-h-0 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Segment List */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <div className="h-full overflow-hidden">
              <SegmentList />
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          {/* Editor - Dynamic based on segment type */}
          <ResizablePanel defaultSize={35} minSize={25}>
            <div className="h-full overflow-hidden">
              {showVisualEditor ? (
                <VisualSegmentEditor />
              ) : (
                <TextSegmentEditor />
              )}
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          {/* Teleprompter Display */}
          <ResizablePanel defaultSize={45} minSize={30}>
            <div className="h-full overflow-hidden">
              <TeleprompterDisplay className="h-full" />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
      
      {/* Project Manager Dialog */}
      <ProjectManager 
        open={showProjectManager} 
        onOpenChange={setShowProjectManager} 
      />
      
      {/* Settings Panel Dialog */}
      <SettingsPanel 
        open={showSettings} 
        onOpenChange={setShowSettings} 
      />
      
      {/* Keyboard Shortcuts Dialog */}
      {showShortcuts && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setShowShortcuts(false)}
        >
          <div 
            className="bg-card rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Keyboard size={20} />
              Keyboard Shortcuts
            </h2>
            <div className="space-y-2">
              {KEYBOARD_SHORTCUTS.map(({ key, action }) => (
                <div key={key} className="flex items-center justify-between py-1.5">
                  <span className="text-muted-foreground">{action}</span>
                  <kbd className="kbd px-2">{key}</kbd>
                </div>
              ))}
            </div>
            <Button 
              className="w-full mt-4" 
              variant="secondary"
              onClick={() => setShowShortcuts(false)}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
