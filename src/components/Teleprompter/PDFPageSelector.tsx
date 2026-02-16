import React, { memo, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { PDFProcessor, PDFInfo, PDFPageInfo, validatePDFFile } from '@/utils/pdfUtils';
import {
  getPDFProcessor,
  isTauriEnvironment,
  openPDFFileDialog,
  processPDFInTauri,
} from '@/utils/tauriPDFUtils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  FileText,
  Search,
  CheckSquare,
  Square,
  RotateCcw,
  Download,
  X,
  Check,
  FileUp,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Grid } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';

interface PDFPageSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPagesSelected: (pages: { pageNumber: number; imageData: string }[]) => void;
  pdfSource?: File | string | null;
}

interface GridItemData {
  pages: PDFPageInfo[];
  selectedPages: Set<number>;
  thumbnails: { [key: number]: string };
  togglePageSelection: (pageNumber: number, isShiftKey?: boolean) => void;
  columnCount: number;
}

// In react-window v2, the cell component receives props differently
interface GridCellProps extends GridItemData {
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
}

const GridCell = (props: GridCellProps) => {
  const { columnIndex, rowIndex, style, pages, selectedPages, thumbnails, togglePageSelection, columnCount } = props;
  const index = rowIndex * columnCount + columnIndex;

  if (!pages || index >= pages.length) return null;

  const page = pages[index];
  const isSelected = selectedPages.has(page.pageNumber);
  const thumbnail = thumbnails[page.pageNumber];

  return (
    <div style={style} className="p-2">
      <div
        className={cn(
          'group relative h-full flex flex-col rounded-lg border transition-colors duration-200 cursor-pointer overflow-hidden',
          isSelected
            ? 'border-primary bg-primary/5 shadow-sm'
            : 'border-border hover:border-primary/50 bg-card'
        )}
        onClick={(e) => togglePageSelection(page.pageNumber, e.shiftKey)}
      >
        {/* Selection Indicator */}
        <div className={cn(
          "absolute top-2 right-2 z-20 flex items-center justify-center w-5 h-5 rounded-full border transition-all duration-200",
          isSelected
            ? "bg-primary border-primary scale-110"
            : "bg-black/20 border-white/20 group-hover:border-white/40 scale-100"
        )}>
          {isSelected && <Check size={12} className="text-white stroke-[3px]" />}
        </div>

        {/* Thumbnail Preview Area */}
        <div className="flex-1 relative overflow-hidden bg-muted/30 flex items-center justify-center">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={`Page ${page.pageNumber}`}
              className="w-full h-full object-contain p-2"
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <FileText className="text-muted-foreground/20" size={24} />
              <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Loading</span>
            </div>
          )}
        </div>

        {/* Info Ribbon */}
        <div className={cn(
          "px-3 py-2 flex items-center justify-between border-t transition-colors",
          isSelected ? "border-primary/20 bg-primary/5" : "border-border bg-card/50"
        )}>
          <span className={cn(
            "text-[10px] font-bold uppercase tracking-wider",
            isSelected ? "text-primary" : "text-muted-foreground"
          )}>
            Page {page.pageNumber}
          </span>
          <span className="text-[9px] font-medium text-muted-foreground/40 tracking-tighter">
            {page.width}pt
          </span>
        </div>
      </div>
    </div>
  );
};

GridCell.displayName = 'GridCell';

export const PDFPageSelector = memo<PDFPageSelectorProps>(({
  open,
  onOpenChange,
  onPagesSelected,
  pdfSource
}) => {
  const [pdfInfo, setPdfInfo] = useState<PDFInfo | null>(null);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [thumbnails, setThumbnails] = useState<{ [key: number]: string }>({});
  const [processor, setProcessor] = useState<PDFProcessor | null>(null);

  const loadThumbnailsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const thumbnailsRef = useRef<{ [key: number]: string }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastSelectedRef = useRef<number | null>(null);

  const filteredPages = useMemo(() =>
    pdfInfo?.pages.filter(page =>
      searchTerm === '' || page.pageNumber.toString().includes(searchTerm)
    ) || [],
    [pdfInfo?.pages, searchTerm]
  );

  const resetState = useCallback(() => {
    setPdfInfo(null);
    setSelectedPages(new Set());
    setThumbnails({});
    thumbnailsRef.current = {};
    setSearchTerm('');
    if (processor) {
      processor.cleanup();
      setProcessor(null);
    }
    if (loadThumbnailsTimeoutRef.current) {
      clearTimeout(loadThumbnailsTimeoutRef.current);
    }
  }, [processor]);

  useEffect(() => {
    return () => {
      if (processor) processor.cleanup();
      if (loadThumbnailsTimeoutRef.current) clearTimeout(loadThumbnailsTimeoutRef.current);
    };
  }, [processor]);

  const loadMoreThumbnails = useCallback(async (pageNumbers: number[]) => {
    if (!processor) return;

    const unloadedPages = pageNumbers.filter(pageNum => !thumbnailsRef.current[pageNum]);
    if (unloadedPages.length === 0) return;

    try {
      const newThumbnails = await processor.generateThumbnails(unloadedPages, 200);
      const updated = { ...thumbnailsRef.current, ...newThumbnails };
      thumbnailsRef.current = updated;
      setThumbnails(updated);
    } catch (error) {
      console.error('Error loading thumbnails:', error);
    }
  }, [processor]);

  const debouncedLoadThumbnails = useCallback((pageNumbers: number[]) => {
    if (loadThumbnailsTimeoutRef.current) clearTimeout(loadThumbnailsTimeoutRef.current);
    loadThumbnailsTimeoutRef.current = setTimeout(() => {
      loadMoreThumbnails(pageNumbers);
    }, 200);
  }, [loadMoreThumbnails]);

  const handleFileSelect = useCallback(async (fileOrPath?: File | string) => {
    if (!fileOrPath) return;
    setIsLoading(true);

    try {
      const newProcessor = getPDFProcessor();
      let info: PDFInfo;

      if (typeof fileOrPath === 'string') {
        // Tauri file path
        if (!(newProcessor instanceof PDFProcessor)) {
          throw new Error('PDF processing is not supported in this environment');
        }

        const result = await processPDFInTauri(fileOrPath);
        if (result.error || !result.pdfInfo) throw new Error(result.error || 'Failed to load PDF');
        info = result.pdfInfo;
      } else {
        // Browser File
        const validation = validatePDFFile(fileOrPath);
        if (!validation.valid) throw new Error(validation.error);
        info = await newProcessor.loadPDF(fileOrPath);
      }

      setPdfInfo(info);
      setProcessor(newProcessor);

      // Initial thumbnails for the first few pages
      const initialPages = Array.from({ length: Math.min(12, info.totalPages) }, (_, i) => i + 1);
      const thumbs = await newProcessor.generateThumbnails(initialPages, 200);
      thumbnailsRef.current = thumbs;
      setThumbnails(thumbs);

      toast.success(`Success: ${info.totalPages} pages identified`);
    } catch (error) {
      console.error('PDF Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load PDF');
      resetState();
    } finally {
      setIsLoading(false);
    }
  }, [resetState]);

  useEffect(() => {
    if (open && pdfSource) {
      handleFileSelect(pdfSource);
    }
  }, [open, pdfSource, handleFileSelect]);

  const togglePageSelection = useCallback((pageNumber: number, isShiftKey: boolean = false) => {
    setSelectedPages(prev => {
      const newSet = new Set(prev);

      if (isShiftKey && lastSelectedRef.current !== null && pdfInfo) {
        // Range selection
        const start = Math.min(lastSelectedRef.current, pageNumber);
        const end = Math.max(lastSelectedRef.current, pageNumber);

        // Find all pages between start and end in the CURRENT filtered list or just raw indices
        // Better to use absolute page numbers for range
        for (let i = start; i <= end; i++) {
          newSet.add(i);
        }
      } else {
        if (newSet.has(pageNumber)) {
          newSet.delete(pageNumber);
        } else {
          newSet.add(pageNumber);
        }
      }

      lastSelectedRef.current = pageNumber;
      return newSet;
    });
  }, [pdfInfo]);

  const selectAllPages = useCallback(() => {
    if (pdfInfo) setSelectedPages(new Set(pdfInfo.pages.map(p => p.pageNumber)));
  }, [pdfInfo]);

  const deselectAllPages = useCallback(() => {
    setSelectedPages(new Set());
  }, []);

  const handleImport = useCallback(async () => {
    if (!processor || selectedPages.size === 0) {
      toast.error('Select at least one page');
      return;
    }

    setIsImporting(true);

    try {
      const selectedPageNumbers = Array.from(selectedPages).sort((a, b) => a - b);
      const pages = await processor.getSelectedPages(selectedPageNumbers, 2.0);

      onPagesSelected(pages);
      toast.success(`Imported ${pages.length} assets`);
      onOpenChange(false);
    } catch (error) {
      toast.error('Import failed');
    } finally {
      setIsImporting(false);
    }
  }, [processor, selectedPages, onPagesSelected, onOpenChange]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
      handleFileSelect(file);
    } else {
      toast.error('Please drop a valid PDF file');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) resetState(); onOpenChange(val); }}>
      <DialogContent className="max-w-[1100px] w-[95vw] h-[85vh] p-0 overflow-hidden border-border bg-background shadow-xl flex flex-col gap-0 rounded-xl">

        {/* Clean Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <FileText size={22} />
            </div>
            <div className="space-y-0.5">
              <DialogTitle className="text-lg font-bold tracking-tight">PDF Import</DialogTitle>
              <DialogDescription className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                {pdfInfo ? (
                  <>
                    <span>{pdfInfo.fileName}</span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span>{pdfInfo.totalPages} Pages</span>
                  </>
                ) : (
                  'Select pages to import'
                )}
              </DialogDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-md w-8 h-8">
            <X size={16} />
          </Button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">
          {!pdfInfo ? (
            /* Simple Dropzone */
            <div
              className="absolute inset-0 p-8 flex flex-col items-center justify-center"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div
                onClick={() => isTauriEnvironment() ? openPDFFileDialog().then(path => path && handleFileSelect(path)) : fileInputRef.current?.click()}
                className="group relative w-full max-w-xl aspect-video rounded-2xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/[0.02] transition-colors cursor-pointer flex flex-col items-center justify-center gap-6"
              >
                <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                  <FileUp size={32} />
                </div>

                <div className="text-center space-y-1">
                  <h3 className="text-xl font-bold">Select PDF Document</h3>
                  <p className="text-sm text-muted-foreground">Click to browse or drag your file here</p>
                </div>

                {isLoading && (
                  <div className="absolute inset-0 bg-background/90 flex flex-col items-center justify-center gap-4 z-30">
                    <Loader2 size={32} className="text-primary animate-spin" />
                    <span className="text-xs font-bold uppercase tracking-widest text-primary">Loading PDF...</span>
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
            </div>
          ) : (
            /* Efficient Grid View */
            <div className="absolute inset-0 flex flex-col pt-4 overflow-hidden">
              {/* Refined Toolbar */}
              <div className="px-6 pb-4 flex items-center justify-between gap-4 shrink-0 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                    <Input
                      placeholder="Filter pages..."
                      className="pl-9 w-48 h-9 bg-muted/50 border-border focus:ring-1 focus:ring-primary/20 rounded-md text-xs font-medium"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="px-2.5 h-7 flex items-center gap-1.5 rounded-md bg-primary/10 text-[10px] font-bold text-primary uppercase">
                    {selectedPages.size} Selected
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={selectAllPages} className="h-8 px-3 rounded-md text-[10px] font-bold uppercase tracking-wider">
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAllPages} className="h-8 px-3 rounded-md text-[10px] font-bold uppercase tracking-wider">
                    Clear
                  </Button>
                </div>
              </div>

              {/* Grid Container */}
              <div className="flex-1 relative bg-muted/10 overflow-hidden">
                <AutoSizer className="w-full h-full" renderProp={({ height, width }) => {
                  if (!height || !width) return null;

                  const BOX_WIDTH = 200;
                  const COLUMN_COUNT = Math.max(1, Math.floor(width / BOX_WIDTH));
                  const ROW_COUNT = Math.ceil(filteredPages.length / COLUMN_COUNT);
                  const COLUMN_WIDTH = width / COLUMN_COUNT;
                  const ROW_HEIGHT = COLUMN_WIDTH * 1.35;

                  const gridItemData: GridItemData = {
                    pages: filteredPages,
                    selectedPages,
                    thumbnails,
                    togglePageSelection,
                    columnCount: COLUMN_COUNT
                  };

                  return (
                    <Grid
                      className="w-full h-full scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
                      columnCount={COLUMN_COUNT}
                      columnWidth={COLUMN_WIDTH}
                      rowCount={ROW_COUNT}
                      rowHeight={ROW_HEIGHT}
                      cellProps={gridItemData}
                      cellComponent={GridCell}
                      overscanCount={2}
                      onCellsRendered={(visibleCells) => {
                        const startItem = visibleCells.rowStartIndex * COLUMN_COUNT;
                        const endItem = Math.min(filteredPages.length, (visibleCells.rowStopIndex + 1) * COLUMN_COUNT);
                        const needed: number[] = [];
                        for (let i = startItem; i < endItem; i++) {
                          if (filteredPages[i]) needed.push(filteredPages[i].pageNumber);
                        }
                        debouncedLoadThumbnails(needed);
                      }}
                    />
                  );
                }} />
              </div>
            </div>
          )}
        </div>

        {/* Action Bar */}
        {pdfInfo && (
          <div className="px-8 py-5 bg-background border-t border-border flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={resetState}
                className="text-muted-foreground hover:text-foreground text-xs font-bold uppercase tracking-wider gap-2 px-3 h-10"
              >
                <RotateCcw size={14} /> New File
              </Button>
              <div className="h-6 w-[1px] bg-border" />
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {selectedPages.size} / {pdfInfo.totalPages} Slides
              </div>
            </div>

            <Button
              size="lg"
              onClick={handleImport}
              disabled={selectedPages.size === 0 || isImporting}
              className="h-11 px-8 rounded-md bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-widest text-xs min-w-[180px]"
            >
              {isImporting ? (
                <div className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  <span>Importing...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Download size={16} />
                  <span>Add to Project</span>
                </div>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
});

PDFPageSelector.displayName = 'PDFPageSelector';