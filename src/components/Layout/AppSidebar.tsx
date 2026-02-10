import React, { memo, useState } from 'react';
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
} from '@/components/ui/sidebar';
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
  Upload,
  Mic,
  HelpCircle,
  Info,
  Search,
  Clock,
  Star,
  Folder,
  Play,
  Pause,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface AppSidebarProps {
  projectName?: string;
  editorType: 'text' | 'visual';
  isPlaying?: boolean;
  recentProjects?: Array<{ id: string; name: string }>;
  onNavigate?: (section: string) => void;
  onProjectSelect?: (projectId: string) => void;
  onTogglePlayback?: () => void;
  className?: string;
}

export const AppSidebar = memo<AppSidebarProps>(({
  projectName = 'Untitled Project',
  editorType,
  isPlaying = false,
  recentProjects = [],
  onNavigate,
  onProjectSelect,
  onTogglePlayback,
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState(['navigation', 'tools']);

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const filteredRecentProjects = recentProjects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const navigationItems = [
    {
      title: 'Dashboard',
      icon: Home,
      id: 'dashboard',
      badge: null,
    },
    {
      title: 'Text Editor',
      icon: FileText,
      id: 'text-editor',
      badge: editorType === 'text' ? 'Active' : null,
    },
    {
      title: 'Visual Editor',
      icon: Image,
      id: 'visual-editor',
      badge: editorType === 'visual' ? 'Active' : null,
    },
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

  const helpItems = [
    {
      title: 'Welcome Guide',
      icon: HelpCircle,
      id: 'welcome-guide',
      description: 'Get started with SegiTelep',
    },
    {
      title: 'Keyboard Shortcuts',
      icon: HelpCircle,
      id: 'shortcuts',
      description: 'View all shortcuts',
    },
    {
      title: 'About',
      icon: Info,
      id: 'about',
      description: 'About SegiTelep',
    },
  ];

  return (
    <SidebarProvider>
      <Sidebar className={cn('border-r border-border', className)}>
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Play size={16} className="text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold truncate">SegiTelep</h2>
              <p className="text-xs text-muted-foreground truncate">{projectName}</p>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="flex gap-1 mt-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isPlaying ? "secondary" : "default"}
                  size="sm"
                  className="h-7 px-2 flex-1"
                  onClick={onTogglePlayback}
                >
                  {isPlaying ? (
                    <>
                      <Pause size={12} className="mr-1" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play size={12} className="mr-1" />
                      Play
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isPlaying ? 'Pause playback' : 'Start playback'}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-2">
          {/* Search */}
          <div className="px-2 py-2">
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>

          {/* Main Navigation */}
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigationItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton onClick={() => onNavigate?.(item.id)}>
                      <item.icon size={16} />
                      <span className="flex-1">{item.title}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Tools */}
          <SidebarGroup>
            <SidebarGroupLabel>Tools</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {toolItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton onClick={() => onNavigate?.(item.id)}>
                      <item.icon size={16} />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Advanced Tools */}
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => toggleSection('advanced')}>
                  <Settings size={16} />
                  <span>Advanced Tools</span>
                </SidebarMenuButton>
                {expandedSections.includes('advanced') && (
                  <SidebarMenuSub>
                    {advancedTools.map((item) => (
                      <SidebarMenuSubItem key={item.id}>
                        <SidebarMenuSubButton onClick={() => onNavigate?.(item.id)}>
                          <item.icon size={14} />
                          <span>{item.title}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>

          {/* Recent Projects */}
          {filteredRecentProjects.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel className="flex items-center gap-2">
                <Clock size={14} />
                Recent Projects
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {filteredRecentProjects.slice(0, 5).map((project) => (
                    <SidebarMenuItem key={project.id}>
                      <SidebarMenuButton onClick={() => onProjectSelect?.(project.id)}>
                        <Folder size={14} />
                        <span className="flex-1 truncate">{project.name}</span>
                        <Star size={12} className="text-muted-foreground" />
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          <Separator className="mx-2 my-2" />

          {/* Help */}
          <SidebarGroup>
            <SidebarGroupLabel>Help</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {helpItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton onClick={() => onNavigate?.(item.id)}>
                      <item.icon size={16} />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-2">
          <div className="text-xs text-muted-foreground text-center p-2">
            SegiTelep v1.0.0
          </div>
        </SidebarFooter>
      </Sidebar>
    </SidebarProvider>
  );
});

AppSidebar.displayName = 'AppSidebar';
