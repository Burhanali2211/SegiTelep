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
import type { VisualProject } from '@/core/storage/VisualProjectStorage';
import { DuplicateProjectButton, DeleteProjectButton } from './features';

interface ProjectCardProps {
  project: VisualProject;
  isSelected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  variant?: 'list' | 'grid';
}

/** Improved project card with better layout and interactions */
export const ProjectCard = memo<ProjectCardProps>(({
  project,
  isSelected,
  onSelect,
  onOpen,
  onDuplicate,
  onDelete,
  variant = 'list'
}) => {
  const pageCount = project.pages.length;
  const segmentCount = project.pages.reduce((acc, p) => acc + p.segments.length, 0);
  const thumbnail = project.pages[0]?.data;
  const lastModified = formatDistanceToNow(project.modifiedAt, { addSuffix: true });
  const displayName = typeof project.name === 'string' ? project.name : 'Untitled';

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDuplicate(project.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(project.id);
  };

  const isGrid = variant === 'grid';

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Card
          className={cn(
            'group cursor-pointer transition-all duration-500 border-white/5 bg-white/[0.03] backdrop-blur-xl hover:bg-white/[0.08] hover:border-blue-400/40 hover:-translate-y-1.5 active:scale-[0.98] overflow-hidden relative',
            isGrid ? 'flex flex-col h-full' : 'w-full',
            isSelected && 'ring-2 ring-blue-500/50 bg-blue-500/10 shadow-[0_0_30px_rgba(59,130,246,0.2)]'
          )}
          onClick={onOpen}
        >
          {/* Animated background glow on hover */}
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-emerald-500/0 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-700 pointer-events-none" />

          <CardContent className={cn('p-0 relative z-10', isGrid ? 'flex flex-col h-full' : 'p-4')}>
            <div className={cn('flex gap-4', isGrid && 'flex-col gap-0')}>
              {/* Thumbnail Container */}
              <div className={cn(
                'relative overflow-hidden group/thumb',
                isGrid ? 'w-full aspect-video' : 'w-32 h-20 rounded-xl shrink-0 border border-white/10 shadow-lg'
              )}>
                {thumbnail ? (
                  <img
                    src={typeof thumbnail === 'string' ? thumbnail : ''}
                    alt={displayName}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover/thumb:scale-110"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center justify-center gap-2 text-slate-500">
                    <Image size={isGrid ? 32 : 24} strokeWidth={1.5} />
                    <span className="text-[10px] uppercase tracking-widest font-bold opacity-50">No Preview</span>
                  </div>
                )}

                {/* Play Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
                    <Play size={20} className="fill-current ml-0.5" />
                  </div>
                </div>

                {isGrid && (
                  <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-blue-400 border border-white/10 flex items-center gap-1">
                      <Image size={10} /> {pageCount}
                    </span>
                  </div>
                )}
              </div>

              {/* Info Container */}
              <div className={cn('flex-1 min-w-0 flex flex-col', isGrid ? 'p-4 pb-3' : 'justify-center')}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className={cn(
                    'font-bold tracking-tight text-white transition-colors group-hover:text-blue-300',
                    isGrid ? 'text-lg mb-1' : 'text-base truncate'
                  )}>
                    {displayName}
                  </h3>

                  {!isGrid && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                      <DuplicateProjectButton
                        projectId={project.id}
                        projectName={displayName}
                        className="h-8 w-8 bg-white/5 hover:bg-blue-500/20 hover:text-blue-400 border-white/5"
                        onClick={() => onDuplicate(project.id)}
                      />
                      <DeleteProjectButton
                        projectId={project.id}
                        projectName={displayName}
                        className="h-8 w-8 bg-white/5 hover:bg-red-500/20 hover:text-red-400 border-white/5"
                        onClick={() => onDelete(project.id)}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400 font-medium">
                  {!isGrid && (
                    <>
                      <span className="flex items-center gap-1.5 text-blue-400/80">
                        <Image size={12} />
                        {pageCount} {pageCount === 1 ? 'Page' : 'Pages'}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-slate-700" />
                      <span className="flex items-center gap-1.5 text-emerald-400/80">
                        <Layers size={12} />
                        {segmentCount} {segmentCount === 1 ? 'Segment' : 'Segments'}
                      </span>
                    </>
                  )}
                  {isGrid && (
                    <span className="flex items-center gap-1.5 text-emerald-400/80">
                      <Layers size={12} />
                      {segmentCount} Segments
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 mt-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  <Clock size={10} />
                  <span>Modified {lastModified}</span>
                </div>

                {isGrid && (
                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="flex items-center gap-1">
                      <DuplicateProjectButton
                        projectId={project.id}
                        projectName={displayName}
                        variant="ghost"
                        className="h-8 px-2 text-xs hover:bg-blue-500/10 hover:text-blue-400"
                        onClick={() => onDuplicate(project.id)}
                      />
                      <DeleteProjectButton
                        projectId={project.id}
                        projectName={displayName}
                        variant="ghost"
                        className="h-8 px-2 text-xs hover:bg-red-500/10 hover:text-red-400"
                        onClick={() => onDelete(project.id)}
                      />
                    </div>
                    <Button
                      size="sm"
                      className="h-8 bg-blue-600 hover:bg-blue-500 text-white font-bold"
                      onClick={(e) => { e.stopPropagation(); onOpen(); }}
                    >
                      Open
                    </Button>
                  </div>
                )}
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
