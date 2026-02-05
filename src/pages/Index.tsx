import React, { useEffect, useState, useMemo, forwardRef } from 'react';
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
import { MiniPreview } from '@/components/Teleprompter/MiniPreview';
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
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Menu,
  FolderOpen,
  Save,
  Settings,
  Monitor,
  Keyboard,
  PanelLeftClose,
  PanelLeft,
  Maximize2,
  Minimize2,
  FileText,
  Image,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

type EditorType = 'text' | 'visual';

const Index = () => {
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [editorType, setEditorType] = useState<EditorType>('text');
  
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
  
  // Determine which editor to show based on selected segment type
  const selectedSegment = useMemo(() => {
    return project?.segments.find((s) => s.id === selectedSegmentId);
  }, [project?.segments, selectedSegmentId]);
  
  // Auto-detect editor type from selected segment
  useEffect(() => {
    if (selectedSegment) {
      const isVisual = isVisualSegment(selectedSegment);
      setEditorType(isVisual ? 'visual' : 'text');
    }
  }, [selectedSegment]);
  
  const showVisualEditor = editorType === 'visual';
  
  // Auto-switch layout mode based on editor type
  useEffect(() => {
    if (showVisualEditor && layoutMode === 'default') {
      setLayoutMode('visual-expanded');
    } else if (!showVisualEditor && layoutMode === 'visual-expanded') {
      setLayoutMode('default');
    }
  }, [showVisualEditor, layoutMode, setLayoutMode]);
  
  // Initialize - load most recent project or create new
  useEffect(() => {
    const init = async () => {
      const projects = await getAllProjects();
      
      if (projects.length > 0) {
        const recent = await loadProject(projects[0].id);
        if (recent) {
          setProject(recent);
        }
      } else {
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

  // Type Selector Component
  const TypeSelector = () => (
    <Tabs value={editorType} onValueChange={(v) => setEditorType(v as EditorType)} className="ml-4">
      <TabsList className="h-8">
        <TabsTrigger value="text" className="text-xs h-7 px-3">
          <FileText size={14} className="mr-1.5" />
          Text Mode
        </TabsTrigger>
        <TabsTrigger value="visual" className="text-xs h-7 px-3">
          <Image size={14} className="mr-1.5" />
          Visual Mode
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );

  // Visual Mode Layout - Optimized for region editing
  if (layoutMode === 'visual-expanded') {
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
            
            <TypeSelector />
            
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
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={toggleSegmentListCollapsed}
                >
                  {segmentListCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{segmentListCollapsed ? 'Show Segments' : 'Hide Segments'}</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setLayoutMode('default')}
                >
                  <Minimize2 size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Exit Visual Mode</TooltipContent>
            </Tooltip>
            
            <Button variant="ghost" size="icon" onClick={() => setShowProjectManager(true)}>
              <FolderOpen size={18} />
            </Button>
          </div>
        </header>
        
        {/* Main Content - Visual Optimized */}
        <main className="flex-1 min-h-0 flex overflow-hidden">
          {/* Collapsible Segment List */}
          <div 
            className={cn(
              'border-r border-border bg-card transition-all duration-200 shrink-0 overflow-hidden',
              segmentListCollapsed ? 'w-12' : 'w-56'
            )}
          >
            {segmentListCollapsed ? (
              <CollapsedSegmentList />
            ) : (
              <SegmentList />
            )}
          </div>
          
          {/* Visual Editor - Takes most space */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <VisualSegmentEditor className="flex-1 min-h-0" />
            
            {/* Mini Preview at bottom */}
            <MiniPreview 
              collapsed={previewCollapsed}
              onToggleCollapse={togglePreviewCollapsed}
              onExpand={() => setLayoutMode('default')}
            />
          </div>
        </main>
        
        {/* Dialogs */}
        <ProjectManager open={showProjectManager} onOpenChange={setShowProjectManager} />
        <SettingsPanel open={showSettings} onOpenChange={setShowSettings} />
        <KeyboardShortcutsDialog open={showShortcuts} onOpenChange={setShowShortcuts} />
      </div>
    );
  }
  
  // Default Mode Layout - 3 Panel
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
          
          <TypeSelector />
          
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
          {showVisualEditor && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setLayoutMode('visual-expanded')}
                >
                  <Maximize2 size={16} className="mr-2" />
                  Expand Editor
                </Button>
              </TooltipTrigger>
              <TooltipContent>Maximize editor for region drawing</TooltipContent>
            </Tooltip>
          )}
          
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
          
          {/* Editor - Dynamic based on editor type */}
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
      
      {/* Dialogs */}
      <ProjectManager open={showProjectManager} onOpenChange={setShowProjectManager} />
      <SettingsPanel open={showSettings} onOpenChange={setShowSettings} />
      <KeyboardShortcutsDialog open={showShortcuts} onOpenChange={setShowShortcuts} />
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
  if (!open) return null;
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={() => onOpenChange(false)}
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
          onClick={() => onOpenChange(false)}
        >
          Close
        </Button>
      </div>
    </div>
  );
};

export default Index;
