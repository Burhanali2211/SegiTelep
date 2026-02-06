import React, { memo, useCallback } from 'react';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarCheckboxItem,
} from '@/components/ui/menubar';
import {
  FilePlus,
  FolderOpen,
  Save,
  Download,
  Upload,
  Settings,
  LogOut,
  Undo2,
  Redo2,
  Copy,
  Clipboard,
  Trash2,
  CheckSquare,
  Square,
  PanelLeftClose,
  PanelLeft,
  ZoomIn,
  ZoomOut,
  Maximize,
  FileText,
  Image,
  Expand,
  Moon,
  Sun,
  Monitor,
  Play,
  Pause,
  Square as StopIcon,
  SkipBack,
  SkipForward,
  Gauge,
  Timer,
  FlipHorizontal,
  Minus,
  Calculator,
  BarChart3,
  Music,
  LayoutTemplate,
  Keyboard,
  Radio,
  Mic,
  BookOpen,
  Video,
  HelpCircle,
  Info,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { useTeleprompterStore } from '@/store/teleprompterStore';
import { useVisualEditorState } from '@/components/Teleprompter/VisualEditor/useVisualEditorState';
import { cn } from '@/lib/utils';

interface MainMenuBarProps {
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
  onOpenAudioManager: () => void;
  onOpenRemoteControl: () => void;
  onOpenVoiceInput: () => void;
  onPlay: () => void;
  onGoHome: () => void;
  recentProjects?: Array<{ id: string; name: string }>;
  onOpenRecentProject?: (id: string) => void;
  editorType: 'text' | 'visual';
  onEditorTypeChange: (type: 'text' | 'visual') => void;
  className?: string;
}

export const MainMenuBar = memo<MainMenuBarProps>(({
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
  onPlay,
  onGoHome,
  recentProjects = [],
  onOpenRecentProject,
  editorType,
  onEditorTypeChange,
  className,
}) => {
  const hasUnsavedChanges = useTeleprompterStore((s) => s.hasUnsavedChanges);
  const segmentListCollapsed = useTeleprompterStore((s) => s.editor.segmentListCollapsed);
  const previewCollapsed = useTeleprompterStore((s) => s.editor.previewCollapsed);
  const toggleSegmentListCollapsed = useTeleprompterStore((s) => s.toggleSegmentListCollapsed);
  const togglePreviewCollapsed = useTeleprompterStore((s) => s.togglePreviewCollapsed);
  const playback = useTeleprompterStore((s) => s.playback);
  const play = useTeleprompterStore((s) => s.play);
  const pause = useTeleprompterStore((s) => s.pause);
  const stop = useTeleprompterStore((s) => s.stop);
  const nextSegment = useTeleprompterStore((s) => s.nextSegment);
  const prevSegment = useTeleprompterStore((s) => s.prevSegment);
  const setSpeed = useTeleprompterStore((s) => s.setSpeed);
  const toggleMirror = useTeleprompterStore((s) => s.toggleMirror);
  const project = useTeleprompterStore((s) => s.project);
  
  // Visual editor state
  const zoom = useVisualEditorState((s) => s.zoom);
  const setZoom = useVisualEditorState((s) => s.setZoom);
  
  const handlePlayPause = useCallback(() => {
    if (playback.isPlaying && !playback.isPaused) {
      pause();
    } else {
      play();
    }
  }, [playback.isPlaying, playback.isPaused, play, pause]);
  
  const speedPresets = [50, 75, 100, 125, 150, 200];
  
  return (
    <Menubar className={cn('border-none bg-transparent h-8 p-0 space-x-0', className)}>
      {/* File Menu */}
      <MenubarMenu>
        <MenubarTrigger className="px-3 py-1 text-sm font-medium cursor-pointer">
          File
        </MenubarTrigger>
        <MenubarContent>
          <MenubarItem onClick={onNewProject}>
            <FilePlus size={16} className="mr-2" />
            New Project
            <MenubarShortcut>⌘N</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onClick={onOpenProject}>
            <FolderOpen size={16} className="mr-2" />
            Open Project
            <MenubarShortcut>⌘O</MenubarShortcut>
          </MenubarItem>
          
          {recentProjects.length > 0 && (
            <MenubarSub>
              <MenubarSubTrigger>
                <Clock size={16} className="mr-2" />
                Open Recent
              </MenubarSubTrigger>
              <MenubarSubContent>
                {recentProjects.slice(0, 5).map((proj) => (
                  <MenubarItem key={proj.id} onClick={() => onOpenRecentProject?.(proj.id)}>
                    {proj.name}
                  </MenubarItem>
                ))}
              </MenubarSubContent>
            </MenubarSub>
          )}
          
          <MenubarSeparator />
          
          <MenubarItem onClick={onSave} disabled={!hasUnsavedChanges}>
            <Save size={16} className="mr-2" />
            Save
            <MenubarShortcut>⌘S</MenubarShortcut>
          </MenubarItem>
          
          <MenubarSeparator />
          
          <MenubarItem onClick={onImport}>
            <Upload size={16} className="mr-2" />
            Import Project
          </MenubarItem>
          <MenubarItem onClick={onExport}>
            <Download size={16} className="mr-2" />
            Export Project
            <MenubarShortcut>⇧⌘S</MenubarShortcut>
          </MenubarItem>
          
          <MenubarSub>
            <MenubarSubTrigger disabled>
              <Download size={16} className="mr-2" />
              Export as...
            </MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem disabled>
                <FileText size={16} className="mr-2" />
                PDF (Coming Soon)
              </MenubarItem>
              <MenubarItem disabled>
                <Video size={16} className="mr-2" />
                Video (Coming Soon)
              </MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          
          <MenubarSeparator />
          
          <MenubarItem onClick={onOpenSettings}>
            <Settings size={16} className="mr-2" />
            Project Settings
          </MenubarItem>
          
          <MenubarSeparator />
          
          <MenubarItem onClick={onGoHome}>
            <LogOut size={16} className="mr-2" />
            Exit to Home
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      
      {/* Edit Menu */}
      <MenubarMenu>
        <MenubarTrigger className="px-3 py-1 text-sm font-medium cursor-pointer">
          Edit
        </MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            <Undo2 size={16} className="mr-2" />
            Undo
            <MenubarShortcut>⌘Z</MenubarShortcut>
          </MenubarItem>
          <MenubarItem>
            <Redo2 size={16} className="mr-2" />
            Redo
            <MenubarShortcut>⇧⌘Z</MenubarShortcut>
          </MenubarItem>
          
          <MenubarSeparator />
          
          <MenubarItem>
            <Copy size={16} className="mr-2" />
            Copy
            <MenubarShortcut>⌘C</MenubarShortcut>
          </MenubarItem>
          <MenubarItem>
            <Clipboard size={16} className="mr-2" />
            Paste
            <MenubarShortcut>⌘V</MenubarShortcut>
          </MenubarItem>
          <MenubarItem>
            <Copy size={16} className="mr-2" />
            Duplicate
            <MenubarShortcut>⌘D</MenubarShortcut>
          </MenubarItem>
          <MenubarItem>
            <Trash2 size={16} className="mr-2" />
            Delete
            <MenubarShortcut>Del</MenubarShortcut>
          </MenubarItem>
          
          <MenubarSeparator />
          
          <MenubarItem>
            <CheckSquare size={16} className="mr-2" />
            Select All
            <MenubarShortcut>⌘A</MenubarShortcut>
          </MenubarItem>
          <MenubarItem>
            <Square size={16} className="mr-2" />
            Deselect All
            <MenubarShortcut>Esc</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      
      {/* View Menu */}
      <MenubarMenu>
        <MenubarTrigger className="px-3 py-1 text-sm font-medium cursor-pointer">
          View
        </MenubarTrigger>
        <MenubarContent>
          <MenubarCheckboxItem 
            checked={!segmentListCollapsed}
            onCheckedChange={() => toggleSegmentListCollapsed()}
          >
            {segmentListCollapsed ? <PanelLeft size={16} className="mr-2" /> : <PanelLeftClose size={16} className="mr-2" />}
            Sidebar
            <MenubarShortcut>⌘B</MenubarShortcut>
          </MenubarCheckboxItem>
          
          <MenubarCheckboxItem 
            checked={!previewCollapsed}
            onCheckedChange={() => togglePreviewCollapsed()}
          >
            Preview Panel
          </MenubarCheckboxItem>
          
          <MenubarSeparator />
          
          <MenubarItem onClick={() => setZoom(zoom + 0.25)}>
            <ZoomIn size={16} className="mr-2" />
            Zoom In
            <MenubarShortcut>+</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onClick={() => setZoom(zoom - 0.25)}>
            <ZoomOut size={16} className="mr-2" />
            Zoom Out
            <MenubarShortcut>-</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onClick={() => setZoom(1)}>
            <Maximize size={16} className="mr-2" />
            Fit to Window
            <MenubarShortcut>⌘0</MenubarShortcut>
          </MenubarItem>
          
          <MenubarSeparator />
          
          <MenubarCheckboxItem 
            checked={editorType === 'text'}
            onCheckedChange={() => onEditorTypeChange('text')}
          >
            <FileText size={16} className="mr-2" />
            Text Mode
          </MenubarCheckboxItem>
          <MenubarCheckboxItem 
            checked={editorType === 'visual'}
            onCheckedChange={() => onEditorTypeChange('visual')}
          >
            <Image size={16} className="mr-2" />
            Visual Mode
          </MenubarCheckboxItem>
          
          <MenubarSeparator />
          
          <MenubarSub>
            <MenubarSubTrigger>
              <Monitor size={16} className="mr-2" />
              Theme
            </MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem disabled>
                <Sun size={16} className="mr-2" />
                Light (Coming Soon)
              </MenubarItem>
              <MenubarItem disabled>
                <Moon size={16} className="mr-2" />
                Dark (Coming Soon)
              </MenubarItem>
              <MenubarItem disabled>
                <Monitor size={16} className="mr-2" />
                System (Coming Soon)
              </MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
        </MenubarContent>
      </MenubarMenu>
      
      {/* Playback Menu */}
      <MenubarMenu>
        <MenubarTrigger className="px-3 py-1 text-sm font-medium cursor-pointer">
          Playback
        </MenubarTrigger>
        <MenubarContent>
          <MenubarItem onClick={handlePlayPause}>
            {playback.isPlaying && !playback.isPaused ? (
              <>
                <Pause size={16} className="mr-2" />
                Pause
              </>
            ) : (
              <>
                <Play size={16} className="mr-2" />
                Play
              </>
            )}
            <MenubarShortcut>Space</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onClick={stop} disabled={!playback.isPlaying}>
            <StopIcon size={16} className="mr-2" />
            Stop
            <MenubarShortcut>Esc</MenubarShortcut>
          </MenubarItem>
          
          <MenubarSeparator />
          
          <MenubarItem onClick={prevSegment}>
            <SkipBack size={16} className="mr-2" />
            Previous Segment
            <MenubarShortcut>←</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onClick={nextSegment}>
            <SkipForward size={16} className="mr-2" />
            Next Segment
            <MenubarShortcut>→</MenubarShortcut>
          </MenubarItem>
          
          <MenubarSeparator />
          
          <MenubarSub>
            <MenubarSubTrigger>
              <Gauge size={16} className="mr-2" />
              Speed Presets
            </MenubarSubTrigger>
            <MenubarSubContent>
              {speedPresets.map((speed) => (
                <MenubarCheckboxItem
                  key={speed}
                  checked={playback.speed === speed}
                  onCheckedChange={() => setSpeed(speed)}
                >
                  {speed}%
                </MenubarCheckboxItem>
              ))}
            </MenubarSubContent>
          </MenubarSub>
          
          <MenubarItem onClick={onOpenCountdown}>
            <Timer size={16} className="mr-2" />
            Countdown Settings
          </MenubarItem>
          
          <MenubarSeparator />
          
          <MenubarItem onClick={onPlay}>
            <Maximize size={16} className="mr-2" />
            Fullscreen Player
            <MenubarShortcut>F</MenubarShortcut>
          </MenubarItem>
          
          <MenubarItem disabled>
            <Monitor size={16} className="mr-2" />
            External Display (Coming Soon)
          </MenubarItem>
          
          <MenubarSeparator />
          
          <MenubarCheckboxItem 
            checked={project?.settings.mirrorMode ?? false}
            onCheckedChange={() => toggleMirror()}
          >
            <FlipHorizontal size={16} className="mr-2" />
            Mirror Mode
            <MenubarShortcut>M</MenubarShortcut>
          </MenubarCheckboxItem>
          
          <MenubarCheckboxItem checked={project?.settings.showGuide ?? true}>
            <Minus size={16} className="mr-2" />
            Show Guide Line
          </MenubarCheckboxItem>
        </MenubarContent>
      </MenubarMenu>
      
      {/* Tools Menu */}
      <MenubarMenu>
        <MenubarTrigger className="px-3 py-1 text-sm font-medium cursor-pointer">
          Tools
        </MenubarTrigger>
        <MenubarContent>
          <MenubarItem onClick={onOpenStatistics}>
            <BarChart3 size={16} className="mr-2" />
            Script Statistics
          </MenubarItem>
          
          <MenubarItem disabled>
            <Calculator size={16} className="mr-2" />
            Segment Timer Calculator (Coming Soon)
          </MenubarItem>
          
          <MenubarSeparator />
          
          <MenubarItem onClick={onOpenAudioManager}>
            <Music size={16} className="mr-2" />
            Audio Manager
          </MenubarItem>
          
          <MenubarSeparator />
          
          <MenubarSub>
            <MenubarSubTrigger disabled>
              <LayoutTemplate size={16} className="mr-2" />
              Templates
            </MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem disabled>Coming Soon</MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          
          <MenubarSeparator />
          
          <MenubarItem onClick={onOpenShortcuts}>
            <Keyboard size={16} className="mr-2" />
            Keyboard Shortcuts
            <MenubarShortcut>?</MenubarShortcut>
          </MenubarItem>
          
          <MenubarItem onClick={onOpenRemoteControl}>
            <Radio size={16} className="mr-2" />
            Remote Control
          </MenubarItem>
          
          <MenubarItem onClick={onOpenVoiceInput}>
            <Mic size={16} className="mr-2" />
            Voice Input
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      
      {/* Help Menu */}
      <MenubarMenu>
        <MenubarTrigger className="px-3 py-1 text-sm font-medium cursor-pointer">
          Help
        </MenubarTrigger>
        <MenubarContent>
          <MenubarItem onClick={onGoHome}>
            <BookOpen size={16} className="mr-2" />
            Welcome Guide
          </MenubarItem>
          <MenubarItem onClick={onOpenShortcuts}>
            <Keyboard size={16} className="mr-2" />
            Keyboard Shortcuts
            <MenubarShortcut>?</MenubarShortcut>
          </MenubarItem>
          
          <MenubarSeparator />
          
          <MenubarItem onClick={() => window.open('https://docs.example.com', '_blank')}>
            <ExternalLink size={16} className="mr-2" />
            Documentation
          </MenubarItem>
          <MenubarItem onClick={() => window.open('https://youtube.com', '_blank')}>
            <Video size={16} className="mr-2" />
            Video Tutorials
          </MenubarItem>
          
          <MenubarSeparator />
          
          <MenubarItem disabled>
            <Download size={16} className="mr-2" />
            Check for Updates (Coming Soon)
          </MenubarItem>
          
          <MenubarSeparator />
          
          <MenubarItem onClick={onOpenAbout}>
            <Info size={16} className="mr-2" />
            About ProTeleprompter
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
});

MainMenuBar.displayName = 'MainMenuBar';
