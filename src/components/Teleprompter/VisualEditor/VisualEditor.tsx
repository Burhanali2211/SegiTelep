import React, { memo, useState, useCallback, useEffect } from 'react';
import { useVisualProjectSession } from '@/hooks/useVisualProjectSession';
import { useTeleprompterStore } from '@/store/teleprompterStore';
import { useUndoRedo } from './useUndoRedo';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { LeftControlPanel } from './LeftControlPanel';
import { ImageCanvas } from './ImageCanvas';
import { TimelineStrip } from './TimelineStrip';
import { SegmentOverlay } from './SegmentOverlay';
import { AudioWaveform } from './AudioWaveform';
import { SelectionToolbar } from './SelectionToolbar';
import { SegmentPropertiesBar } from './components/toolbar/SegmentPropertiesBar';
import { ProjectListDialog } from './ProjectListDialog';
import { WelcomeDashboard } from './WelcomeDashboard/WelcomeDashboard';
import { FullscreenPlayer } from './FullscreenPlayer';
import { KeyboardShortcutsOverlay } from './KeyboardShortcutsOverlay';
import { useVisualEditorState } from './useVisualEditorState';
import { cn } from '@/lib/utils';
import { exportVisualProject, importVisualProject } from '@/core/storage/VisualProjectStorage';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface VisualEditorProps {
  className?: string;
  onOpenPreview?: () => void;
  onOpenAudioLibrary?: () => void;
  onGoHome?: () => void;
  onEditorTypeChange?: (type: 'text' | 'visual') => void;
  onOpenSettings?: () => void;
  onOpenShortcuts?: () => void;
}

export const VisualEditor = memo<VisualEditorProps>(({ className, onOpenAudioLibrary, onGoHome, onEditorTypeChange, onOpenSettings, onOpenShortcuts }) => {
  const showPlayer = useVisualEditorState((s) => s.showPlayer);
  const setShowPlayer = useVisualEditorState((s) => s.setShowPlayer);
  const [showProjectList, setShowProjectList] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  
  // Get sidebar collapsed state from main store
  const segmentListCollapsed = useTeleprompterStore((s) => s.editor.segmentListCollapsed);
  
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
    setShowShortcuts,
    createNewProject,
    setShowProjectList,
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

  const handleImport = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.visualprompt.json,.json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const imported = await importVisualProject(file);
        await loadProject(imported.id);
        toast.success(`Imported: ${imported.name}`);
      } catch (error) {
        toast.error('Failed to import project. Invalid file format.');
      }
    };
    
    input.click();
  }, [loadProject]);
  
  // Check if has segments to play
  const totalSegments = pages.reduce((acc, p) => acc + p.segments.filter(s => !s.isHidden).length, 0);
  const canPlay = totalSegments > 0;
  
  const hasHiddenSegments = currentPage?.segments.some(s => s.isHidden);
  const singleSelectedSegment = selectedSegmentIds.size === 1 && currentPage
    ? currentPage.segments.find(s => selectedSegmentIds.has(s.id))
    : null;
  
  // Loading state
  if (isLoading) {
    return (
      <div className={cn('flex h-full bg-background overflow-hidden', className)}>
        <div className="w-64 min-w-[260px] shrink-0 border-r p-3 space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <div className="flex-1 flex flex-col">
          <div className="h-10 border-b flex items-center px-3 gap-2">
            <Skeleton className="h-7 w-40" />
            <div className="flex-1" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-7 w-20" />
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading project...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Welcome Dashboard - show when startup mode is 'welcome'
  if (startupMode === 'welcome') {
    return (
      <>
        <ProjectListDialog
          open={showProjectList}
          onOpenChange={setShowProjectList}
          onSelectProject={loadProjectAndEdit}
          onNewProject={() => {
            createNewProject();
            setShowProjectList(false);
          }}
          currentProjectId={projectId}
        />
        
        <WelcomeDashboard
          onNewProject={createNewProject}
          onOpenProject={loadProjectAndEdit}
          onOpenProjectList={() => setShowProjectList(true)}
          onOpenShortcuts={() => setShowShortcuts(true)}
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
      
      <ProjectListDialog
        open={showProjectList}
        onOpenChange={setShowProjectList}
        onSelectProject={loadProject}
        onNewProject={() => createNewProject()}
        currentProjectId={projectId}
      />
      
      <KeyboardShortcutsOverlay
        open={showShortcuts}
        onOpenChange={setShowShortcuts}
      />
      
      <div className={cn('flex h-full bg-background overflow-hidden', className)}>
        {!segmentListCollapsed ? (
          <ResizablePanelGroup direction="horizontal" className="flex-1">
            <ResizablePanel defaultSize={11} minSize={10} maxSize={20}>
              <LeftControlPanel className="h-full w-full overflow-hidden" />
            </ResizablePanel>
            <ResizableHandle withHandle className="shrink-0" />
            <ResizablePanel defaultSize={89} minSize={80} className="min-w-0">
              <div className="flex flex-col h-full min-w-0 overflow-hidden">
                {/* Canvas */}
                <ImageCanvas className="flex-1 min-h-0" />

          {/* Segment Properties Bar - when exactly one segment selected */}
          {singleSelectedSegment && (
            <SegmentPropertiesBar
              segment={singleSelectedSegment}
              onClose={() => useVisualEditorState.getState().deselectAll()}
            />
          )}
          
          {/* Audio Waveform */}
          <AudioWaveform onOpenAudioLibrary={onOpenAudioLibrary} />
          
          {/* Timeline Strip */}
          <TimelineStrip />
          
          {/* Selection Toolbar */}
          <SelectionToolbar />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <ImageCanvas className="flex-1 min-h-0" />
            {singleSelectedSegment && (
              <SegmentPropertiesBar
                segment={singleSelectedSegment}
                onClose={() => useVisualEditorState.getState().deselectAll()}
              />
            )}
            <AudioWaveform onOpenAudioLibrary={onOpenAudioLibrary} />
            <TimelineStrip />
            <SelectionToolbar />
          </div>
        )}
      </div>
    </>
  );
});

VisualEditor.displayName = 'VisualEditor';
