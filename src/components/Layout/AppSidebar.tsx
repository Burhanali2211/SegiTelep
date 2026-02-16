import React, { memo, useState, useEffect } from 'react';
import { useUserStore } from '@/store/userStore';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
}
  from '@/components/ui/sidebar';
import {
  Home,
  User,
  Image,
  PenTool,
  Layers,
  Search,
  Settings,
  Clock,
  Play,
  Pause,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Command,
  Maximize,
  Eye,
  Music,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useVisualEditorState } from '@/components/Teleprompter/VisualEditor/useVisualEditorState';
import { ToolSection } from '@/components/Teleprompter/VisualEditor/components/panels/ToolSection';
import { ImageSection } from '@/components/Teleprompter/VisualEditor/components/panels/ImageSection';
import { PDFSection } from '@/components/Teleprompter/VisualEditor/components/panels/PDFSection';
import { useImageProcessing } from '@/components/Teleprompter/VisualEditor/hooks/useImageProcessing';
import { useUndoRedo } from '@/components/Teleprompter/VisualEditor/useUndoRedo';
import { VisualSegment } from '@/components/Teleprompter/VisualEditor/types/visualEditor.types';
import { toast } from 'sonner';

interface AppSidebarProps {
  projectName?: string;
  isPlaying?: boolean;
  recentProjects?: Array<{ id: string; name: string }>;
  onNavigate?: (section: string) => void;
  onProjectSelect?: (projectId: string) => void;
  onTogglePlayback?: () => void;
  onOpenCountdown?: () => void;
  onOpenAudioManager?: () => void;
  onOpenPlayerIndicatorSettings?: () => void;
  onPlay?: () => void;
  className?: string;
}


export const AppSidebar = memo<AppSidebarProps>(({
  projectName = 'Untitled Project',
  isPlaying = false,
  recentProjects = [],
  onNavigate,
  onProjectSelect,
  onTogglePlayback,
  onOpenCountdown,
  onOpenAudioManager,
  onOpenPlayerIndicatorSettings,
  onPlay,
  className,
}) => {

  const { toggleSidebar, state } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const { user, loadUser } = useUserStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState(['navigation', 'tools']);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const filteredRecentProjects = (recentProjects || []).filter(project =>
    (typeof project?.name === 'string' ? project.name : '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Visual Editor State
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const visualPages = useVisualEditorState((s) => s.pages);
  const currentPageIndex = useVisualEditorState((s) => s.currentPageIndex);
  const selectedSegmentIds = useVisualEditorState((s) => s.selectedSegmentIds);
  const isDrawing = useVisualEditorState((s) => s.isDrawing);
  const chainTimesMode = useVisualEditorState((s) => s.chainTimesMode);
  const zoom = useVisualEditorState((s) => s.zoom);

  const addPage = useVisualEditorState((s) => s.addPage);
  const removePage = useVisualEditorState((s) => s.removePage);
  const setCurrentPage = useVisualEditorState((s) => s.setCurrentPage);
  const selectSegment = useVisualEditorState((s) => s.selectSegment);
  const setPlaybackTime = useVisualEditorState((s) => s.setPlaybackTime);
  const setPlaying = useVisualEditorState((s) => s.setPlaying);
  const setDrawing = useVisualEditorState((s) => s.setDrawing);
  const toggleChainMode = useVisualEditorState((s) => s.toggleChainMode);
  const copySelected = useVisualEditorState((s) => s.copySelected);
  const deleteSegments = useVisualEditorState((s) => s.deleteSegments);
  const setZoom = useVisualEditorState((s) => s.setZoom);
  const resetView = useVisualEditorState((s) => s.resetView);

  const { undo, redo, canUndo, canRedo, saveState } = useUndoRedo();
  const { handleFileChange } = useImageProcessing(addPage);

  const handleAddPDFPages = React.useCallback(async (pdfPages: { pageNumber: number; imageData: string }[]) => {
    for (const pdfPage of pdfPages) {
      await addPage(pdfPage.imageData, true);
    }
    saveState();
  }, [addPage, saveState]);

  const handleAddImage = React.useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const navigationItems = [
    {
      title: 'Dashboard',
      icon: Home,
      id: 'dashboard',
      badge: null,
      shortcut: 'D',
    },
    {
      title: 'Director Profile',
      icon: User,
      id: 'profile',
      description: 'Manager your account',
    },

  ];

  return (
    <Sidebar
      collapsible="icon"
      className={cn(
        'border-r border-border bg-sidebar transition-all duration-300 ease-in-out will-change-[width]',
        className
      )}
    >
      <SidebarHeader className="p-3 space-y-2 group-data-[collapsible=icon]:p-2">
        <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
          <div className="flex items-center gap-3 group-data-[collapsible=icon]:hidden">
            <div className="relative group/logo">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-accent/50 rounded-xl blur opacity-25 group-hover/logo:opacity-50 transition duration-500"></div>
              <div className="relative w-10 h-10 bg-sidebar/50 backdrop-blur-sm border border-white/5 rounded-xl flex items-center justify-center shadow-2xl">
                <Play size={20} className="text-primary fill-primary/20" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold tracking-tight text-foreground/90">SegiTelep</h2>
                <Badge variant="outline" className="h-4 px-1 text-[10px] font-medium border-primary/20 text-primary bg-primary/5">PRO</Badge>
              </div>
              <p className="text-[11px] font-medium text-muted-foreground truncate opacity-70 text-left">
                {typeof projectName === 'string' ? projectName : (projectName ? 'Invalid Name' : 'Professional Broadcast')}
              </p>
            </div>
          </div>

          <SidebarTrigger className="text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors" />
        </div>

        <div className="group-data-[collapsible=icon]:hidden">
          <div className="relative group/search">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/search:text-primary transition-colors duration-200" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-12 h-9 text-xs bg-black/20 border-white/5 focus-visible:ring-primary/50 placeholder:text-muted-foreground/50 transition-all duration-200"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-40 group-focus-within/search:opacity-0 transition-opacity duration-200">
              <Command size={10} />
              <span className="text-[10px] font-sans">K</span>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className={cn("px-3 overflow-x-hidden")}>
        <div className="flex flex-col gap-4 py-2 min-h-0">
          {/* Collapsed View Icons */}
          <div className="hidden group-data-[collapsible=icon]:flex flex-col gap-2 items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-9 w-9 text-muted-foreground hover:text-foreground">
                  <PenTool size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Visual Tools</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-9 w-9 text-muted-foreground hover:text-foreground">
                  <Image size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Media Assets</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-9 w-9 text-muted-foreground hover:text-foreground">
                  <Layers size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Layers & Regions</TooltipContent>
            </Tooltip>
          </div>

          {/* Expanded View Content - Only rendered when sidebar is open for performance */}
          {!isCollapsed && (
            <div className="flex flex-col animate-in fade-in duration-500">
              <SidebarGroup className="p-0 mb-2">
                <SidebarGroupLabel className="px-2 mb-1 text-muted-foreground/70 font-bold tracking-wider text-[10px] uppercase">Navigation</SidebarGroupLabel>
                <div className="flex gap-1 px-1">
                  {navigationItems.map((item) => (
                    <Button
                      key={item.id}
                      variant="ghost"
                      onClick={() => onNavigate?.(item.id)}
                      className="flex-1 h-8 px-2 rounded-lg hover:bg-white/5 transition-all group flex items-center justify-center gap-2"
                    >
                      <item.icon size={14} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                      <span className="text-[10px] font-medium truncate">{item.title}</span>
                    </Button>
                  ))}
                </div>
              </SidebarGroup>

              <SidebarGroup className="p-0 mb-1">
                <SidebarGroupLabel className="px-2 mb-1 text-primary/70 font-bold tracking-wider text-[10px] uppercase">Visual Tools</SidebarGroupLabel>
                <div className="bg-sidebar-accent/50 rounded-xl border border-white/5 mx-1">
                  <ToolSection
                    isDrawing={isDrawing}
                    chainTimesMode={chainTimesMode}
                    zoom={zoom}
                    selectedSegmentIds={selectedSegmentIds}
                    setDrawing={setDrawing}
                    toggleChainMode={toggleChainMode}
                    setZoom={setZoom}
                    resetView={resetView}
                    copySelected={copySelected}
                    deleteSegments={deleteSegments}
                  />
                </div>
              </SidebarGroup>

              <SidebarGroup className="p-0 mb-2">
                <SidebarGroupLabel className="px-2 mb-1 text-muted-foreground/70 font-bold tracking-wider text-[10px] uppercase">Media Assets</SidebarGroupLabel>
                <div className="space-y-4 px-2">
                  <ImageSection
                    pages={visualPages}
                    currentPageIndex={currentPageIndex}
                    onAddImage={handleAddImage}
                    onSelectPage={setCurrentPage}
                    onRemovePage={removePage}
                    fileInputRef={fileInputRef}
                    onFileChange={handleFileChange}
                  />

                  <Separator className="opacity-10" />

                  <PDFSection
                    pages={visualPages}
                    currentPageIndex={currentPageIndex}
                    onAddPages={handleAddPDFPages}
                    onSelectPage={setCurrentPage}
                    onRemovePage={removePage}
                  />
                </div>
              </SidebarGroup>
            </div>
          )}
        </div>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="relative overflow-hidden p-3 mb-2 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border border-white/5 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-status-active animate-pulse"></div>
            <span className="text-[10px] font-bold text-status-active uppercase tracking-widest">On Air Signal</span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed mb-3">
            Your stream is ready. Check all inputs before starting.
          </p>

          <div className="flex items-center gap-0.5">
            <Button
              variant="default"
              size="sm"
              className="flex-1 h-9 text-[11px] font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 gap-2"
              onClick={onPlay}
            >
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span>GO LIVE NOW</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="default"
                  size="icon"
                  className="w-9 h-9 bg-primary/90 hover:bg-primary border-l border-white/10"
                >
                  <Settings size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="w-56 bg-sidebar/95 backdrop-blur-2xl border-white/10 shadow-2xl">
                <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground p-3">
                  Broadcast Settings
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/5" />

                <DropdownMenuItem onClick={onPlay} className="cursor-pointer focus:bg-white/5 py-2.5">
                  <Maximize size={14} className="mr-3 text-primary" />
                  <span className="text-xs font-semibold">Start Fullscreen Player</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-white/5" />

                <DropdownMenuItem onClick={onOpenCountdown} className="cursor-pointer focus:bg-white/5 py-2.5">
                  <Clock size={14} className="mr-3 text-muted-foreground" />
                  <span className="text-xs">Countdown Delay</span>
                </DropdownMenuItem>


                {onOpenPlayerIndicatorSettings && (
                  <>
                    <DropdownMenuSeparator className="bg-white/5" />
                    <DropdownMenuItem onClick={onOpenPlayerIndicatorSettings} className="cursor-pointer focus:bg-white/5 py-2.5">
                      <Eye size={14} className="mr-3 text-muted-foreground" />
                      <span className="text-xs">Player Indicators</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Separator className="bg-white/5 mb-2" />



      </SidebarFooter>
    </Sidebar >
  );
});

AppSidebar.displayName = 'AppSidebar';
