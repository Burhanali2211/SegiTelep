import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { FileText, Image } from 'lucide-react';
import { AppLogo } from '@/components/Layout/AppLogo';
import { cn } from '@/lib/utils';

interface HomePageProps {
  onOpenTextEditor: () => void;
  onOpenVisualEditor: () => void;
  className?: string;
}

export const HomePage = memo<HomePageProps>(({ onOpenTextEditor, onOpenVisualEditor, className }) => {
  return (
    <div
      className={cn(
        'min-h-screen flex flex-col items-center justify-center bg-background p-8',
        className
      )}
    >
      <div className="w-full max-w-xl text-center">
        {/* Welcome header */}
        <div className="mb-12">
          <div className="flex justify-center mb-4">
            <AppLogo size="xl" showText={false} />
          </div>
          <h1 className="text-4xl font-bold mb-3">Hello!</h1>
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            Welcome to SegiTelep
          </h2>
          <p className="text-muted-foreground text-lg">
            Choose how you want to create your teleprompter script
          </p>
        </div>

        {/* Editor options */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <Button
                size="lg"
                variant="outline"
                className="flex-1 min-w-[200px] h-24 flex flex-col gap-2"
                onClick={onOpenTextEditor}
              >
                <FileText className="w-8 h-8" />
                <span>Text Editor</span>
                <span className="text-xs font-normal text-muted-foreground">
                  Write and edit scrolling text scripts
                </span>
              </Button>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-48">
              <ContextMenuItem onClick={onOpenTextEditor}>
                <FileText className="mr-2 h-4 w-4" />
                Open Text Editor
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <Button
                size="lg"
                variant="outline"
                className="flex-1 min-w-[200px] h-24 flex flex-col gap-2"
                onClick={onOpenVisualEditor}
              >
                <Image className="w-8 h-8" />
                <span>Visual Editor</span>
                <span className="text-xs font-normal text-muted-foreground">
                  Create timed segments on images
                </span>
              </Button>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-48">
              <ContextMenuItem onClick={onOpenVisualEditor}>
                <Image className="mr-2 h-4 w-4" />
                Open Visual Editor
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          You can switch between editors anytime from the menu
        </p>
      </div>
    </div>
  );
});

HomePage.displayName = 'HomePage';
