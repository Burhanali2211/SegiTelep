import React, { memo, useEffect, useState, useCallback } from 'react';
import { useVisualEditorState } from './useVisualEditorState';
import { useUndoRedo } from './useUndoRedo';
import { ImageCanvas } from './ImageCanvas';
import { TimelineStrip } from './TimelineStrip';
import { SelectionToolbar } from './SelectionToolbar';
import { LeftControlPanel } from './LeftControlPanel';
import { AudioWaveform } from './AudioWaveform';
import { FullscreenPlayer } from './FullscreenPlayer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Presentation, 
  Eye, 
  Save, 
  FolderOpen, 
  Play,
  Loader2,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  saveVisualProject, 
  loadVisualProject, 
  getAllVisualProjects,
  createVisualProject,
  VisualProject,
} from '@/core/storage/VisualProjectStorage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface VisualEditorProps {
  className?: string;
  onOpenPreview?: () => void;
}

export const VisualEditor = memo<VisualEditorProps>(({ className, onOpenPreview }) => {
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('Untitled Project');
  const [isSaving, setIsSaving] = useState(false);
  const [savedProjects, setSavedProjects] = useState<VisualProject[]>([]);
  const [showPlayer, setShowPlayer] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
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
  const reset = useVisualEditorState((s) => s.reset);
  const setAudioFile = useVisualEditorState((s) => s.setAudioFile);
  
  const { saveState, undo, redo } = useUndoRedo();
  
  // Load saved projects list
  useEffect(() => {
    getAllVisualProjects().then(setSavedProjects);
  }, []);
  
  // Save project
  const handleSave = useCallback(async () => {
    if (pages.length === 0) {
      toast.error('Add at least one image before saving');
      return;
    }
    
    setIsSaving(true);
    try {
      const project: VisualProject = {
        id: currentProjectId || '',
        name: projectName,
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        pages,
        audioFile,
      };
      
      if (!currentProjectId) {
        const newProject = await createVisualProject(projectName, pages, audioFile);
        setCurrentProjectId(newProject.id);
      } else {
        project.id = currentProjectId;
        await saveVisualProject(project);
      }
      
      setLastSaved(new Date());
      toast.success('Project saved');
      getAllVisualProjects().then(setSavedProjects);
    } catch (error) {
      toast.error('Failed to save project');
    } finally {
      setIsSaving(false);
    }
  }, [currentProjectId, projectName, pages, audioFile]);
  
  // Load project
  const handleLoad = useCallback(async (id: string) => {
    const project = await loadVisualProject(id);
    if (!project) {
      toast.error('Project not found');
      return;
    }
    
    reset();
    setCurrentProjectId(project.id);
    setProjectName(project.name);
    
    // Load pages into state
    const { addPage, setAudioFile } = useVisualEditorState.getState();
    project.pages.forEach((page) => {
      addPage(page.data);
    });
    
    // Manually set segments (need to update state directly)
    useVisualEditorState.setState({ 
      pages: project.pages,
      audioFile: project.audioFile,
    });
    
    toast.success(`Loaded: ${project.name}`);
  }, [reset]);
  
  // New project
  const handleNewProject = useCallback(() => {
    reset();
    setCurrentProjectId(null);
    setProjectName('Untitled Project');
    setLastSaved(null);
  }, [reset]);
  
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
      
      // Save shortcut
      if (ctrl && e.key === 's') {
        e.preventDefault();
        handleSave();
        return;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedSegmentIds, zoom, pages.length, currentPageIndex,
    saveState, deleteSegments, copySelected, paste, duplicateSegment,
    selectAll, deselectAll, undo, redo, setZoom, setCurrentPage, setDrawing, handleSave,
  ]);
  
  const hasHiddenSegments = currentPage?.segments.some(s => s.isHidden);
  
  return (
    <>
      {showPlayer && (
        <FullscreenPlayer onClose={() => setShowPlayer(false)} />
      )}
      
      <div className={cn('flex h-full bg-background overflow-hidden', className)}>
        {/* Left Control Panel */}
        <LeftControlPanel className="w-48 shrink-0" />
        
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
            {lastSaved && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Check size={10} className="text-primary" />
                {lastSaved.toLocaleTimeString()}
              </span>
            )}
            
            <div className="flex-1" />
            
            {/* Load dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <FolderOpen size={14} className="mr-1" />
                  Open
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleNewProject}>
                  New Project
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {savedProjects.length === 0 ? (
                  <DropdownMenuItem disabled>
                    No saved projects
                  </DropdownMenuItem>
                ) : (
                  savedProjects.map((p) => (
                    <DropdownMenuItem key={p.id} onClick={() => handleLoad(p.id)}>
                      {p.name}
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {new Date(p.modifiedAt).toLocaleDateString()}
                      </span>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Save button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving || pages.length === 0}
                >
                  {isSaving ? (
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
