import React, { memo, useCallback, useState, useEffect } from 'react';
import { useTeleprompterStore } from '@/store/teleprompterStore';
import { 
  getAllProjects, 
  createProject, 
  deleteProject,
  exportProject,
  importProject,
  loadProject 
} from '@/core/storage/ProjectStorage';
import { Project } from '@/types/teleprompter.types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  FolderOpen, 
  Download, 
  Upload,
  Trash2,
  Clock,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProjectManager = memo<ProjectManagerProps>(({ open, onOpenChange }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [loading, setLoading] = useState(false);
  
  const setProject = useTeleprompterStore((s) => s.setProject);
  const currentProject = useTeleprompterStore((s) => s.project);
  
  // Load projects list
  const loadProjects = useCallback(async () => {
    setLoading(true);
    const all = await getAllProjects();
    setProjects(all);
    setLoading(false);
  }, []);
  
  useEffect(() => {
    if (open) {
      loadProjects();
    }
  }, [open, loadProjects]);
  
  // Create new project
  const handleCreate = useCallback(async () => {
    const name = newProjectName.trim() || 'Untitled Project';
    const project = await createProject(name);
    setProject(project);
    setNewProjectName('');
    onOpenChange(false);
  }, [newProjectName, setProject, onOpenChange]);
  
  // Open existing project
  const handleOpen = useCallback(async (id: string) => {
    const project = await loadProject(id);
    if (project) {
      setProject(project);
      onOpenChange(false);
    }
  }, [setProject, onOpenChange]);
  
  // Delete project
  const handleDelete = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this project? This cannot be undone.')) {
      await deleteProject(id);
      if (currentProject?.id === id) {
        setProject(null);
      }
      loadProjects();
    }
  }, [currentProject?.id, setProject, loadProjects]);
  
  // Export project
  const handleExport = useCallback((project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    exportProject(project);
  }, []);
  
  // Import project
  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const project = await importProject(file);
      setProject(project);
      onOpenChange(false);
    } catch (error) {
      alert('Failed to import project. Please check the file format.');
    }
    
    // Reset input
    e.target.value = '';
  }, [setProject, onOpenChange]);
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Projects</DialogTitle>
          <DialogDescription>
            Create a new project or open an existing one
          </DialogDescription>
        </DialogHeader>
        
        {/* New Project */}
        <div className="flex gap-2">
          <Input
            placeholder="New project name..."
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <Button onClick={handleCreate}>
            <Plus size={16} className="mr-1" />
            Create
          </Button>
        </div>
        
        {/* Import */}
        <div className="flex gap-2">
          <label className="flex-1">
            <input
              type="file"
              accept=".json,.teleprompt.json"
              onChange={handleImport}
              className="hidden"
            />
            <Button variant="outline" className="w-full" asChild>
              <span>
                <Upload size={16} className="mr-2" />
                Import Project
              </span>
            </Button>
          </label>
        </div>
        
        {/* Projects List */}
        <div className="border rounded-lg overflow-hidden">
          <div className="max-h-[300px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">
                Loading...
              </div>
            ) : projects.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <FolderOpen size={32} className="mx-auto mb-2 opacity-50" />
                <p>No projects yet</p>
              </div>
            ) : (
              projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => handleOpen(project.id)}
                  className={cn(
                    'flex items-center gap-3 p-3 cursor-pointer hover:bg-secondary/50 border-b last:border-b-0',
                    currentProject?.id === project.id && 'bg-primary/10'
                  )}
                >
                  <FileText size={20} className="text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{project.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{project.segments.length} segment{project.segments.length !== 1 ? 's' : ''}</span>
                      <span>•</span>
                      <Clock size={12} />
                      <span>{formatDate(project.modifiedAt)}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => handleExport(project, e)}
                      title="Export"
                    >
                      <Download size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => handleDelete(project.id, e)}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

ProjectManager.displayName = 'ProjectManager';

export default ProjectManager;
