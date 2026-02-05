import React, { memo, useCallback, useRef } from 'react';
import { useVisualEditorState } from './useVisualEditorState';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Trash2,
  ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageNavigatorProps {
  className?: string;
}

export const PageNavigator = memo<PageNavigatorProps>(({ className }) => {
  const pages = useVisualEditorState((s) => s.pages);
  const currentPageIndex = useVisualEditorState((s) => s.currentPageIndex);
  
  const addPage = useVisualEditorState((s) => s.addPage);
  const removePage = useVisualEditorState((s) => s.removePage);
  const setCurrentPage = useVisualEditorState((s) => s.setCurrentPage);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleAddImage = useCallback(() => {
    fileInputRef.current?.click();
  }, []);
  
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const data = event.target?.result as string;
        if (data) {
          addPage(data);
        }
      };
      reader.readAsDataURL(file);
    });
    
    e.target.value = '';
  }, [addPage]);
  
  const handlePrevPage = useCallback(() => {
    if (currentPageIndex > 0) {
      setCurrentPage(currentPageIndex - 1);
    }
  }, [currentPageIndex, setCurrentPage]);
  
  const handleNextPage = useCallback(() => {
    if (currentPageIndex < pages.length - 1) {
      setCurrentPage(currentPageIndex + 1);
    }
  }, [currentPageIndex, pages.length, setCurrentPage]);
  
  const handleRemovePage = useCallback(() => {
    if (pages.length > 0) {
      removePage(currentPageIndex);
    }
  }, [pages.length, currentPageIndex, removePage]);
  
  const currentPage = pages[currentPageIndex];
  const segmentCount = currentPage?.segments.length || 0;
  
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="sm" onClick={handleAddImage}>
            <Plus size={14} className="mr-1" />
            <ImageIcon size={14} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Add image(s)</TooltipContent>
      </Tooltip>
      
      {pages.length > 0 && (
        <>
          <div className="h-4 w-px bg-border" />
          
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handlePrevPage}
                  disabled={currentPageIndex === 0}
                >
                  <ChevronLeft size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Previous page (PgUp)</TooltipContent>
            </Tooltip>
            
            <span className="text-sm font-medium min-w-[60px] text-center">
              {currentPageIndex + 1} / {pages.length}
            </span>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleNextPage}
                  disabled={currentPageIndex === pages.length - 1}
                >
                  <ChevronRight size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Next page (PgDn)</TooltipContent>
            </Tooltip>
          </div>
          
          <span className="text-xs text-muted-foreground">
            ({segmentCount} segment{segmentCount !== 1 ? 's' : ''})
          </span>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={handleRemovePage}
              >
                <Trash2 size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remove current page</TooltipContent>
          </Tooltip>
        </>
      )}
      
      {pages.length === 0 && (
        <span className="text-sm text-muted-foreground">
          No images loaded
        </span>
      )}
    </div>
  );
});

PageNavigator.displayName = 'PageNavigator';
