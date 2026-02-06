import React, { memo, useEffect, useState, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus,
  FolderOpen,
  Image,
  Layers,
  Monitor,
  Clock,
  ChevronRight,
  FileImage,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAllVisualProjects, VisualProject } from '@/core/storage/VisualProjectStorage';

interface WelcomeDashboardProps {
  onNewProject: () => void;
  onOpenProject: (projectId: string) => void;
  onOpenProjectList: () => void;
  autoResumeEnabled: boolean;
  onAutoResumeChange: (enabled: boolean) => void;
  className?: string;
}

interface ProjectCardProps {
  project: VisualProject;
  isSelected: boolean;
  onSelect: () => void;
  onOpen: () => void;
}

const ProjectCard = memo<ProjectCardProps>(({ project, isSelected, onSelect, onOpen }) => {
  const pageCount = project.pages.length;
  const segmentCount = project.pages.reduce((acc, p) => acc + p.segments.length, 0);
  const thumbnail = project.pages[0]?.data;
  const lastModified = formatDistanceToNow(project.modifiedAt, { addSuffix: true });
  
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:ring-2 hover:ring-primary/50',
        isSelected && 'ring-2 ring-primary'
      )}
      onClick={onSelect}
      onDoubleClick={onOpen}
    >
      <CardContent className="p-3">
        <div className="flex gap-3">
          {/* Thumbnail */}
          <div className="w-20 h-14 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
            {thumbnail ? (
              <img
                src={thumbnail}
                alt={project.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <FileImage className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">{project.name}</h3>
            <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Image size={10} />
                {pageCount} {pageCount === 1 ? 'page' : 'pages'}
              </span>
              <span className="flex items-center gap-1">
                <Layers size={10} />
                {segmentCount} {segmentCount === 1 ? 'segment' : 'segments'}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
              <Clock size={9} />
              {lastModified}
            </div>
          </div>
          
          {/* Action */}
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8 self-center"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

ProjectCard.displayName = 'ProjectCard';

export const WelcomeDashboard = memo<WelcomeDashboardProps>(({
  onNewProject,
  onOpenProject,
  onOpenProjectList,
  autoResumeEnabled,
  onAutoResumeChange,
  className,
}) => {
  const [projects, setProjects] = useState<VisualProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  
  // Load recent projects
  useEffect(() => {
    const loadProjects = async () => {
      setIsLoading(true);
      try {
        const allProjects = await getAllVisualProjects();
        setProjects(allProjects.slice(0, 10)); // Limit to 10 most recent
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
      // N for new project
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        onNewProject();
        return;
      }
      
      // Enter to open selected
      if (e.key === 'Enter' && selectedProjectId) {
        e.preventDefault();
        onOpenProject(selectedProjectId);
        return;
      }
      
      // Arrow keys to navigate
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
  
  return (
    <div className={cn('flex flex-col items-center justify-center min-h-screen bg-background p-8', className)}>
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Monitor className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome to ProTeleprompter</h1>
          <p className="text-muted-foreground">
            Create professional teleprompter presentations with visual segments
          </p>
        </div>
        
        {/* Recent Projects */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Recent Projects</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenProjectList}
              className="text-xs"
            >
              <FolderOpen size={14} className="mr-1.5" />
              View All
            </Button>
          </div>
          
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <FileImage className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground text-sm">
                  No projects yet. Create your first project to get started!
                </p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[280px]">
              <div className="space-y-2 pr-4">
                {projects.map((project) => (
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
        
        {/* Actions */}
        <div className="flex gap-3 mb-6">
          <Button
            size="lg"
            className="flex-1"
            onClick={onNewProject}
          >
            <Plus size={18} className="mr-2" />
            New Project
            <span className="ml-2 text-[10px] opacity-60">(N)</span>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={onOpenProjectList}
          >
            <FolderOpen size={18} className="mr-2" />
            Open Existing
          </Button>
        </div>
        
        {/* Auto-resume preference */}
        <div className="flex items-center justify-center gap-2 text-sm">
          <Checkbox
            id="auto-resume"
            checked={autoResumeEnabled}
            onCheckedChange={(checked) => onAutoResumeChange(checked === true)}
          />
          <Label
            htmlFor="auto-resume"
            className="text-muted-foreground cursor-pointer"
          >
            Resume last session automatically on startup
          </Label>
        </div>
        
        {/* Keyboard hints */}
        <div className="mt-8 flex items-center justify-center gap-6 text-[10px] text-muted-foreground">
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-[9px] font-mono">N</kbd>
            {' '}New
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-[9px] font-mono">↑↓</kbd>
            {' '}Navigate
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-[9px] font-mono">Enter</kbd>
            {' '}Open selected
          </span>
        </div>
      </div>
    </div>
  );
});

WelcomeDashboard.displayName = 'WelcomeDashboard';

export default WelcomeDashboard;
