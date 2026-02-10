import React, { memo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Image, Layers, Clock, FolderOpen, Copy, Trash2, Play, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { VisualProject } from '@/core/storage/VisualProjectStorage';
import { DuplicateProjectButton, DeleteProjectButton } from './features';

interface ProjectCardProps {
  project: VisualProject;
  isSelected: boolean;
  onSelect: () => void;
  onOpen: () => void;
}

/** Improved project card with better layout and interactions */
export const ProjectCard = memo<ProjectCardProps>(({ project, isSelected, onSelect, onOpen }) => {
  const pageCount = project.pages.length;
  const segmentCount = project.pages.reduce((acc, p) => acc + p.segments.length, 0);
  const thumbnail = project.pages[0]?.data;
  const lastModified = formatDistanceToNow(project.modifiedAt, { addSuffix: true });
  const displayName = typeof project.name === 'string' ? project.name : 'Untitled';

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.info(`Duplicate "${displayName}" (mock)`);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.info(`Delete "${displayName}" (mock)`);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Card
          className={cn(
            'group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:ring-2 hover:ring-primary/30 active:scale-[0.98]',
            isSelected && 'ring-2 ring-primary shadow-lg'
          )}
          onClick={onOpen}
        >
          <CardContent className="p-4">
            <div className="flex gap-4">
              {/* Thumbnail */}
              <div className="w-24 h-16 rounded-lg bg-muted/50 flex items-center justify-center overflow-hidden shrink-0 border border-border/50">
                {thumbnail ? (
                  <img
                    src={typeof thumbnail === 'string' ? thumbnail : ''}
                    alt={displayName}
                    className="w-full h-full object-cover rounded-md"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground/60">
                    <Image size={20} />
                    <span className="text-xs">No Preview</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-base truncate flex-1">{displayName}</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen();
                    }}
                  >
                    <Play size={16} className="text-primary" />
                  </Button>
                </div>
                
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Image size={14} className="text-blue-500" />
                    <span className="font-medium">{pageCount}</span>
                    <span className="text-xs">{pageCount === 1 ? 'page' : 'pages'}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Layers size={14} className="text-green-500" />
                    <span className="font-medium">{segmentCount}</span>
                    <span className="text-xs">{segmentCount === 1 ? 'segment' : 'segments'}</span>
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                  <Clock size={12} />
                  <span>Modified {lastModified}</span>
                </div>
              </div>

              {/* Actions - Cleaner, more accessible */}
              <div className="flex items-center gap-1 shrink-0 self-start opacity-0 group-hover:opacity-100 transition-opacity">
                <DuplicateProjectButton 
                  projectId={project.id} 
                  projectName={displayName}
                  className="h-8 w-8" 
                />
                <DeleteProjectButton 
                  projectId={project.id} 
                  projectName={displayName}
                  className="h-8 w-8" 
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem 
          onClick={onOpen}
          className="font-medium"
        >
          <FolderOpen className="mr-3 h-4 w-4 text-primary" />
          Open Project
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleDuplicate}>
          <Copy className="mr-3 h-4 w-4" />
          Duplicate Project
        </ContextMenuItem>
        <ContextMenuItem
          className="text-destructive focus:text-destructive"
          onClick={handleDelete}
        >
          <Trash2 className="mr-3 h-4 w-4" />
          Delete Project
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
});

ProjectCard.displayName = 'ProjectCard';
