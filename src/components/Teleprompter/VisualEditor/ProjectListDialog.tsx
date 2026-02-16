import React, { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  Upload,
  Calendar,
  Image as ImageIcon,
  Grid,
  List as ListIcon,
  Search,
  MoreVertical,
  Trash2,
  Copy,
  Download,
  Clock,
  Layers,
  FolderOpen,
  Plus,
  FileText,
  Play,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useAssetUrl } from '@/hooks/useAssetUrl';
import {
  getAllVisualProjects,
  deleteVisualProject,
  duplicateVisualProject,
  exportVisualProject,
  importVisualProject,
  VisualProject,
} from '@/core/storage/VisualProjectStorage';
import { toast } from 'sonner';

function ProjectThumbnail({ project, mode = 'list' }: { project: VisualProject; mode?: 'list' | 'grid' }) {
  const firstPage = project.pages[0];
  const { url } = useAssetUrl(firstPage?.assetId, firstPage?.data);
  const isPDF = firstPage?.isPDF;

  return (
    <div className={cn(
      "rounded-lg bg-slate-900 flex items-center justify-center overflow-hidden shrink-0 border border-white/5 shadow-inner transition-all duration-500",
      mode === 'grid' ? "w-full aspect-video mb-3" : "w-16 h-12"
    )}>
      {url && !isPDF ? (
        <img src={url} alt="" className="w-full h-full object-cover transition-transform duration-700 hover:scale-110" />
      ) : isPDF ? (
        <div className="flex flex-col items-center gap-1 opacity-60 text-red-400">
          <FileText className={cn(mode === 'grid' ? "w-8 h-8" : "w-4 h-4")} />
          {mode === 'grid' && <span className="text-[10px] font-bold uppercase tracking-widest">PDF Project</span>}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1 opacity-40">
          <ImageIcon className={cn(mode === 'grid' ? "w-8 h-8" : "w-4 h-4")} />
          {mode === 'grid' && <span className="text-[10px] font-bold uppercase tracking-widest">No Preview</span>}
        </div>
      )}
    </div>
  );
}

interface ProjectListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectProject: (id: string) => void;
  onGoLive?: (id: string) => void;
  onNewProject: () => void;
  currentProjectId: string | null;
}

export function ProjectListDialog({
  open,
  onOpenChange,
  onSelectProject,
  onGoLive,
  onNewProject,
  currentProjectId,
}: ProjectListDialogProps) {
  const [projects, setProjects] = useState<VisualProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

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
    (typeof p.name === 'string' ? p.name : '').toLowerCase().includes(searchQuery.toLowerCase())
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
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col bg-slate-950/95 backdrop-blur-2xl border-white/10 p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="flex items-center gap-2 text-white">
              <FolderOpen className="w-5 h-5 text-blue-400" />
              Project Library
            </DialogTitle>
            <DialogDescription className="sr-only">
              Manage and organize your teleprompter projects.
            </DialogDescription>
          </DialogHeader>

          {/* Actions Bar */}
          <div className="flex items-center gap-3 px-6 py-3 border-y border-white/10 bg-white/[0.02]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 bg-white/5 border-white/10 focus:border-blue-500/50 focus:ring-blue-500/20 text-white"
              />
            </div>

            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grid' | 'list')} className="hidden sm:block">
              <TabsList className="bg-white/5 border border-white/10 h-10 p-1">
                <TabsTrigger value="grid" className="h-8 px-3 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
                  <Grid size={14} />
                </TabsTrigger>
                <TabsTrigger value="list" className="h-8 px-3 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
                  <ListIcon size={14} />
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Button variant="outline" className="h-10 border-white/10 hover:bg-white/5 text-slate-300" onClick={handleImport}>
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>

            <Button className="h-10 bg-blue-600 hover:bg-blue-500 font-bold" onClick={() => { onNewProject(); onOpenChange(false); }}>
              <Plus className="w-4 h-4 mr-2" />
              New
            </Button>
          </div>

          <ScrollArea className="flex-1 px-6">
            <div className="py-6">
              {loading ? (
                <div className={cn(
                  "transition-all duration-300",
                  viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"
                )}>
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className={cn(
                      "rounded-xl border border-white/5 bg-white/[0.02] p-4",
                      viewMode === 'list' && "flex items-center gap-4"
                    )}>
                      <Skeleton className={cn("rounded bg-white/5", viewMode === 'grid' ? "w-full aspect-video mb-4" : "w-16 h-12")} />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4 bg-white/5" />
                        <Skeleton className="h-3 w-1/2 bg-white/5" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                    <FolderOpen className="w-10 h-10 text-slate-600" />
                  </div>
                  <h4 className="text-xl font-bold text-white mb-2">
                    {searchQuery ? 'No Results Found' : 'No Projects Yet'}
                  </h4>
                  <p className="text-slate-400 max-w-xs mx-auto mb-8">
                    {searchQuery ? `We couldn't find any projects matching "${searchQuery}"` : 'Get started by creating your very first project.'}
                  </p>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={handleImport} className="border-white/10">
                      Import Project
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-500 font-bold" onClick={() => { onNewProject(); onOpenChange(false); }}>
                      Create Project
                    </Button>
                  </div>
                </div>
              ) : (
                <div className={cn(
                  "transition-all duration-300",
                  viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" : "space-y-2"
                )}>
                  {filteredProjects.map((project) => (
                    <div
                      key={project.id}
                      className={cn(
                        'group relative rounded-xl border border-white/5 bg-white/[0.02] transition-all duration-300 cursor-pointer overflow-hidden',
                        'hover:bg-white/[0.08] hover:border-blue-500/30 hover:-translate-y-1',
                        viewMode === 'list' ? 'flex items-center gap-4 p-3' : 'flex flex-col p-4',
                        currentProjectId === project.id && 'border-blue-500/50 bg-blue-500/10'
                      )}
                      onClick={() => {
                        onSelectProject(project.id);
                        onOpenChange(false);
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <ProjectThumbnail project={project} mode={viewMode} />
                      <div className="flex-1 min-w-0 relative z-10">
                        <h4 className={cn(
                          "font-bold text-white transition-colors group-hover:text-blue-300 truncate",
                          viewMode === 'grid' ? "text-base mb-1" : "text-sm"
                        )}>
                          {typeof project.name === 'string' ? project.name : 'Untitled'}
                        </h4>
                        <div className={cn(
                          "flex items-center flex-wrap gap-x-3 gap-y-1 text-[10px] font-medium tracking-tight text-slate-500",
                          viewMode === 'grid' ? "mb-1" : ""
                        )}>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(project.modifiedAt)}
                          </span>
                          <span className="flex items-center gap-1 text-blue-400/70">
                            <ImageIcon className="w-3 h-3" />
                            {project.pages.length}
                          </span>
                          <span className="flex items-center gap-1 text-emerald-400/70">
                            <Layers className="w-3 h-3" />
                            {project.pages.reduce((acc, p) => acc + p.segments.length, 0)}
                          </span>
                        </div>
                      </div>
                      <div className={cn(
                        "flex items-center gap-1 transition-opacity relative z-10",
                        viewMode === 'grid' ? "mt-3 pt-3 border-t border-white/5" : "opacity-0 group-hover:opacity-100"
                      )}>
                        {viewMode === 'grid' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-[11px] font-bold text-blue-400 hover:bg-blue-500/10"
                            onClick={(e) => { e.stopPropagation(); onSelectProject(project.id); onOpenChange(false); }}
                          >
                            Open
                          </Button>
                        )}
                        {onGoLive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/10"
                            onClick={(e) => { e.stopPropagation(); onGoLive(project.id); onOpenChange(false); }}
                          >
                            <Play size={10} className="mr-1 fill-current" />
                            Go Live
                          </Button>
                        )}
                        <div className="flex-1" />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10 text-slate-400">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-slate-900 border-white/10 text-slate-300">
                            <DropdownMenuItem onSelect={(e) => { e?.preventDefault?.(); handleDuplicate(project.id); }}>
                              <Copy className="w-4 h-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={(e) => { e?.preventDefault?.(); handleExport(project); }}>
                              <Download className="w-4 h-4 mr-2" />
                              Export
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-400 focus:text-red-400"
                              onSelect={(e) => { e?.preventDefault?.(); setDeleteConfirm(project.id); }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent className="bg-slate-950 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Project?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This action cannot be undone. The project and all its data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-slate-300 hover:bg-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-500"
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
