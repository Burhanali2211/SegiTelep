import React from 'react';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
  SegmentList,
  TeleprompterDisplay,
  TextSegmentEditor,
} from '@/components/Teleprompter';
import { VisualEditor } from '@/components/Teleprompter/VisualEditor';

interface TextEditorLayoutProps {
  showVisualEditor: boolean;
  showMobileSegments: boolean;
  onToggleMobileSegments: () => void;
  onOpenAudioManager: () => void;
}

export const TextEditorLayout: React.FC<TextEditorLayoutProps> = ({
  showVisualEditor,
  showMobileSegments,
  onToggleMobileSegments,
  onOpenAudioManager,
}) => {
  return (
    <>
      {/* Desktop Layout */}
      <main className="flex-1 min-h-0 overflow-hidden">
        {showVisualEditor ? (
          // Visual Editor - Full width, no resizers
          <div className="h-full overflow-hidden">
            <VisualEditor className="h-full" onOpenAudioLibrary={onOpenAudioManager} />
          </div>
        ) : (
          // Text Editor - With resizers for 3-panel layout
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Segment List */}
            <ResizablePanel 
              defaultSize={20} 
              minSize={15} 
              maxSize={40}
              className="hidden sm:block"
            >
              <div className="h-full overflow-hidden">
                <SegmentList />
              </div>
            </ResizablePanel>
            
            <ResizableHandle withHandle className="hidden sm:block" />
            
            {/* Editor */}
            <ResizablePanel defaultSize={35} minSize={25} className="flex-1">
              <div className="h-full overflow-hidden">
                <TextSegmentEditor />
              </div>
            </ResizablePanel>
            
            <ResizableHandle withHandle className="hidden lg:block" />
            
            {/* Teleprompter Display */}
            <ResizablePanel defaultSize={45} minSize={30} className="hidden lg:block">
              <div className="h-full overflow-hidden">
                <TeleprompterDisplay className="h-full" />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
        
        {/* Mobile Layout - Improved for better UX */}
        <div className="sm:hidden fixed inset-0 bg-background z-50 flex flex-col">
          {/* Mobile Header with better navigation */}
          <div className="flex items-center justify-between p-3 border-b border-border bg-card">
            <h2 className="text-sm font-semibold">Mobile Editor</h2>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onToggleMobileSegments}
                className="text-xs"
              >
                {showMobileSegments ? 'Editor' : 'Segments'}
              </Button>
            </div>
          </div>
          
          {/* Mobile Tab Navigation */}
          <div className="flex border-b border-border bg-muted/30">
            <button
              className={`flex-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                showMobileSegments 
                  ? 'border-primary text-primary bg-background' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => !showMobileSegments && onToggleMobileSegments()}
            >
              Segments
            </button>
            <button
              className={`flex-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                !showMobileSegments && !showVisualEditor
                  ? 'border-primary text-primary bg-background' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => showMobileSegments && onToggleMobileSegments()}
            >
              Text Editor
            </button>
            {showVisualEditor && (
              <button
                className={`flex-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                  !showMobileSegments && showVisualEditor
                    ? 'border-primary text-primary bg-background' 
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => showMobileSegments && onToggleMobileSegments()}
              >
                Visual Editor
              </button>
            )}
          </div>
          
          {/* Mobile Content with better transitions */}
          <div className="flex-1 overflow-hidden relative">
            <div className={`absolute inset-0 transition-transform duration-300 ease-in-out ${
              showMobileSegments ? 'translate-x-0' : 'translate-x-full'
            }`}>
              <div className="h-full overflow-y-auto p-3">
                <SegmentList />
              </div>
            </div>
            
            <div className={`absolute inset-0 transition-transform duration-300 ease-in-out ${
              !showMobileSegments && !showVisualEditor ? 'translate-x-0' : '-translate-x-full'
            }`}>
              <div className="h-full overflow-hidden">
                <TextSegmentEditor />
              </div>
            </div>
            
            {showVisualEditor && (
              <div className={`absolute inset-0 transition-transform duration-300 ease-in-out ${
                !showMobileSegments && showVisualEditor ? 'translate-x-0' : 'translate-x-full'
              }`}>
                <div className="h-full overflow-hidden">
                  <VisualEditor className="h-full" onOpenAudioLibrary={onOpenAudioManager} />
                </div>
              </div>
            )}
          </div>
          
          {/* Mobile Action Bar */}
          <div className="flex items-center justify-between p-3 border-t border-border bg-card">
            <div className="text-xs text-muted-foreground">
              {showMobileSegments ? 'Segments' : showVisualEditor ? 'Visual Editor' : 'Text Editor'}
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={onToggleMobileSegments}
              className="text-xs"
            >
              Switch View
            </Button>
          </div>
        </div>
      </main>
    </>
  );
};
