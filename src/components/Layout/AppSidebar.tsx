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
  FileText,
  Image,
  Settings,
  BarChart3,
  Calculator,
  LayoutTemplate,
  Music,
  Radio,
  Mic,
  Search,
  Clock,
  Star,
  Folder,
  Play,
  Pause,
  ChevronDown,
  ChevronRight,
  LogOut,
  User,
  CreditCard,
  Bell,
  CheckCircle2,
  AlertCircle,
  Command,
  Plus,
  MoreVertical,
  ChevronUp,
  PenTool,
  Layers,
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
import { RegionSection } from '@/components/Teleprompter/VisualEditor/components/panels/RegionSection';
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
  className?: string;
}

export const AppSidebar = memo<AppSidebarProps>(({
  projectName = 'Untitled Project',
  isPlaying = false,
  recentProjects = [],
  onNavigate,
  onProjectSelect,
  onTogglePlayback,
  className,
}) => {
  const { toggleSidebar } = useSidebar();
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
  const playbackTime = useVisualEditorState((s) => s.playbackTime);
  const isDrawing = useVisualEditorState((s) => s.isDrawing);
  const chainTimesMode = useVisualEditorState((s) => s.chainTimesMode);
  const zoom = useVisualEditorState((s) => s.zoom);

  const addPage = useVisualEditorState((s) => s.addPage);
  const removePage = useVisualEditorState((s) => s.removePage);
  const setCurrentPage = useVisualEditorState((s) => s.setCurrentPage);
  const selectSegment = useVisualEditorState((s) => s.selectSegment);
  const toggleSegmentVisibility = useVisualEditorState((s) => s.toggleSegmentVisibility);
  const setPlaybackTime = useVisualEditorState((s) => s.setPlaybackTime);
  const setPlaying = useVisualEditorState((s) => s.setPlaying);
  const setDrawing = useVisualEditorState((s) => s.setDrawing);
  const toggleChainMode = useVisualEditorState((s) => s.toggleChainMode);
  const copySelected = useVisualEditorState((s) => s.copySelected);
  const deleteSegments = useVisualEditorState((s) => s.deleteSegments);
  const setZoom = useVisualEditorState((s) => s.setZoom);
  const resetView = useVisualEditorState((s) => s.resetView);
  const moveSegmentUp = useVisualEditorState((s) => s.moveSegmentUp);
  const moveSegmentDown = useVisualEditorState((s) => s.moveSegmentDown);
  const duplicateSegment = useVisualEditorState((s) => s.duplicateSegment);

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

  const handlePlaySegment = React.useCallback(
    (segment: VisualSegment) => {
      setPlaybackTime(segment.startTime);
      setPlaying(true);
    },
    [setPlaybackTime, setPlaying]
  );

  const handleSegmentClick = React.useCallback(
    (e: React.MouseEvent, segment: VisualSegment, pageIndex: number) => {
      if (pageIndex !== currentPageIndex) setCurrentPage(pageIndex);
      if (e.ctrlKey || e.metaKey) selectSegment(segment.id, 'toggle');
      else if (e.shiftKey) selectSegment(segment.id, 'range');
      else selectSegment(segment.id, 'single');
    },
    [currentPageIndex, setCurrentPage, selectSegment]
  );

  const navigationItems = [
    {
      title: 'Dashboard',
      icon: Home,
      id: 'dashboard',
      badge: null,
      shortcut: 'D',
    }
  ];

  const toolItems = [
    {
      title: 'Templates',
      icon: LayoutTemplate,
      id: 'templates',
      description: 'Browse project templates',
    },
    {
      title: 'Timer Calculator',
      icon: Calculator,
      id: 'timer-calculator',
      description: 'Calculate segment timings',
    },
    {
      title: 'Statistics',
      icon: BarChart3,
      id: 'statistics',
      description: 'View project statistics',
    },
  ];

  const advancedTools = [
    {
      title: 'Audio Manager',
      icon: Music,
      id: 'audio-manager',
      description: 'Manage audio files',
    },
    {
      title: 'Remote Control',
      icon: Radio,
      id: 'remote-control',
      description: 'Remote playback control',
    },
    {
      title: 'Voice Input',
      icon: Mic,
      id: 'voice-input',
      description: 'Voice-to-text input',
    },
  ];

  return (
    <Sidebar
      collapsible="icon"
      className={cn(
        'border-r border-border bg-sidebar/50 backdrop-blur-xl transition-all duration-300 ease-in-out',
        className
      )}
    >
      <SidebarHeader className="p-4 space-y-4 group-data-[collapsible=icon]:p-2">
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

          {/* Expanded View Content */}
          <div className="contents group-data-[collapsible=icon]:hidden">
            <SidebarGroup className="p-0">
              <SidebarGroupLabel className="px-2 mb-2 text-primary/70 font-bold tracking-wider text-[10px] uppercase">Visual Tools</SidebarGroupLabel>
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

            <SidebarGroup className="p-0">
              <SidebarGroupLabel className="px-2 mb-2 text-muted-foreground/70 font-bold tracking-wider text-[10px] uppercase">Media Assets</SidebarGroupLabel>
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

            <SidebarGroup className="p-0">
              <SidebarGroupLabel className="px-2 mb-2 text-muted-foreground/70 font-bold tracking-wider text-[10px] uppercase">Timeline Regions</SidebarGroupLabel>
              <div className="px-2">
                <RegionSection
                  pages={visualPages}
                  currentPageIndex={currentPageIndex}
                  selectedSegmentIds={selectedSegmentIds}
                  playbackTime={playbackTime}
                  onSegmentClick={handleSegmentClick}
                  onPlaySegment={handlePlaySegment}
                  onToggleVisibility={toggleSegmentVisibility}
                  onMoveUp={moveSegmentUp}
                  onMoveDown={moveSegmentDown}
                  onDuplicate={(id) => { saveState(); duplicateSegment(id); }}
                  onDelete={(id) => { saveState(); deleteSegments([id]); }}
                />
              </div>
            </SidebarGroup>
          </div>
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
          <Button
            variant="default"
            size="sm"
            className="w-full h-8 text-[11px] font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
            onClick={onTogglePlayback}
          >
            {isPlaying ? <Pause size={12} className="mr-1.5 fill-current" /> : <Play size={12} className="mr-1.5 fill-current" />}
            {isPlaying ? 'PAUSE BROADCAST' : 'GO LIVE NOW'}
          </Button>
        </div>

        <Separator className="bg-white/5 mb-2" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full h-14 p-2 hover:bg-white/5 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:p-0 transition-all duration-300 overflow-hidden">
              <div className="flex items-center gap-3 w-full">
                <Avatar className="h-9 w-9 border-2 border-primary/20 ring-2 ring-primary/10">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">{user?.name?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0 group-data-[collapsible=icon]:hidden">
                  <p className="text-sm font-bold text-foreground/90 truncate">{user?.name || "Guest User"}</p>
                  <p className="text-[10px] text-muted-foreground font-medium opacity-70 uppercase tracking-tighter">{user?.role || "Viewer"}</p>
                </div>
                <ChevronUp size={14} className="opacity-40 group-data-[collapsible=icon]:hidden" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-64 mb-4 bg-sidebar/95 backdrop-blur-2xl border-white/10 shadow-2xl">
            <DropdownMenuLabel className="p-4 bg-primary/5">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-primary/20">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback>{user?.name?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-bold">{user?.name || "Guest User"}</p>
                  <p className="text-xs text-muted-foreground">{user?.email || (user?.role || "Viewer")}</p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuGroup className="p-1">
              <DropdownMenuItem className="focus:bg-white/5 cursor-pointer" onClick={() => onNavigate?.('profile')}>
                <User size={16} className="mr-3 opacity-70" />
                <span>Director Profile</span>
                <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem className="focus:bg-white/5 cursor-pointer">
                <Bell size={16} className="mr-3 opacity-70" />
                <span>Signal Alerts</span>
                <Badge className="ml-auto h-5 bg-accent text-accent-foreground border-none text-[10px]">3</Badge>
              </DropdownMenuItem>
              <DropdownMenuItem className="focus:bg-white/5 cursor-pointer">
                <CreditCard size={16} className="mr-3 opacity-70" />
                <span>Pro Subscription</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="focus:bg-white/5 cursor-pointer">
                <Settings size={16} className="mr-3 opacity-70" />
                <span>Terminal Settings</span>
                <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-white/5" />
            <div className="p-1">
              <DropdownMenuItem className="text-destructive focus:bg-destructive/10 cursor-pointer">
                <LogOut size={16} className="mr-3" />
                <span>Terminate Session</span>
                <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
});

AppSidebar.displayName = 'AppSidebar';
