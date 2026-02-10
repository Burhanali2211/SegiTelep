import React, { memo, useState, useCallback } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Button } from '@/components/ui/button';
import { Trash2, FilePlus, Upload, Check, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PDFPageSelector } from '../../../PDFPageSelector';
import { createDragDropHandlers, formatFileInfo } from '@/utils/dragDropUtils';
import { toast } from 'sonner';
import type { ImagePage } from '../../types/visualEditor.types';

interface PDFSectionProps {
  pages: ImagePage[];
  currentPageIndex: number;
  onAddPages: (pages: { pageNumber: number; imageData: string }[]) => void;
  onSelectPage: (index: number) => void;
  onRemovePage: (index: number) => void;
}

export const PDFSection = memo<PDFSectionProps>(({ 
  pages, 
  currentPageIndex, 
  onAddPages, 
  onSelectPage, 
  onRemovePage 
}) => {
  const [showPDFSelector, setShowPDFSelector] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggedFiles, setDraggedFiles] = useState<File[]>([]);

  // Filter only PDF pages
  const pdfPages = pages.filter(page => page.isPDF);
  const currentPDFPageIndex = pages.findIndex(page => page.id === pages[currentPageIndex]?.id && page.isPDF);

  const handlePDFPagesSelected = useCallback((selectedPages: { pageNumber: number; imageData: string }[]) => {
    onAddPages(selectedPages);
    setShowPDFSelector(false);
    toast.success(`Added ${selectedPages.length} PDF page${selectedPages.length !== 1 ? 's' : ''}`);
  }, [onAddPages]);

  const handleDragDrop = useCallback((files: File[]) => {
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length === 0) {
      toast.error('Please drop PDF files only');
      return;
    }

    if (pdfFiles.length > 1) {
      toast.warning('Only the first PDF file will be processed');
    }

    setShowPDFSelector(true);
  }, []);

  const { handleDragEnter, handleDragLeave, handleDragOver, handleDrop } = createDragDropHandlers(
    handleDragDrop,
    () => setIsDragOver(true),
    () => setIsDragOver(false)
  );

  const handleDragEnterEnhanced = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleDragEnter(e);
  }, [handleDragEnter]);

  const handleDragLeaveEnhanced = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleDragLeave(e);
  }, [handleDragLeave]);

  const handleDragOverEnhanced = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleDragOver(e);
  }, [handleDragOver]);

  const handleAddPDF = useCallback(() => {
    setShowPDFSelector(true);
  }, []);

  return (
    <>
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">PDF Pages</h3>
          {pdfPages.length > 0 && <span className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">{pdfPages.length}</span>}
        </div>

        {pdfPages.length === 0 ? (
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <div
                className={cn(
                  'w-full h-16 rounded-lg border border-dashed transition-all duration-200 group cursor-pointer',
                  isDragOver 
                    ? 'border-primary bg-primary/5 text-primary' 
                    : 'border-muted-foreground/25 text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5'
                )}
                onClick={handleAddPDF}
                onDragEnter={handleDragEnterEnhanced}
                onDragLeave={handleDragLeaveEnhanced}
                onDragOver={handleDragOverEnhanced}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const files = handleDrop(e);
                  if (files && files.length > 0) {
                    handleDragDrop(files);
                  }
                  setIsDragOver(false);
                }}
              >
                <div className="flex items-center gap-2 px-3 h-full">
                  <div className={cn(
                    'w-6 h-6 rounded-md flex items-center justify-center transition-colors',
                    isDragOver ? 'bg-primary/20' : 'bg-muted/50 group-hover:bg-primary/10'
                  )}>
                    {isDragOver ? <FileText size={12} className="animate-pulse" /> : <Upload size={12} className="group-hover:scale-110 transition-transform" />}
                  </div>
                  <div className="text-left">
                    <span className="text-[10px] font-medium block">
                      {isDragOver ? 'Drop PDF here' : 'Add PDF Pages'}
                    </span>
                    <span className="text-[9px] text-muted-foreground">
                      {isDragOver ? 'Release to import' : 'Click or drag & drop'}
                    </span>
                  </div>
                </div>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-48">
              <ContextMenuItem onClick={handleAddPDF}>
                <FilePlus className="mr-2 h-4 w-4" />
                Add PDF pages
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ) : (
          <div className="space-y-1 w-full overflow-hidden">
            {pdfPages.map((page, index) => {
              const actualPageIndex = pages.findIndex(p => p.id === page.id);
              const isSelected = actualPageIndex === currentPageIndex;
              
              return (
                <ContextMenu key={page.id}>
                  <ContextMenuTrigger asChild>
                    <div
                      onClick={() => onSelectPage(actualPageIndex)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && onSelectPage(actualPageIndex)}
                      className={cn(
                        'flex items-center gap-1.5 p-1.5 rounded-md transition-all duration-200 group cursor-pointer',
                        'border border-transparent w-full min-w-0 max-w-full',
                        isSelected ? 'bg-primary/10 border-primary/30' : 'hover:bg-muted/50'
                      )}
                    >
                      {/* Thumbnail */}
                      <div className="relative w-8 h-8 rounded-md overflow-hidden flex-shrink-0">
                        <img src={page.data} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                        <div className="absolute bottom-0.5 left-0.5 text-[7px] font-bold px-0.5 py-0.5 rounded bg-black/70 text-white">
                          {actualPageIndex + 1}
                        </div>
                        {page.segments.length > 0 && (
                          <div className="absolute top-0.5 right-0.5 text-[7px] font-medium px-0.5 py-0.5 rounded bg-black/70 text-white">{page.segments.length}</div>
                        )}
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="text-[9px] font-medium truncate flex-1 min-w-0">PDF {actualPageIndex + 1}</span>
                            {page.segments.length > 0 && (
                              <span className="text-[8px] text-muted-foreground shrink-0 hidden xs:inline">{page.segments.length}r</span>
                            )}
                          </div>
                          <span className="text-[8px] text-muted-foreground truncate">Click to select</span>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        {pdfPages.length > 1 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onRemovePage(actualPageIndex); }}
                            className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Remove page"
                          >
                            <Trash2 size={8} />
                          </button>
                        )}
                      </div>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-48">
                    <ContextMenuItem onClick={() => onSelectPage(actualPageIndex)}>
                      <Check className="mr-2 h-4 w-4" />
                      Select page
                    </ContextMenuItem>
                    {pdfPages.length > 1 && (
                      <>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onRemovePage(actualPageIndex)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove page
                        </ContextMenuItem>
                      </>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
            
            {/* Add More Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddPDF}
              className="w-full h-8 text-[10px] justify-start gap-2"
            >
              <FilePlus size={10} />
              <span>Add PDF Pages</span>
            </Button>
          </div>
        )}
      </section>

      {/* PDF Page Selector Dialog */}
      <PDFPageSelector
        open={showPDFSelector}
        onOpenChange={setShowPDFSelector}
        onPagesSelected={handlePDFPagesSelected}
      />
    </>
  );
});

PDFSection.displayName = 'PDFSection';
