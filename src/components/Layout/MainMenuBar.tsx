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
  Radio,
  BookOpen,
  HelpCircle,
  Info,
  Clock,
  Check,
  Music,
  Keyboard,
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
  onOpenCountdown: () => void;
  onOpenAbout: () => void;
  onOpenAudioManager: () => void;
  onOpenRemoteControl: () => void;
  onPlay: () => void;
  onGoHome: () => void;
  recentProjects?: Array<{ id: string; name: string }>;
  onOpenRecentProject?: (id: string) => void;
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
  onOpenCountdown,
  onOpenAbout,
  onOpenAudioManager,
  onOpenRemoteControl,
  onPlay,
  onGoHome,
  recentProjects = [],
  onOpenRecentProject,
  className,
}) => {
  const hasUnsavedChanges = useTeleprompterStore((s) => s.hasUnsavedChanges);
  const segmentListCollapsed = useTeleprompterStore((s) => s.editor.segmentListCollapsed);
  const previewCollapsed = useTeleprompterStore((s) => s.editor.previewCollapsed);
  const toggleSegmentListCollapsed = useTeleprompterStore((s) => s.toggleSegmentListCollapsed);
  const togglePreviewCollapsed = useTeleprompterStore((s) => s.togglePreviewCollapsed);
  const updateSettings = useTeleprompterStore((s) => s.updateSettings);

  const visualIsPlaying = useVisualEditorState((s) => s.isPlaying);
  const visualPlaybackTime = useVisualEditorState((s) => s.playbackTime);
  const visualPlaybackSpeed = useVisualEditorState((s) => s.playbackSpeed);
  const visualSetPlaying = useVisualEditorState((s) => s.setPlaying);
  const visualSetPlaybackTime = useVisualEditorState((s) => s.setPlaybackTime);
  const visualSetPlaybackSpeed = useVisualEditorState((s) => s.setPlaybackSpeed);

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

  const handleUndo = useCallback(() => {
    undo();
  }, [undo]);

  const handleRedo = useCallback(() => {
    redo();
  }, [redo]);

  const handleCopy = useCallback(() => {
    copySelected();
  }, [copySelected]);

  const handlePaste = useCallback(() => {
    saveState();
    paste();
  }, [paste, saveState]);

  const handleDuplicate = useCallback(() => {
    const ids = Array.from(selectedSegmentIds);
    if (ids.length === 1) {
      saveState();
      duplicateSegmentVisual(ids[0]);
    }
  }, [selectedSegmentIds, duplicateSegmentVisual, saveState]);

  const handleDelete = useCallback(() => {
    if (selectedSegmentIds.size > 0) {
      saveState();
      deleteSegments(Array.from(selectedSegmentIds));
    }
  }, [selectedSegmentIds, deleteSegments, saveState]);

  const handleSelectAll = useCallback(() => {
    selectAll();
  }, [selectAll]);

  const handleDeselect = useCallback(() => {
    deselectAll();
  }, [deselectAll]);

  const handleShowGuideChange = useCallback((checked: boolean | 'indeterminate') => {
    if (typeof checked !== 'boolean' && checked !== 'indeterminate') return;
    updateSettings({ showGuide: checked === true });
  }, [updateSettings]);

  const handlePlayPause = useCallback(() => {
    visualSetPlaying(!visualIsPlaying);
  }, [visualIsPlaying, visualSetPlaying]);

  const handleStop = useCallback(() => {
    visualSetPlaying(false);
    visualSetPlaybackTime(0);
  }, [visualSetPlaying, visualSetPlaybackTime]);

  const handlePrevSegment = useCallback(() => {
    const segs = pages.flatMap(p => p.segments.filter(s => !s.isHidden)).sort((a, b) => a.startTime - b.startTime);
    const idx = segs.findIndex(s => visualPlaybackTime >= s.startTime && visualPlaybackTime < s.endTime);
    if (idx > 0) visualSetPlaybackTime(segs[idx - 1].startTime);
    else visualSetPlaybackTime(0);
  }, [pages, visualPlaybackTime, visualSetPlaybackTime]);

  const handleNextSegment = useCallback(() => {
    const segs = pages.flatMap(p => p.segments.filter(s => !s.isHidden)).sort((a, b) => a.startTime - b.startTime);
    const idx = segs.findIndex(s => visualPlaybackTime >= s.startTime && visualPlaybackTime < s.endTime);
    if (idx >= 0 && idx < segs.length - 1) visualSetPlaybackTime(segs[idx + 1].startTime);
    else if (segs.length > 0) visualSetPlaybackTime(segs[segs.length - 1].endTime);
  }, [pages, visualPlaybackTime, visualSetPlaybackTime]);

  const handleSetSpeed = useCallback((speed: number) => {
    visualSetPlaybackSpeed(speed / 100);
  }, [visualSetPlaybackSpeed]);

  const isPlaybackActive = visualIsPlaying;

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
          <MenubarItem onSelect={handleUndo} disabled={!canUndo}>
            <Undo2 size={16} className="mr-2" />
            Undo
            <MenubarShortcut>⌘Z</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={handleRedo} disabled={!canRedo}>
            <Redo2 size={16} className="mr-2" />
            Redo
            <MenubarShortcut>⇧⌘Z</MenubarShortcut>
          </MenubarItem>

          <MenubarSeparator />

          <MenubarItem
            onSelect={handleCopy}
            disabled={selectedSegmentIds.size === 0}
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
            disabled={selectedSegmentIds.size === 0}
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
                  checked={visualPlaybackSpeed * 100 === speed}
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
        </MenubarContent>
      </MenubarMenu>

      {/* Tools Menu - Consolidated */}
      <MenubarMenu>
        <MenubarTrigger className="px-3 py-1 text-sm font-medium cursor-pointer">
          Tools
        </MenubarTrigger>
        <MenubarContent>
          {/* Advanced Tools */}
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
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
});

MainMenuBar.displayName = 'MainMenuBar';
