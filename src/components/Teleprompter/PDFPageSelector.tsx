import React, { memo, useState, useCallback, useEffect, useRef } from 'react';
import { PDFProcessor, PDFInfo, PDFPageInfo, validatePDFFile, formatFileSize, formatDate } from '@/utils/pdfUtils';
import {
  getPDFProcessor,
  isTauriEnvironment,
  openPDFFileDialog,
  processPDFInTauri
} from '@/utils/tauriPDFUtils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  FileText,
  Upload,
  Grid3X3,
  List,
  Search,
  CheckSquare,
  Square,
  RotateCcw,
  Download,
  FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { List as VirtualList, Grid as VirtualGrid } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';

interface PDFPageSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPagesSelected: (pages: { pageNumber: number; imageData: string }[]) => void;
}

type ViewMode = 'grid' | 'list';

interface GridItemData {
  pages: PDFPageInfo[];
  selectedPages: Set<number>;
  thumbnails: { [key: number]: string };
  togglePageSelection: (pageNumber: number) => void;
  columnCount: number;
}

interface ListItemData {
  pages: PDFPageInfo[];
  selectedPages: Set<number>;
  thumbnails: { [key: number]: string };
  togglePageSelection: (pageNumber: number) => void;
}

export const PDFPageSelector = memo<PDFPageSelectorProps>(({
  open,
  onOpenChange,
  onPagesSelected
}) => {
  const [pdfInfo, setPdfInfo] = useState<PDFInfo | null>(null);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [thumbnails, setThumbnails] = useState<{ [key: number]: string }>({});
  const [processor, setProcessor] = useState<PDFProcessor | null>(null);

  const loadThumbnailsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredPages = React.useMemo(() =>
    pdfInfo?.pages.filter(page =>
      searchTerm === '' || page.pageNumber.toString().includes(searchTerm)
    ) || [],
    [pdfInfo?.pages, searchTerm]
  );

  const resetState = useCallback(() => {
    setPdfInfo(null);
    setSelectedPages(new Set());
    setThumbnails({});
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
      if (processor) {
        processor.cleanup();
      }
      if (loadThumbnailsTimeoutRef.current) {
        clearTimeout(loadThumbnailsTimeoutRef.current);
      }
    };
  }, [processor]);

  const handleFileSelect = useCallback(async (file?: File) => {
    setIsLoading(true);

    try {
      if (isTauriEnvironment()) {
        const result = await processPDFInTauri();

        if (result.error) {
          toast.error(result.error);
          resetState();
          return;
        }

        if (result.pdfInfo) {
          setPdfInfo(result.pdfInfo);
          const newProcessor = getPDFProcessor();
          setProcessor(newProcessor);

          const initialPages = Array.from({ length: Math.min(12, result.pdfInfo.totalPages) }, (_, i) => i + 1);
          const thumbs = await newProcessor.generateThumbnails(initialPages, 150);
          setThumbnails(thumbs);

          toast.success(`Loaded PDF with ${result.pdfInfo.totalPages} pages`);
        }
      } else {
        if (!file) {
          resetState();
          return;
        }

        const validation = validatePDFFile(file);
        if (!validation.valid) {
          toast.error(validation.error);
          resetState();
          return;
        }

        const newProcessor = getPDFProcessor();
        const info = await newProcessor.loadPDF(file);

        setPdfInfo(info);
        setProcessor(newProcessor);

        const initialPages = Array.from({ length: Math.min(12, info.totalPages) }, (_, i) => i + 1);
        const thumbs = await newProcessor.generateThumbnails(initialPages, 150);
        setThumbnails(thumbs);

        toast.success(`Loaded PDF with ${info.totalPages} pages`);
      }
    } catch (error) {
      console.error('Error loading PDF:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load PDF');
      resetState();
    } finally {
      setIsLoading(false);
    }
  }, [resetState]);

  const handleTauriFileDialog = useCallback(async () => {
    try {
      const filePath = await openPDFFileDialog();
      if (filePath) {
        const result = await processPDFInTauri(filePath);

        if (result.error) {
          toast.error(result.error);
          resetState();
          return;
        }

        if (result.pdfInfo) {
          setPdfInfo(result.pdfInfo);
          const newProcessor = getPDFProcessor();
          setProcessor(newProcessor);

          const initialPages = Array.from({ length: Math.min(12, result.pdfInfo.totalPages) }, (_, i) => i + 1);
          const thumbs = await newProcessor.generateThumbnails(initialPages, 150);
          setThumbnails(thumbs);

          toast.success(`Loaded PDF with ${result.pdfInfo.totalPages} pages`);
        }
      }
    } catch (error) {
      console.error('Error in Tauri file dialog:', error);
      toast.error('Failed to open file dialog');
    }
  }, [resetState]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    e.target.value = '';
  }, [handleFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];

      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        toast.error('Please drop a PDF file');
        return;
      }

      const maxSize = 100 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error('PDF file must be less than 100MB');
        return;
      }

      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const togglePageSelection = useCallback((pageNumber: number) => {
    setSelectedPages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pageNumber)) {
        newSet.delete(pageNumber);
      } else {
        newSet.add(pageNumber);
      }
      return newSet;
    });
  }, []);

  const selectAllPages = useCallback(() => {
    if (pdfInfo) {
      setSelectedPages(new Set(pdfInfo.pages.map(p => p.pageNumber)));
    }
  }, [pdfInfo]);

  const deselectAllPages = useCallback(() => {
    setSelectedPages(new Set());
  }, []);

  const loadMoreThumbnails = useCallback(async (pageNumbers: number[]) => {
    if (!processor) return;

    const unloadedPages = pageNumbers.filter(pageNum => !thumbnails[pageNum]);
    if (unloadedPages.length === 0) return;

    try {
      const newThumbnails = await processor.generateThumbnails(unloadedPages, 150);
      setThumbnails(prev => ({ ...prev, ...newThumbnails }));
    } catch (error) {
      console.error('Error loading thumbnails:', error);
    }
  }, [processor, thumbnails]);

  const debouncedLoadThumbnails = useCallback((pageNumbers: number[]) => {
    if (loadThumbnailsTimeoutRef.current) {
      clearTimeout(loadThumbnailsTimeoutRef.current);
    }
    loadThumbnailsTimeoutRef.current = setTimeout(() => {
      loadMoreThumbnails(pageNumbers);
    }, 150);
  }, [loadMoreThumbnails]);

  const handleImport = useCallback(async () => {
    if (!processor || selectedPages.size === 0) {
      toast.error('Please select at least one page');
      return;
    }

    setIsLoading(true);

    try {
      const selectedPageNumbers = Array.from(selectedPages).sort((a, b) => a - b);
      const pages = await processor.getSelectedPages(selectedPageNumbers, 2.0);

      onPagesSelected(pages);
      toast.success(`Imported ${pages.length} pages`);
      onOpenChange(false);
    } catch (error) {
      console.error('Error importing pages:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import pages');
    } finally {
      setIsLoading(false);
    }
  }, [processor, selectedPages, onPagesSelected, onOpenChange]);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      resetState();
    }
    onOpenChange(open);
  }, [resetState, onOpenChange]);

  const GridCell = memo(({ columnIndex, rowIndex, style, data }: any) => {
    const { pages, selectedPages, thumbnails, togglePageSelection, columnCount } = data as GridItemData;
    const index = rowIndex * columnCount + columnIndex;

    if (index >= pages.length) return null;

    const page = pages[index];
    const isSelected = selectedPages.has(page.pageNumber);

    return (
      <div style={style} className="p-2">
        <div
          className={cn(
            'h-full border rounded-lg overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-primary flex flex-col bg-background relative group',
            isSelected && 'ring-2 ring-primary bg-primary/5'
          )}
          onClick={() => togglePageSelection(page.pageNumber)}
        >
          <div className={cn(
            "absolute top-2 right-2 z-10 transition-opacity duration-200",
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}>
            <div className={cn(
              'w-6 h-6 rounded border-2 flex items-center justify-center shadow-sm',
              isSelected
                ? 'bg-primary border-primary text-primary-foreground'
                : 'bg-background border-muted-foreground'
            )}>
              {isSelected && <div className="w-3 h-3 bg-current rounded-sm" />}
            </div>
          </div>

          <div className="flex-1 relative bg-muted/20 flex items-center justify-center overflow-hidden">
            {thumbnails[page.pageNumber] ? (
              <img
                src={thumbnails[page.pageNumber]}
                alt={`Page ${page.pageNumber}`}
                className="w-full h-full object-contain"
                loading="lazy"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground/50">
                <FileText size={40} />
                <span className="text-xs">Loading...</span>
              </div>
            )}
          </div>

          <div className="p-3 border-t bg-card">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">Page {page.pageNumber}</span>
              <span className="text-xs text-muted-foreground">{page.width}x{page.height}</span>
            </div>
          </div>
        </div>
      </div>
    );
  });

  GridCell.displayName = 'GridCell';

  const ListRow = memo(({ index, style, data }: any) => {
    const { pages, selectedPages, thumbnails, togglePageSelection } = data as ListItemData;
    const page = pages[index];
    const isSelected = selectedPages.has(page.pageNumber);

    return (
      <div style={style} className="p-2">
        <div
          className={cn(
            'flex items-center gap-4 p-2 border rounded-lg cursor-pointer transition-all hover:bg-muted/50 h-full bg-background',
            isSelected && 'bg-primary/5 border-primary'
          )}
          onClick={() => togglePageSelection(page.pageNumber)}
        >
          <div className="flex items-center justify-center w-10">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => togglePageSelection(page.pageNumber)}
              className="data-[state=checked]:bg-primary"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="w-12 h-16 bg-muted rounded flex-shrink-0 relative overflow-hidden border">
            {thumbnails[page.pageNumber] ? (
              <img
                src={thumbnails[page.pageNumber]}
                alt={`Page ${page.pageNumber}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted/30">
                <FileText size={16} className="text-muted-foreground/50" />
              </div>
            )}
          </div>

          <div className="flex-1">
            <p className="font-medium text-sm">Page {page.pageNumber}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">Original Size: {page.width} × {page.height} px</span>
            </div>
          </div>
        </div>
      </div>
    );
  });

  ListRow.displayName = 'ListRow';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText size={20} />
            PDF Page Selector
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {!pdfInfo ? (
            <div className="space-y-4">
              {isTauriEnvironment() ? (
                <div
                  className="border-2 border-dashed border-muted rounded-lg p-12 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary/50 transition-colors flex-1"
                  onClick={handleTauriFileDialog}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <FolderOpen size={48} className="text-muted-foreground" />
                  <div className="text-center">
                    <p className="font-medium text-lg">Click to browse or drop PDF files</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Max 100MB, supports multi-page PDFs
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className="border-2 border-dashed border-muted rounded-lg p-12 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary/50 transition-colors flex-1"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <Upload size={48} className="text-muted-foreground" />
                    <div className="text-center">
                      <p className="font-medium text-lg">Drop PDF here or click to upload</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Max 100MB, supports multi-page PDFs
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                    variant="outline"
                  >
                    <Upload size={16} className="mr-2" />
                    Choose PDF File
                  </Button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handleFileInputChange}
                  />
                </>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="bg-muted/30 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <FileText size={24} className="text-primary" />
                    <div>
                      <p className="font-medium">{pdfInfo.fileName}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(pdfInfo.fileSize)} • {pdfInfo.totalPages} pages
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetState}
                    disabled={isLoading}
                  >
                    <RotateCcw size={16} className="mr-2" />
                    Choose Different
                  </Button>
                </div>

                {pdfInfo.metadata && (
                  <div className="mt-3 text-sm text-muted-foreground">
                    {pdfInfo.metadata.title && (
                      <p>Title: {pdfInfo.metadata.title}</p>
                    )}
                    {pdfInfo.metadata.author && (
                      <p>Author: {pdfInfo.metadata.author}</p>
                    )}
                    {pdfInfo.metadata.creationDate && (
                      <p>Created: {formatDate(pdfInfo.metadata.creationDate)}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex items-center border rounded-md">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="rounded-r-none"
                    >
                      <Grid3X3 size={16} />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="rounded-l-none"
                    >
                      <List size={16} />
                    </Button>
                  </div>

                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search pages..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-48"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllPages}
                    disabled={isLoading}
                  >
                    <CheckSquare size={16} className="mr-2" />
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={deselectAllPages}
                    disabled={isLoading}
                  >
                    <Square size={16} className="mr-2" />
                    Deselect All
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    {selectedPages.size} of {filteredPages.length} selected
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-0 bg-muted/10">
                {viewMode === 'grid' ? (
                  <AutoSizer>
                    {({ height, width }) => {
                      const BOX_WIDTH = 200;
                      const COLUMN_COUNT = Math.max(2, Math.floor(width / BOX_WIDTH));
                      const ROW_COUNT = Math.ceil(filteredPages.length / COLUMN_COUNT);
                      const ROW_HEIGHT = 280;

                      const gridItemData: GridItemData = {
                        pages: filteredPages,
                        selectedPages,
                        thumbnails,
                        togglePageSelection,
                        columnCount: COLUMN_COUNT
                      };

                      return (
                        <VirtualGrid
                          columnCount={COLUMN_COUNT}
                          columnWidth={width / COLUMN_COUNT}
                          height={height}
                          rowCount={ROW_COUNT}
                          rowHeight={ROW_HEIGHT}
                          width={width}
                          cellProps={{ data: gridItemData }}
                          onCellsRendered={({ rowStartIndex, rowStopIndex }) => {
                            const startItem = rowStartIndex * COLUMN_COUNT;
                            const endItem = Math.min(filteredPages.length, (rowStopIndex + 1) * COLUMN_COUNT);

                            const neededPages: number[] = [];
                            for (let i = startItem; i < endItem; i++) {
                              if (filteredPages[i]) {
                                neededPages.push(filteredPages[i].pageNumber);
                              }
                            }
                            debouncedLoadThumbnails(neededPages);
                          }}
                        >
                          {GridCell}
                        </VirtualGrid>
                      );
                    }}
                  </AutoSizer>
                ) : (
                  <AutoSizer>
                    {({ height, width }) => {
                      const listItemData: ListItemData = {
                        pages: filteredPages,
                        selectedPages,
                        thumbnails,
                        togglePageSelection
                      };

                      return (
                        <VirtualList
                          height={height}
                          width={width}
                          rowCount={filteredPages.length}
                          itemSize={80}
                          rowProps={{ data: listItemData }}
                          onRowsRendered={({ startIndex, stopIndex }) => {
                            const neededPages: number[] = [];
                            for (let i = startIndex; i <= stopIndex; i++) {
                              if (filteredPages[i]) {
                                neededPages.push(filteredPages[i].pageNumber);
                              }
                            }
                            debouncedLoadThumbnails(neededPages);
                          }}
                        >
                          {ListRow}
                        </VirtualList>
                      );
                    }}
                  </AutoSizer>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          {pdfInfo && (
            <Button
              onClick={handleImport}
              disabled={selectedPages.size === 0 || isLoading}
            >
              <Download size={16} className="mr-2" />
              Import {selectedPages.size} Page{selectedPages.size !== 1 ? 's' : ''}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

PDFPageSelector.displayName = 'PDFPageSelector';