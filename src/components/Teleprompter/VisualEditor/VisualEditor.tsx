import React, { memo, useState, useCallback, useEffect } from 'react';
import { useVisualProjectSession } from '@/hooks/useVisualProjectSession';
import { useTeleprompterStore } from '@/store/teleprompterStore';
import { useUndoRedo } from './useUndoRedo';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { AppSidebar } from '@/components/Layout/AppSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ImageCanvas } from './ImageCanvas';
import { TimelineStrip } from './TimelineStrip';
import { SegmentOverlay } from './SegmentOverlay';
import { AudioWaveform } from './AudioWaveform';
import { SelectionToolbar } from './SelectionToolbar';
import { SegmentPropertiesBar } from './components/toolbar/SegmentPropertiesBar';
import { ProjectListDialog } from './ProjectListDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { handleFileImport, createProjectFromPDFPages } from '@/core/projects/fileImportHandlers';
import { PDFPageSelector } from '@/components/Teleprompter/PDFPageSelector';
import { ProjectService } from '@/core/projects/ProjectService';
import { v4 as uuidv4 } from 'uuid';
import { WelcomeDashboard } from './WelcomeDashboard/WelcomeDashboard';
import { FullscreenPlayer } from './FullscreenPlayer';
import { KeyboardShortcutsOverlay } from './KeyboardShortcutsOverlay';
import { useVisualEditorState } from './useVisualEditorState';
import { AppLogo } from '@/components/Layout/AppLogo';
import { cn } from '@/lib/utils';
import { exportVisualProject, importVisualProject } from '@/core/storage/VisualProjectStorage';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { AudioManagerDialog } from '@/components/Teleprompter/AudioManager/AudioManagerDialog';

interface VisualEditorProps {
  className?: string;
  onOpenPreview?: () => void;
  onOpenAudioLibrary?: () => void;
  onGoHome?: () => void;
  onOpenSettings?: () => void;
  onOpenShortcuts?: () => void;
  onOpenProjectList?: () => void;
  onOpenPDFSelector?: (file: File | string) => void;
}

export const VisualEditor = memo<VisualEditorProps>(({
  className,
  onOpenAudioLibrary,
  onGoHome,
  onOpenSettings,
  onOpenShortcuts,
  onOpenProjectList,
  onOpenPDFSelector
}) => {
  const showPlayer = useVisualEditorState((s) => s.showPlayer);
  const setShowPlayer = useVisualEditorState((s) => s.setShowPlayer);


  // Session management
  const {
    saveProject,
    loadProject,
    loadProjectAndEdit,
    createNewProject,
    projectId,
    isDirty,
    saveStatus,
    isLoading,
    startupMode,
    setStartupMode,
    autoResumeEnabled,
    setAutoResumeEnabled,
    autoSaveEnabled,
    setAutoSaveEnabled,
  } = useVisualProjectSession();

  // Local state for project name editing
  const projectName = useVisualEditorState((s) => s.projectName);
  const setProjectName = useVisualEditorState((s) => s.setProjectName);
  const lastSaved = useVisualEditorState((s) => s.lastSaved);

  const zoom = useVisualEditorState((s) => s.zoom);
  const isPlaying = useVisualEditorState((s) => s.isPlaying);
  const setPlaying = useVisualEditorState((s) => s.setPlaying);
  const selectedSegmentIds = useVisualEditorState((s) => s.selectedSegmentIds);
  const pages = useVisualEditorState((s) => s.pages);
  const currentPage = useVisualEditorState((s) => s.getCurrentPage());
  const audioFile = useVisualEditorState((s) => s.audioFile);
  const setAudioFile = useVisualEditorState((s) => s.setAudioFile);
  const setPlaybackTime = useVisualEditorState((s) => s.setPlaybackTime);
  const setZoom = useVisualEditorState((s) => s.setZoom);
  const showAllSegments = useVisualEditorState((s) => s.showAllSegments);
  const deleteSegments = useVisualEditorState((s) => s.deleteSegments);
  const copySelected = useVisualEditorState((s) => s.copySelected);
  const paste = useVisualEditorState((s) => s.paste);
  const duplicateSegment = useVisualEditorState((s) => s.duplicateSegment);
  const selectAll = useVisualEditorState((s) => s.selectAll);
  const deselectAll = useVisualEditorState((s) => s.deselectAll);
  const setCurrentPage = useVisualEditorState((s) => s.setCurrentPage);
  const currentPageIndex = useVisualEditorState((s) => s.currentPageIndex);
  const setDrawing = useVisualEditorState((s) => s.setDrawing);

  // Aspect ratio state
  const aspectRatioConstraint = useVisualEditorState((s) => s.aspectRatioConstraint);
  const customAspectRatio = useVisualEditorState((s) => s.customAspectRatio);
  const setAspectRatioConstraint = useVisualEditorState((s) => s.setAspectRatioConstraint);
  const setCustomAspectRatio = useVisualEditorState((s) => s.setCustomAspectRatio);

  const { saveState, undo, redo } = useUndoRedo();

  const handleExport = useCallback(() => {
    if (pages.length === 0) {
      toast.error('Add at least one image before exporting');
      return;
    }
    exportVisualProject({
      id: projectId || 'exported',
      name: projectName,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      pages,
      audioFile,
    });
    toast.success('Project exported');
  }, [projectId, projectName, pages, audioFile]);

  useKeyboardShortcuts({
    setShowShortcuts: () => { }, // Placeholder as we centralize
    createNewProject,
    setShowProjectList: () => { }, // Placeholder as we centralize
    handleExport,
    saveProject,
    setDrawing,
    selectedSegmentIds,
    saveState,
    deleteSegments,
    copySelected,
    paste,
    duplicateSegment,
    selectAll,
    deselectAll,
    undo,
    redo,
    zoom,
    setZoom,
    pages,
    currentPageIndex,
    setCurrentPage,
  });

  // Remote Control Event Bridge
  useEffect(() => {
    const handleRemotePlay = () => {
      console.log('🎮 editor event: remote-play');
      setPlaying(true);
    };
    const handleRemotePause = () => setPlaying(false);
    const handleRemoteStop = () => {
      setPlaying(false);
      setPlaybackTime(0);
    };
    const handleRemoteNext = () => {
      // Find current active segment and go to next
      const state = useVisualEditorState.getState();
      const all = state.pages.flatMap(p => p.segments).sort((a, b) => a.startTime - b.startTime);
      const currentIndex = all.findIndex(seg => state.playbackTime >= seg.startTime && state.playbackTime < seg.endTime);
      if (currentIndex >= 0 && currentIndex < all.length - 1) {
        setPlaybackTime(all[currentIndex + 1].startTime);
      }
    };
    const handleRemotePrev = () => {
      const state = useVisualEditorState.getState();
      const all = state.pages.flatMap(p => p.segments).sort((a, b) => a.startTime - b.startTime);
      const currentIndex = all.findIndex(seg => state.playbackTime >= seg.startTime && state.playbackTime < seg.endTime);
      if (currentIndex > 0) {
        setPlaybackTime(all[currentIndex - 1].startTime);
      } else if (state.playbackTime > 0) {
        setPlaybackTime(0);
      }
    };

    window.addEventListener('remote-play', handleRemotePlay);
    window.addEventListener('remote-pause', handleRemotePause);
    window.addEventListener('remote-stop', handleRemoteStop);
    window.addEventListener('remote-skip-next', handleRemoteNext);
    window.addEventListener('remote-skip-prev', handleRemotePrev);

    return () => {
      window.removeEventListener('remote-play', handleRemotePlay);
      window.removeEventListener('remote-pause', handleRemotePause);
      window.removeEventListener('remote-stop', handleRemoteStop);
      window.removeEventListener('remote-skip-next', handleRemoteNext);
      window.removeEventListener('remote-skip-prev', handleRemotePrev);
    };
  }, [setPlaying, setPlaybackTime]);

  const handleImport = useCallback(async (file?: File) => {
    if (file) {
      processFile(file);
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.visualprompt.json,.json,.pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) processFile(file);
    };

    input.click();
  }, [loadProject]);

  const processFile = async (file: File) => {
    try {
      const result = await handleFileImport(file);
      if (result.type === 'project') {
        await loadProject(result.project.id);
        toast.success(`Imported: ${result.project.name}`);
      } else if (result.type === 'pdf' && onOpenPDFSelector) {
        onOpenPDFSelector(result.file);
      } else if (result.type === 'error') {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to import file');
    }
  };


  // Check if has segments to play
  const totalSegments = pages.reduce((acc, p) => acc + p.segments.filter(s => !s.isHidden).length, 0);
  const canPlay = totalSegments > 0;

  const hasHiddenSegments = currentPage?.segments.some(s => s.isHidden);
  const singleSelectedSegment = selectedSegmentIds.size === 1 && currentPage
    ? currentPage.segments.find(s => selectedSegmentIds.has(s.id))
    : null;

  const handleGoLive = useCallback(async (id: string) => {
    const success = await loadProject(id);
    if (success) {
      const state = useVisualEditorState.getState();
      const hasSegments = state.pages.some(p => p.segments.some(s => !s.isHidden));
      if (hasSegments) {
        setStartupMode('editor');
        setShowPlayer(true);
      } else {
        toast.error('Project has no segments to play');
        setStartupMode('editor'); // Still open it so they can add segments
      }
    }
  }, [loadProject, setStartupMode, setShowPlayer]);

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-full w-full bg-background', className)}>
        <div className="flex flex-col items-center gap-4">
          <AppLogo size="lg" className="animate-pulse" />
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground font-medium">Initializing workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  // Welcome Dashboard - show when startup mode is 'welcome'
  if (startupMode === 'welcome') {
    return (
      <>

        <WelcomeDashboard
          onNewProject={createNewProject}
          onOpenProject={loadProjectAndEdit}
          onGoLive={handleGoLive}
          onOpenProjectList={onOpenProjectList || (() => { })}
          onOpenShortcuts={onOpenShortcuts}
          onImport={handleImport}
          onFileDrop={handleImport}
          autoResumeEnabled={autoResumeEnabled}
          onAutoResumeChange={setAutoResumeEnabled}
          className={className}
        />
      </>
    );
  }

  return (
    <>
      {showPlayer && (
        <FullscreenPlayer onClose={() => setShowPlayer(false)} />
      )}


      <div className={cn('flex h-full w-full bg-background overflow-hidden overflow-x-hidden relative min-w-0', className)}>
        <div className="flex-1 flex flex-col min-w-0 w-full overflow-hidden overflow-x-hidden m-0 relative">
          {singleSelectedSegment && (
            <SegmentPropertiesBar
              segment={singleSelectedSegment}
              onClose={() => useVisualEditorState.getState().deselectAll()}
              className="absolute top-6 left-1/2 -translate-x-1/2 z-30 shadow-xl border rounded-lg w-auto max-w-[calc(100vw-400px)]"
            />
          )}
          <ImageCanvas className="flex-1 min-h-0 min-w-0 basis-0" />
          <div className="flex flex-col shrink-0 w-full min-w-0 overflow-hidden max-w-full border-t bg-background">
            <AudioWaveform onOpenAudioLibrary={onOpenAudioLibrary} />
            <div className="w-full relative overflow-hidden min-w-0">
              <TimelineStrip />
            </div>
            <SelectionToolbar />
          </div>
        </div>
      </div>
    </>
  );
});

VisualEditor.displayName = 'VisualEditor';
