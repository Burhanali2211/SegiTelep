import React, { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  FolderOpen, 
  Plus, 
  Search, 
  MoreVertical, 
  Trash2, 
  Copy, 
  Download,
  Upload,
  Calendar,
  Image as ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getAllVisualProjects,
  deleteVisualProject,
  duplicateVisualProject,
  exportVisualProject,
  importVisualProject,
  VisualProject,
} from '@/core/storage/VisualProjectStorage';
import { toast } from 'sonner';

interface ProjectListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectProject: (id: string) => void;
  onNewProject: () => void;
  currentProjectId: string | null;
}

export function ProjectListDialog({
  open,
  onOpenChange,
  onSelectProject,
  onNewProject,
  currentProjectId,
}: ProjectListDialogProps) {
  const [projects, setProjects] = useState<VisualProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  // Load projects
  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getAllVisualProjects();
      setProjects(all);
    } catch (error) {
      console.error('Failed to load projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    if (open) {
      loadProjects();
    }
  }, [open, loadProjects]);
  
  // Filter projects
  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Delete project
  const handleDelete = async (id: string) => {
    try {
      await deleteVisualProject(id);
      toast.success('Project deleted');
      loadProjects();
      setDeleteConfirm(null);
    } catch (error) {
      toast.error('Failed to delete project');
    }
  };
  
  // Duplicate project
  const handleDuplicate = async (id: string) => {
    try {
      const duplicated = await duplicateVisualProject(id);
      if (duplicated) {
        toast.success(`Duplicated: ${duplicated.name}`);
        loadProjects();
      }
    } catch (error) {
      toast.error('Failed to duplicate project');
    }
  };
  
  // Export project
  const handleExport = (project: VisualProject) => {
    try {
      exportVisualProject(project);
      toast.success('Project exported');
    } catch (error) {
      toast.error('Failed to export project');
    }
  };
  
  // Import project
  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.visualprompt.json,.json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const imported = await importVisualProject(file);
        toast.success(`Imported: ${imported.name}`);
        loadProjects();
      } catch (error) {
        toast.error('Failed to import project. Invalid file format.');
      }
    };
    
    input.click();
  };
  
  // Format date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    
    return date.toLocaleDateString();
  };
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              Projects
            </DialogTitle>
          </DialogHeader>
          
          {/* Actions Bar */}
          <div className="flex items-center gap-2 pb-2 border-b">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            
            <Button variant="outline" size="sm" onClick={handleImport}>
              <Upload className="w-4 h-4 mr-1.5" />
              Import
            </Button>
            
            <Button size="sm" onClick={() => { onNewProject(); onOpenChange(false); }}>
              <Plus className="w-4 h-4 mr-1.5" />
              New Project
            </Button>
          </div>
          
          {/* Project List */}
          <ScrollArea className="flex-1 -mx-6 px-6">
            {loading ? (
              <div className="space-y-3 py-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                    <Skeleton className="w-16 h-12 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FolderOpen className="w-12 h-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'No projects match your search' : 'No projects yet'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => { onNewProject(); onOpenChange(false); }}
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Create your first project
                </Button>
              </div>
            ) : (
              <div className="space-y-2 py-2">
                {filteredProjects.map((project) => (
                  <div
                    key={project.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                      'hover:bg-accent/50',
                      currentProjectId === project.id && 'border-primary bg-primary/5'
                    )}
                    onClick={() => {
                      onSelectProject(project.id);
                      onOpenChange(false);
                    }}
                  >
                    {/* Thumbnail */}
                    <div className="w-16 h-12 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {project.pages.length > 0 && project.pages[0].data ? (
                        <img
                          src={project.pages[0].data}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-muted-foreground/50" />
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{project.name}</h4>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(project.modifiedAt)}
                        </span>
                        <span>{project.pages.length} page{project.pages.length !== 1 ? 's' : ''}</span>
                        <span>
                          {project.pages.reduce((acc, p) => acc + p.segments.length, 0)} segment{project.pages.reduce((acc, p) => acc + p.segments.length, 0) !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="shrink-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(project.id); }}>
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleExport(project); }}>
                          <Download className="w-4 h-4 mr-2" />
                          Export
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirm(project.id); }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The project and all its data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
