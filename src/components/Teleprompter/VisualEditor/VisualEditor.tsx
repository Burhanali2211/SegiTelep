import React, { memo, useEffect, useState, useCallback } from 'react';
import { useVisualEditorState, SaveStatus } from './useVisualEditorState';
import { useTeleprompterStore } from '@/store/teleprompterStore';
import { useUndoRedo } from './useUndoRedo';
import { ImageCanvas } from './ImageCanvas';
import { TimelineStrip } from './TimelineStrip';
import { SelectionToolbar } from './SelectionToolbar';
import { LeftControlPanel } from './LeftControlPanel';
import { AudioWaveform } from './AudioWaveform';
import { FullscreenPlayer } from './FullscreenPlayer';
import { ProjectListDialog } from './ProjectListDialog';
import { KeyboardShortcutsOverlay } from './KeyboardShortcutsOverlay';
import { useVisualProjectSession } from '@/hooks/useVisualProjectSession';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Eye, 
  Save, 
  FolderOpen, 
  Play,
  Loader2,
  Check,
  Plus,
  Download,
  Upload,
  Keyboard,
  Cloud,
  CloudOff,
  RectangleHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportVisualProject, importVisualProject } from '@/core/storage/VisualProjectStorage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';

// Aspect ratio presets
const ASPECT_RATIO_PRESETS = [
  { value: 'free', label: 'Free Draw', description: 'No constraint' },
  { value: '16:9', label: '16:9', description: '1920×1080 (HD)' },
  { value: '4:3', label: '4:3', description: '1024×768' },
  { value: '1:1', label: '1:1', description: 'Square' },
  { value: '9:16', label: '9:16', description: 'Portrait' },
  { value: '21:9', label: '21:9', description: 'Ultrawide' },
  { value: 'custom', label: 'Custom', description: 'Set your own' },
];

interface VisualEditorProps {
  className?: string;
  onOpenPreview?: () => void;
}

// Save status indicator component
const SaveStatusIndicator = ({ status, lastSaved }: { status: SaveStatus; lastSaved: number | null }) => {
  if (status === 'saving') {
    return (
      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
        <Loader2 size={10} className="animate-spin" />
        Saving...
      </span>
    );
  }
  
  if (status === 'saved' && lastSaved) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1 cursor-default">
            <Cloud size={10} className="text-primary" />
            Saved
          </span>
        </TooltipTrigger>
        <TooltipContent>
          Last saved: {new Date(lastSaved).toLocaleString()}
        </TooltipContent>
      </Tooltip>
    );
  }
  
  if (status === 'error') {
    return (
      <span className="text-[10px] text-destructive flex items-center gap-1">
        <CloudOff size={10} />
        Save failed
      </span>
    );
  }
  
  return null;
};

export const VisualEditor = memo<VisualEditorProps>(({ className, onOpenPreview }) => {
  const [showPlayer, setShowPlayer] = useState(false);
  const [showProjectList, setShowProjectList] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  
  // Get sidebar collapsed state from main store
  const segmentListCollapsed = useTeleprompterStore((s) => s.editor.segmentListCollapsed);
  
  // Session management
  const { 
    saveProject, 
    loadProject, 
    createNewProject,
    projectId,
    isDirty,
    saveStatus,
    isLoading,
  } = useVisualProjectSession();
  
  // Local state for project name editing
  const projectName = useVisualEditorState((s) => s.projectName);
  const setProjectName = useVisualEditorState((s) => s.setProjectName);
  const lastSaved = useVisualEditorState((s) => s.lastSaved);
  
  const zoom = useVisualEditorState((s) => s.zoom);
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
  
  // Export current project
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
  
  // Import project
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
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      const ctrl = e.ctrlKey || e.metaKey;
      
      // Show shortcuts (?)
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowShortcuts(true);
        return;
      }
      
      // New project (Ctrl+N)
      if (ctrl && e.key === 'n') {
        e.preventDefault();
        createNewProject();
        return;
      }
      
      // Open project (Ctrl+O)
      if (ctrl && e.key === 'o') {
        e.preventDefault();
        setShowProjectList(true);
        return;
      }
      
      // Export (Ctrl+Shift+S)
      if (ctrl && e.shiftKey && e.key === 's') {
        e.preventDefault();
        handleExport();
        return;
      }
      
      // Save shortcut (Ctrl+S)
      if (ctrl && e.key === 's' && !e.shiftKey) {
        e.preventDefault();
        saveProject();
        return;
      }
      
      // New segment (N key)
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setDrawing(true);
        return;
      }
      
      // Delete
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedSegmentIds.size > 0) {
        e.preventDefault();
        saveState();
        deleteSegments(Array.from(selectedSegmentIds));
        return;
      }
      
      // Copy
      if (ctrl && e.key === 'c') {
        e.preventDefault();
        copySelected();
        return;
      }
      
      // Paste
      if (ctrl && e.key === 'v') {
        e.preventDefault();
        saveState();
        paste();
        return;
      }
      
      // Duplicate
      if (ctrl && e.key === 'd' && selectedSegmentIds.size === 1) {
        e.preventDefault();
        saveState();
        duplicateSegment(Array.from(selectedSegmentIds)[0]);
        return;
      }
      
      // Select all
      if (ctrl && e.key === 'a') {
        e.preventDefault();
        selectAll();
        return;
      }
      
      // Deselect
      if (e.key === 'Escape') {
        e.preventDefault();
        deselectAll();
        setDrawing(false);
        return;
      }
      
      // Undo
      if (ctrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      
      // Redo
      if (ctrl && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        redo();
        return;
      }
      
      // Zoom
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoom(zoom + 0.25);
        return;
      }
      
      if (e.key === '-') {
        e.preventDefault();
        setZoom(zoom - 0.25);
        return;
      }
      
      // Page navigation
      if (e.key === 'PageUp') {
        e.preventDefault();
        if (currentPageIndex > 0) {
          setCurrentPage(currentPageIndex - 1);
        }
        return;
      }
      
      if (e.key === 'PageDown') {
        e.preventDefault();
        if (currentPageIndex < pages.length - 1) {
          setCurrentPage(currentPageIndex + 1);
        }
        return;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedSegmentIds, zoom, pages.length, currentPageIndex,
    saveState, deleteSegments, copySelected, paste, duplicateSegment,
    selectAll, deselectAll, undo, redo, setZoom, setCurrentPage, setDrawing,
    saveProject, createNewProject, handleExport,
  ]);
  
  const hasHiddenSegments = currentPage?.segments.some(s => s.isHidden);
  
  // Loading state
  if (isLoading) {
    return (
      <div className={cn('flex h-full bg-background overflow-hidden', className)}>
        <div className="w-56 shrink-0 border-r p-3 space-y-3">
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
        {/* Left Control Panel - Collapsible */}
        {!segmentListCollapsed && (
          <LeftControlPanel className="w-56 shrink-0" />
        )}
        
        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header with project controls */}
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-card">
            {/* Project name */}
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="h-7 w-40 text-sm"
              placeholder="Project name"
            />
            
            {/* Save status */}
            <SaveStatusIndicator status={saveStatus} lastSaved={lastSaved} />
            
            {/* Unsaved indicator */}
            {isDirty && saveStatus === 'idle' && (
              <span className="text-[10px] px-1.5 py-0.5 bg-accent/20 text-accent rounded">
                Unsaved
              </span>
            )}
            
            {/* Aspect ratio selector */}
            <div className="flex items-center gap-1.5 ml-2">
              <RectangleHorizontal size={14} className="text-muted-foreground" />
              <Select
                value={aspectRatioConstraint || 'free'}
                onValueChange={(val) => setAspectRatioConstraint(val === 'free' ? null : val)}
              >
                <SelectTrigger className="h-7 w-[100px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASPECT_RATIO_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      <div className="flex flex-col">
                        <span>{preset.label}</span>
                        <span className="text-[10px] text-muted-foreground">{preset.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Custom ratio input */}
              {aspectRatioConstraint === 'custom' && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-xs">
                      {customAspectRatio.width}×{customAspectRatio.height}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-3">
                    <div className="space-y-2">
                      <p className="text-xs font-medium">Custom Aspect Ratio</p>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={customAspectRatio.width}
                          onChange={(e) => setCustomAspectRatio({ 
                            ...customAspectRatio, 
                            width: parseInt(e.target.value) || 1 
                          })}
                          className="h-7 w-16 text-xs"
                          min={1}
                        />
                        <span className="text-muted-foreground">×</span>
                        <Input
                          type="number"
                          value={customAspectRatio.height}
                          onChange={(e) => setCustomAspectRatio({ 
                            ...customAspectRatio, 
                            height: parseInt(e.target.value) || 1 
                          })}
                          className="h-7 w-16 text-xs"
                          min={1}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Ratio: {(customAspectRatio.width / customAspectRatio.height).toFixed(2)}
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
            
            <div className="flex-1" />
            
            {/* Shortcuts help */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowShortcuts(true)}>
                  <Keyboard size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Keyboard shortcuts (?)</TooltipContent>
            </Tooltip>
            
            {/* File menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <FolderOpen size={14} className="mr-1" />
                  File
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => createNewProject()}>
                  <Plus size={14} className="mr-2" />
                  New Project
                  <span className="ml-auto text-[10px] text-muted-foreground">Ctrl+N</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowProjectList(true)}>
                  <FolderOpen size={14} className="mr-2" />
                  Open Project...
                  <span className="ml-auto text-[10px] text-muted-foreground">Ctrl+O</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => saveProject()}>
                  <Save size={14} className="mr-2" />
                  Save
                  <span className="ml-auto text-[10px] text-muted-foreground">Ctrl+S</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExport} disabled={pages.length === 0}>
                  <Download size={14} className="mr-2" />
                  Export...
                  <span className="ml-auto text-[10px] text-muted-foreground">Ctrl+Shift+S</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleImport}>
                  <Upload size={14} className="mr-2" />
                  Import...
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Save button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => saveProject()}
                  disabled={saveStatus === 'saving' || pages.length === 0}
                >
                  {saveStatus === 'saving' ? (
                    <Loader2 size={14} className="mr-1 animate-spin" />
                  ) : (
                    <Save size={14} className="mr-1" />
                  )}
                  Save
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save project (Ctrl+S)</TooltipContent>
            </Tooltip>
            
            {hasHiddenSegments && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={showAllSegments}
                  >
                    <Eye size={14} className="mr-1" />
                    Show Hidden
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Show all hidden segments</TooltipContent>
              </Tooltip>
            )}
            
            {/* Play button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowPlayer(true)}
                  disabled={!canPlay}
                >
                  <Play size={14} className="mr-1" />
                  Play
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {canPlay ? 'Start fullscreen playback' : 'Add segments to play'}
              </TooltipContent>
            </Tooltip>
          </div>
        
          {/* Canvas */}
          <ImageCanvas className="flex-1 min-h-0" />
          
          {/* Audio Waveform */}
          <AudioWaveform />
          
          {/* Timeline Strip */}
          <TimelineStrip />
          
          {/* Selection Toolbar (floating) */}
          <SelectionToolbar />
        </div>
      </div>
    </>
  );
});

VisualEditor.displayName = 'VisualEditor';
