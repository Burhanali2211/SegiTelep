import React, { memo, useEffect, useState, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, FolderOpen, FileImage, Sparkles, Zap, Shield, Download } from 'lucide-react';
import { AppLogo } from '@/components/Layout/AppLogo';
import { cn } from '@/lib/utils';
import { getAllVisualProjects, type VisualProject } from '@/core/storage/VisualProjectStorage';
import { WELCOME_CONTENT } from '@/constants/welcomeContent';
import { ProjectCard } from './ProjectCard';
import {
  ThemeSwitcherButton,
  TutorialButton,
  ImportProjectButton,
  SearchProjectsInput,
  SortProjectsDropdown,
  CloudSyncButton,
  KeyboardShortcutsButton,
  ExportBackupButton,
} from './features';

interface WelcomeDashboardProps {
  onNewProject: () => void;
  onOpenProject: (projectId: string) => void;
  onOpenProjectList: () => void;
  onOpenShortcuts?: () => void;
  autoResumeEnabled: boolean;
  onAutoResumeChange: (enabled: boolean) => void;
  className?: string;
}

export const WelcomeDashboard = memo<WelcomeDashboardProps>(({
  onNewProject,
  onOpenProject,
  onOpenProjectList,
  onOpenShortcuts,
  autoResumeEnabled,
  onAutoResumeChange,
  className,
}) => {
  const [projects, setProjects] = useState<VisualProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Content from constants (fix: no longer hardcoded / from backend)
  const { title, tagline, sections, keyboardHints } = WELCOME_CONTENT;

  // Load recent projects
  useEffect(() => {
    const loadProjects = async () => {
      setIsLoading(true);
      try {
        const allProjects = await getAllVisualProjects();
        setProjects(allProjects.slice(0, 10));
      } catch (error) {
        console.error('Failed to load projects:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProjects();
  }, []);

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

  // Filter projects by search (mock: filters in memory)
  const filteredProjects = searchQuery.trim()
    ? projects.filter(
        (p) =>
          (typeof p.name === 'string' && p.name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : projects;

  return (
    <div className={cn('flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6 relative', className)}>
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none" />
      
      <div className="w-full max-w-5xl relative z-10">
        {/* Enhanced Header with better icon layout */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="relative">
              <AppLogo size="lg" showText={false} />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            </div>
            <ThemeSwitcherButton />
          </div>
          
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            {title}
          </h1>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
            {tagline}
          </p>
          
          {/* Improved Feature Icons Layout */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            <div className="flex items-center gap-2 p-1 bg-muted/30 rounded-lg">
              <TutorialButton />
              <ImportProjectButton />
              <CloudSyncButton />
            </div>
            <div className="flex items-center gap-2 p-1 bg-muted/30 rounded-lg">
              <KeyboardShortcutsButton onClick={onOpenShortcuts} />
              <ExportBackupButton />
            </div>
          </div>
        </div>

        {/* Enhanced Recent Projects Section */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 bg-primary rounded-full" />
              <h2 className="text-xl font-semibold">{sections.recentProjects}</h2>
              <span className="text-sm text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
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
              <SortProjectsDropdown />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onOpenProjectList}
                className="hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <FolderOpen size={14} className="mr-2" />
                {sections.viewAll}
              </Button>
            </div>
          </div>

          {/* Fixed ScrollArea with proper corners and Z-index */}
          <div className="relative rounded-xl border bg-card shadow-sm overflow-hidden">
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
              <ScrollArea className="h-[320px]">
                <div className="p-4 space-y-3">
                  {filteredProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      isSelected={selectedProjectId === project.id}
                      onSelect={() => handleProjectSelect(project.id)}
                      onOpen={() => handleProjectOpen(project.id)}
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
            className="flex-1 h-14 text-base font-medium group relative overflow-hidden" 
            onClick={onNewProject}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <Plus size={20} className="mr-3 relative z-10" />
            <span className="relative z-10">{sections.newProject}</span>
            <span className="ml-3 text-xs opacity-60 bg-muted/30 px-2 py-1 rounded-full relative z-10">N</span>
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            className="flex-1 h-14 text-base font-medium hover:border-primary hover:bg-primary/5 transition-all" 
            onClick={onOpenProjectList}
          >
            <FolderOpen size={20} className="mr-3" />
            {sections.openExisting}
          </Button>
        </div>

        {/* Enhanced Settings Section */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 bg-muted/20 rounded-xl border">
          <div className="flex items-center gap-3">
            <Checkbox
              id="auto-resume"
              checked={autoResumeEnabled}
              onCheckedChange={(checked) => onAutoResumeChange(checked === true)}
              className="w-5 h-5"
            />
            <Label htmlFor="auto-resume" className="text-sm font-medium cursor-pointer flex items-center gap-2">
              <Shield size={14} className="text-muted-foreground" />
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
