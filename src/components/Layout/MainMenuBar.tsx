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
  Check,
  Bug,
} from 'lucide-react';
import { useTeleprompterStore } from '@/store/teleprompterStore';
import { useVisualEditorState } from '@/components/Teleprompter/VisualEditor/useVisualEditorState';
import { useUndoRedo } from '@/components/Teleprompter/VisualEditor/useUndoRedo';
import { useTheme } from '@/hooks/useTheme';
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
  onOpenTimerCalculator: () => void;
  onOpenTemplates: () => void;
  onExportPDF: () => void;
  onOpenExternalDisplay: () => void;
  onPlay: () => void;
  onGoHome: () => void;
  onToggleDevConsole?: () => void;
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
  onOpenTimerCalculator,
  onOpenTemplates,
  onExportPDF,
  onOpenExternalDisplay,
  onPlay,
  onGoHome,
  onToggleDevConsole,
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
  
  const visualIsPlaying = useVisualEditorState((s) => s.isPlaying);
  const visualPlaybackTime = useVisualEditorState((s) => s.playbackTime);
  const visualPlaybackSpeed = useVisualEditorState((s) => s.playbackSpeed);
  const visualSetPlaying = useVisualEditorState((s) => s.setPlaying);
  const visualSetPlaybackTime = useVisualEditorState((s) => s.setPlaybackTime);
  const visualSetPlaybackSpeed = useVisualEditorState((s) => s.setPlaybackSpeed);
  const project = useTeleprompterStore((s) => s.project);
  const selectedSegmentId = useTeleprompterStore((s) => s.editor.selectedSegmentId);
  const deleteSegment = useTeleprompterStore((s) => s.deleteSegment);
  const duplicateSegmentText = useTeleprompterStore((s) => s.duplicateSegment);
  const selectSegment = useTeleprompterStore((s) => s.selectSegment);
  const addSegment = useTeleprompterStore((s) => s.addSegment);
  const updateSettings = useTeleprompterStore((s) => s.updateSettings);
  
  // Visual editor state
  const zoom = useVisualEditorState((s) => s.zoom);
  const setZoom = useVisualEditorState((s) => s.setZoom);
  const selectedSegmentIds = useVisualEditorState((s) => s.selectedSegmentIds);
  const copySelected = useVisualEditorState((s) => s.copySelected);
  const paste = useVisualEditorState((s) => s.paste);
  const duplicateSegmentVisual = useVisualEditorState((s) => s.duplicateSegment);
  const deleteSegments = useVisualEditorState((s) => s.deleteSegments);
  const selectAll = useVisualEditorState((s) => s.selectAll);
  const deselectAll = useVisualEditorState((s) => s.deselectAll);
  const pages = useVisualEditorState((s) => s.pages);
  const totalVisualSegments = pages.reduce((acc, p) => acc + p.segments.length, 0);
  
  const { undo, redo, canUndo, canRedo, saveState } = useUndoRedo();
  
  // Theme
  const { theme, setTheme } = useTheme();
  
  // Edit handlers - mode-aware
  const handleUndo = useCallback(() => {
    if (editorType === 'visual') undo();
  }, [editorType, undo]);
  
  const handleRedo = useCallback(() => {
    if (editorType === 'visual') redo();
  }, [editorType, redo]);
  
  const handleCopy = useCallback(() => {
    if (editorType === 'visual') {
      copySelected();
    } else if (selectedSegmentId && project) {
      const seg = project.segments.find(s => s.id === selectedSegmentId);
      if (seg?.content) {
        navigator.clipboard.writeText(seg.content).catch(() => {});
      }
    }
  }, [editorType, copySelected, selectedSegmentId, project]);
  
  const handlePaste = useCallback(() => {
    if (editorType === 'visual') {
      saveState();
      paste();
    } else {
      navigator.clipboard.readText().then(text => {
        if (text.trim()) addSegment({ content: text, name: 'Pasted' });
      }).catch(() => {});
    }
  }, [editorType, paste, addSegment, saveState]);
  
  const handleDuplicate = useCallback(() => {
    if (editorType === 'visual') {
      const ids = Array.from(selectedSegmentIds);
      if (ids.length === 1) {
        saveState();
        duplicateSegmentVisual(ids[0]);
      }
    } else if (selectedSegmentId) {
      duplicateSegmentText(selectedSegmentId);
    }
  }, [editorType, selectedSegmentIds, selectedSegmentId, duplicateSegmentVisual, duplicateSegmentText, saveState]);
  
  const handleDelete = useCallback(() => {
    if (editorType === 'visual') {
      if (selectedSegmentIds.size > 0) {
        saveState();
        deleteSegments(Array.from(selectedSegmentIds));
      }
    } else if (selectedSegmentId) {
      deleteSegment(selectedSegmentId);
    }
  }, [editorType, selectedSegmentIds, selectedSegmentId, deleteSegments, deleteSegment, saveState]);
  
  const handleSelectAll = useCallback(() => {
    if (editorType === 'visual') selectAll();
    else if (project?.segments.length) selectSegment(project.segments[0].id);
  }, [editorType, selectAll, project, selectSegment]);
  
  const handleDeselect = useCallback(() => {
    if (editorType === 'visual') deselectAll();
    else selectSegment(null);
  }, [editorType, deselectAll, selectSegment]);
  
  const handleShowGuideChange = useCallback((checked: boolean | 'indeterminate') => {
    if (typeof checked !== 'boolean' && checked !== 'indeterminate') return;
    updateSettings({ showGuide: checked === true });
  }, [updateSettings]);
  
  const handlePlayPause = useCallback(() => {
    if (editorType === 'visual') {
      visualSetPlaying(!visualIsPlaying);
    } else {
      if (playback.isPlaying && !playback.isPaused) pause();
      else play();
    }
  }, [editorType, visualIsPlaying, visualSetPlaying, playback.isPlaying, playback.isPaused, play, pause]);
  
  const handleStop = useCallback(() => {
    if (editorType === 'visual') {
      visualSetPlaying(false);
      visualSetPlaybackTime(0);
    } else {
      stop();
    }
  }, [editorType, visualSetPlaying, visualSetPlaybackTime, stop]);
  
  const handlePrevSegment = useCallback(() => {
    if (editorType === 'visual') {
      const segs = pages.flatMap(p => p.segments.filter(s => !s.isHidden)).sort((a, b) => a.startTime - b.startTime);
      const idx = segs.findIndex(s => visualPlaybackTime >= s.startTime && visualPlaybackTime < s.endTime);
      if (idx > 0) visualSetPlaybackTime(segs[idx - 1].startTime);
      else visualSetPlaybackTime(0);
    } else {
      prevSegment();
    }
  }, [editorType, pages, visualPlaybackTime, visualSetPlaybackTime, prevSegment]);
  
  const handleNextSegment = useCallback(() => {
    if (editorType === 'visual') {
      const segs = pages.flatMap(p => p.segments.filter(s => !s.isHidden)).sort((a, b) => a.startTime - b.startTime);
      const idx = segs.findIndex(s => visualPlaybackTime >= s.startTime && visualPlaybackTime < s.endTime);
      if (idx >= 0 && idx < segs.length - 1) visualSetPlaybackTime(segs[idx + 1].startTime);
      else if (segs.length > 0) visualSetPlaybackTime(segs[segs.length - 1].endTime);
    } else {
      nextSegment();
    }
  }, [editorType, pages, visualPlaybackTime, visualSetPlaybackTime, nextSegment]);
  
  const handleSetSpeed = useCallback((speed: number) => {
    if (editorType === 'visual') {
      visualSetPlaybackSpeed(speed / 100);
    } else {
      setSpeed(speed);
    }
  }, [editorType, visualSetPlaybackSpeed, setSpeed]);
  
  const isPlaybackActive = editorType === 'visual' ? visualIsPlaying : (playback.isPlaying && !playback.isPaused);
  
  const speedPresets = [50, 75, 100, 125, 150, 200];
  
  return (
    <Menubar className={cn('border-none bg-transparent h-8 p-0 space-x-0', className)}>
      {/* File Menu - Simplified */}
      <MenubarMenu>
        <MenubarTrigger className="px-3 py-1 text-sm font-medium cursor-pointer">
          File
        </MenubarTrigger>
        <MenubarContent>
          <MenubarItem onSelect={onNewProject}>
            <FilePlus size={16} className="mr-2" />
            New Project
            <MenubarShortcut>⌘N</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={onOpenProject}>
            <FolderOpen size={16} className="mr-2" />
            Open Project
            <MenubarShortcut>⌘O</MenubarShortcut>
          </MenubarItem>
          
          <MenubarSeparator />
          
          <MenubarItem onSelect={onSave} disabled={!hasUnsavedChanges}>
            <Save size={16} className="mr-2" />
            Save
            <MenubarShortcut>⌘S</MenubarShortcut>
          </MenubarItem>
          
          <MenubarSeparator />
          
          {/* Consolidated Export/Import */}
          <MenubarSub>
            <MenubarSubTrigger>
              <Download size={16} className="mr-2" />
              Import & Export
            </MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem onSelect={onImport}>
                <Upload size={16} className="mr-2" />
                Import Project
              </MenubarItem>
              <MenubarItem onSelect={onExport}>
                <Download size={16} className="mr-2" />
                Export Project
                <MenubarShortcut>⇧⌘S</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={onExportPDF}>
                <FileText size={16} className="mr-2" />
                Export as PDF
              </MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          
          <MenubarSeparator />
          
          <MenubarItem onSelect={onGoHome}>
            <LogOut size={16} className="mr-2" />
            Exit to Home
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      
      {/* Edit Menu - Streamlined */}
      <MenubarMenu>
        <MenubarTrigger className="px-3 py-1 text-sm font-medium cursor-pointer">
          Edit
        </MenubarTrigger>
        <MenubarContent>
          <MenubarItem onSelect={handleUndo} disabled={editorType !== 'visual' || !canUndo}>
            <Undo2 size={16} className="mr-2" />
            Undo
            <MenubarShortcut>⌘Z</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={handleRedo} disabled={editorType !== 'visual' || !canRedo}>
            <Redo2 size={16} className="mr-2" />
            Redo
            <MenubarShortcut>⇧⌘Z</MenubarShortcut>
          </MenubarItem>
          
          <MenubarSeparator />
          
          <MenubarItem
            onSelect={handleCopy}
            disabled={(editorType === 'visual' && selectedSegmentIds.size === 0) || (editorType === 'text' && !selectedSegmentId)}
          >
            <Copy size={16} className="mr-2" />
            Copy
            <MenubarShortcut>⌘C</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={handlePaste}>
            <Clipboard size={16} className="mr-2" />
            Paste
            <MenubarShortcut>⌘V</MenubarShortcut>
          </MenubarItem>
          <MenubarItem
            onSelect={handleDelete}
            disabled={(editorType === 'visual' && selectedSegmentIds.size === 0) || (editorType === 'text' && !selectedSegmentId)}
          >
            <Trash2 size={16} className="mr-2" />
            Delete
            <MenubarShortcut>Del</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      
      {/* View Menu - Simplified */}
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
          
          {/* Simplified Theme Options */}
          <MenubarSub>
            <MenubarSubTrigger>
              <Monitor size={16} className="mr-2" />
              Theme
            </MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarCheckboxItem 
                checked={theme === 'light'}
                onCheckedChange={() => setTheme('light')}
              >
                <Sun size={16} className="mr-2" />
                Light
                {theme === 'light' && <Check size={14} className="ml-auto" />}
              </MenubarCheckboxItem>
              <MenubarCheckboxItem 
                checked={theme === 'dark'}
                onCheckedChange={() => setTheme('dark')}
              >
                <Moon size={16} className="mr-2" />
                Dark
                {theme === 'dark' && <Check size={14} className="ml-auto" />}
              </MenubarCheckboxItem>
              <MenubarCheckboxItem 
                checked={theme === 'system'}
                onCheckedChange={() => setTheme('system')}
              >
                <Monitor size={16} className="mr-2" />
                System
                {theme === 'system' && <Check size={14} className="ml-auto" />}
              </MenubarCheckboxItem>
            </MenubarSubContent>
          </MenubarSub>
        </MenubarContent>
      </MenubarMenu>
      
      {/* Playback Menu - Streamlined */}
      <MenubarMenu>
        <MenubarTrigger className="px-3 py-1 text-sm font-medium cursor-pointer">
          Playback
        </MenubarTrigger>
        <MenubarContent>
          <MenubarItem onSelect={handlePlayPause}>
            {isPlaybackActive ? (
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
          
          <MenubarSeparator />
          
          <MenubarSub>
            <MenubarSubTrigger>
              <Gauge size={16} className="mr-2" />
              Speed
            </MenubarSubTrigger>
            <MenubarSubContent>
              {speedPresets.map((speed) => (
                <MenubarCheckboxItem
                  key={speed}
                  checked={(editorType === 'visual' ? visualPlaybackSpeed * 100 : playback.speed) === speed}
                  onCheckedChange={() => handleSetSpeed(speed)}
                >
                  {speed}%
                </MenubarCheckboxItem>
              ))}
            </MenubarSubContent>
          </MenubarSub>
          
          <MenubarSeparator />
          
          <MenubarItem onSelect={onPlay}>
            <Maximize size={16} className="mr-2" />
            Fullscreen Player
            <MenubarShortcut>F</MenubarShortcut>
          </MenubarItem>
          
          <MenubarItem onSelect={onOpenExternalDisplay}>
            <Monitor size={16} className="mr-2" />
            External Display
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      
      {/* Tools Menu - Consolidated */}
      <MenubarMenu>
        <MenubarTrigger className="px-3 py-1 text-sm font-medium cursor-pointer">
          Tools
        </MenubarTrigger>
        <MenubarContent>
          <MenubarItem onSelect={onOpenTemplates}>
            <LayoutTemplate size={16} className="mr-2" />
            Templates
          </MenubarItem>
          
          <MenubarItem onSelect={onOpenTimerCalculator}>
            <Calculator size={16} className="mr-2" />
            Timer Calculator
          </MenubarItem>
          
          <MenubarItem onSelect={onOpenStatistics}>
            <BarChart3 size={16} className="mr-2" />
            Statistics
          </MenubarItem>
          
          <MenubarSeparator />
          
          {/* Consolidated Advanced Tools */}
          <MenubarSub>
            <MenubarSubTrigger>
              <Settings size={16} className="mr-2" />
              Advanced
            </MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem onSelect={onOpenSettings}>
                <Settings size={16} className="mr-2" />
                Project Settings
              </MenubarItem>
              <MenubarItem onSelect={onOpenAudioManager}>
                <Music size={16} className="mr-2" />
                Audio Manager
              </MenubarItem>
              <MenubarItem onSelect={onOpenRemoteControl}>
                <Radio size={16} className="mr-2" />
                Remote Control
              </MenubarItem>
              <MenubarItem onSelect={onOpenVoiceInput}>
                <Mic size={16} className="mr-2" />
                Voice Input
              </MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
        </MenubarContent>
      </MenubarMenu>
      
      {/* Help Menu - Simplified */}
      <MenubarMenu>
        <MenubarTrigger className="px-3 py-1 text-sm font-medium cursor-pointer">
          Help
        </MenubarTrigger>
        <MenubarContent>
          <MenubarItem onSelect={onGoHome}>
            <BookOpen size={16} className="mr-2" />
            Welcome Guide
          </MenubarItem>
          
          <MenubarItem onSelect={onOpenShortcuts}>
            <Keyboard size={16} className="mr-2" />
            Keyboard Shortcuts
            <MenubarShortcut>?</MenubarShortcut>
          </MenubarItem>
          
          <MenubarSeparator />
          
          <MenubarItem onSelect={onOpenAbout}>
            <Info size={16} className="mr-2" />
            About SegiTelep
          </MenubarItem>
          {import.meta.env.DEV && onToggleDevConsole && (
            <>
              <MenubarSeparator />
              <MenubarItem onSelect={onToggleDevConsole}>
                <Bug size={16} className="mr-2" />
                Developer Console
                <MenubarShortcut>Ctrl + `</MenubarShortcut>
              </MenubarItem>
            </>
          )}
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
});

MainMenuBar.displayName = 'MainMenuBar';
