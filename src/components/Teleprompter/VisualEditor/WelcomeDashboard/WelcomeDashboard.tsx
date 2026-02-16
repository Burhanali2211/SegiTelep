import React, { memo, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, FolderOpen, FileImage, Sparkles, Zap, Shield, Download, Grid, List as ListIcon } from 'lucide-react';
import { AppLogo } from '@/components/Layout/AppLogo';
import { cn } from '@/lib/utils';
import { getAllVisualProjects, duplicateVisualProject, deleteVisualProject, type VisualProject } from '@/core/storage/VisualProjectStorage';
import { WELCOME_CONTENT } from '@/constants/welcomeContent';
import { ProjectCard } from './ProjectCard';
import { toast } from 'sonner';
import {
  ImportProjectButton,
  SearchProjectsInput,
  SortProjectsDropdown,
  KeyboardShortcutsButton,
  type SortOption,
} from './features';

interface WelcomeDashboardProps {
  onNewProject: () => void;
  onOpenProject: (projectId: string) => void;
  onGoLive?: (projectId: string) => void;
  onOpenProjectList: () => void;
  onOpenShortcuts?: () => void;
  onImport?: () => void;
  autoResumeEnabled: boolean;
  onAutoResumeChange: (enabled: boolean) => void;
  onFileDrop?: (file: File) => void;
  className?: string;
}

export const WelcomeDashboard = memo<WelcomeDashboardProps>(({
  onNewProject,
  onOpenProject,
  onGoLive,
  onOpenProjectList,
  onOpenShortcuts,
  onImport,
  autoResumeEnabled,
  onAutoResumeChange,
  onFileDrop,
  className,
}) => {
  const [projects, setProjects] = useState<VisualProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // Content from constants (fix: no longer hardcoded / from backend)
  const { title, tagline, sections, keyboardHints } = WELCOME_CONTENT;

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const allProjects = await getAllVisualProjects();
      setProjects(allProjects.slice(0, 10));
    } catch (error) {
      console.error('Failed to load projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load recent projects
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleDuplicateProject = useCallback(async (projectId: string) => {
    try {
      await duplicateVisualProject(projectId);
      toast.success('Project duplicated');
      loadProjects();
    } catch (error) {
      toast.error('Failed to duplicate project');
    }
  }, [loadProjects]);

  const handleDeleteProject = useCallback(async (projectId: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      try {
        await deleteVisualProject(projectId);
        toast.success('Project deleted');
        if (selectedProjectId === projectId) setSelectedProjectId(null);
        loadProjects();
      } catch (error) {
        toast.error('Failed to delete project');
      }
    }
  }, [loadProjects, selectedProjectId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        onNewProject();
        return;
      }
      if (e.key === 'Enter' && selectedProjectId) {
        e.preventDefault();
        onOpenProject(selectedProjectId);
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIndex = projects.findIndex(p => p.id === selectedProjectId);
        let newIndex: number;
        if (e.key === 'ArrowDown') {
          newIndex = currentIndex < projects.length - 1 ? currentIndex + 1 : 0;
        } else {
          newIndex = currentIndex > 0 ? currentIndex - 1 : projects.length - 1;
        }
        if (projects[newIndex]) {
          setSelectedProjectId(projects[newIndex].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedProjectId, projects, onNewProject, onOpenProject]);

  const handleProjectSelect = useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
  }, []);

  const handleProjectOpen = useCallback((projectId: string) => {
    onOpenProject(projectId);
  }, [onOpenProject]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file && onFileDrop) {
      onFileDrop(file);
    }
  }, [onFileDrop]);

  // Filter and Sort projects
  const filteredProjects = projects
    .filter((p) => {
      if (!searchQuery.trim()) return true;
      return typeof p.name === 'string' && p.name.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      switch (sortOption) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'modified':
          return b.modifiedAt - a.modifiedAt;
        case 'recent':
        default:
          return b.modifiedAt - a.modifiedAt;
      }
    });

  return (
    <div
      className={cn('flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/20 to-emerald-950/20 p-6 relative overflow-hidden', className)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag Overlay */}
      {isDraggingFile && (
        <div className="absolute inset-0 z-[100] bg-blue-500/10 backdrop-blur-md border-4 border-dashed border-blue-400/50 flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-200">
          <div className="bg-blue-600/90 p-8 rounded-full shadow-2xl mb-4">
            <Plus size={48} className="text-white animate-pulse" />
          </div>
          <h3 className="text-2xl font-bold text-white">Drop to Import</h3>
          <p className="text-blue-200/70">Images, PDFs, JSON, or Text files</p>
        </div>
      )}

      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_100%)] from-blue-500/5 via-transparent to-transparent opacity-50" />
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      <div className="w-full max-w-5xl relative z-10">
        {/* Enhanced Header with better icon layout */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="relative">
              <AppLogo size="lg" showText={false} />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            </div>
            {/* ThemeSwitcher removed */}
          </div>

          <h1 className="text-4xl sm:text-6xl font-black mb-3 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent tracking-tight">
            {title}
          </h1>
          <p className="text-blue-200/50 text-lg mb-8 max-w-2xl mx-auto leading-relaxed font-light">
            {tagline}
          </p>

          {/* Improved Feature Icons Layout */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            <div className="flex items-center gap-2 p-1 bg-muted/30 rounded-lg">
              <ImportProjectButton onClick={onImport} />
            </div>
            <div className="flex items-center gap-2 p-1 bg-muted/30 rounded-lg">
              <KeyboardShortcutsButton onClick={onOpenShortcuts} />
            </div>
          </div>
        </div>

        {/* Enhanced Recent Projects Section */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-gradient-to-b from-blue-400 to-emerald-400 rounded-full" />
              <h2 className="text-xl font-bold tracking-tight text-blue-50/90">{sections.recentProjects}</h2>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20">
                {filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <SearchProjectsInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search projects..."
                className="min-w-[200px]"
              />
              <SortProjectsDropdown value={sortOption} onSort={setSortOption} />

              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grid' | 'list')} className="hidden sm:block">
                <TabsList className="bg-white/5 border border-white/10 h-9 p-0.5">
                  <TabsTrigger value="grid" className="h-8 px-2.5 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
                    <Grid size={14} />
                  </TabsTrigger>
                  <TabsTrigger value="list" className="h-8 px-2.5 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
                    <ListIcon size={14} />
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <Button
                variant="outline"
                size="sm"
                onClick={onOpenProjectList}
                className="hover:bg-primary hover:text-primary-foreground transition-colors border-white/10 text-slate-300"
              >
                <FolderOpen size={14} className="mr-2" />
                {sections.viewAll}
              </Button>
            </div>
          </div>

          {/* Fixed ScrollArea with proper corners and Z-index */}
          <div className="relative rounded-2xl border border-white/5 bg-black/40 backdrop-blur-xl shadow-2xl overflow-hidden">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-lg" />
                ))}
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                  <FileImage className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground text-sm">
                  {projects.length === 0 ? sections.noProjectsYet : 'No projects match your search.'}
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[480px]">
                <div className={cn(
                  'p-6',
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
                    : 'space-y-3'
                )}>
                  {filteredProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      variant={viewMode}
                      isSelected={selectedProjectId === project.id}
                      onSelect={() => handleProjectSelect(project.id)}
                      onOpen={() => handleProjectOpen(project.id)}
                      onGoLive={onGoLive}
                      onDuplicate={handleDuplicateProject}
                      onDelete={handleDeleteProject}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        {/* Enhanced Actions Section */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Button
            size="lg"
            className="flex-1 h-14 text-base font-bold group relative overflow-hidden bg-blue-600 hover:bg-blue-500 text-white border-0"
            onClick={onNewProject}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <Plus size={20} className="mr-3 relative z-10" />
            <span className="relative z-10">{sections.newProject}</span>
            <span className="ml-3 text-[10px] font-bold bg-black/20 px-2 py-1 rounded-md relative z-10 border border-white/10 uppercase">N</span>
          </Button>
        </div>

        {/* Enhanced Settings Section */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/5">
          <div className="flex items-center gap-3">
            <Checkbox
              id="auto-resume"
              checked={autoResumeEnabled}
              onCheckedChange={(checked) => onAutoResumeChange(checked === true)}
              className="w-5 h-5"
            />
            <Label htmlFor="auto-resume" className="text-sm font-bold cursor-pointer flex items-center gap-2 text-blue-200/70">
              <Shield size={14} className="text-blue-400" />
              {sections.autoResume}
            </Label>
          </div>

          {/* Enhanced Keyboard hints */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 rounded-md bg-background border border-border font-mono shadow-sm">N</kbd>
              <span>{keyboardHints.new}</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 rounded-md bg-background border border-border font-mono shadow-sm">↑↓</kbd>
              <span>{keyboardHints.navigate}</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 rounded-md bg-background border border-border font-mono shadow-sm">Enter</kbd>
              <span>{keyboardHints.openSelected}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

WelcomeDashboard.displayName = 'WelcomeDashboard';
export default WelcomeDashboard;
