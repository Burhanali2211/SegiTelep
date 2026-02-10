import React, { memo, useState, useCallback, useEffect } from 'react';
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
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
  Info,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PDFPageSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPagesSelected: (pages: { pageNumber: number; imageData: string }[]) => void;
}

type ViewMode = 'grid' | 'list';

export const PDFPageSelector = memo<PDFPageSelectorProps>(({ 
  open, 
  onOpenChange, 
  onPagesSelected 
}) => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfInfo, setPdfInfo] = useState<PDFInfo | null>(null);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [thumbnails, setThumbnails] = useState<{ [key: number]: string }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [processor, setProcessor] = useState<PDFProcessor | null>(null);

  const pagesPerGrid = 12;
  const totalPages = pdfInfo?.totalPages || 0;
  const totalPagesGrid = Math.ceil(totalPages / pagesPerGrid);

  // Filter pages based on search
  const filteredPages = pdfInfo?.pages.filter(page => 
    searchTerm === '' || page.pageNumber.toString().includes(searchTerm)
  ) || [];

  // Get pages for current grid view
  const getPagesForCurrentGrid = () => {
    const startIndex = (currentPage - 1) * pagesPerGrid;
    const endIndex = Math.min(startIndex + pagesPerGrid, filteredPages.length);
    return filteredPages.slice(startIndex, endIndex);
  };

  // Reset state when dialog closes
  const resetState = useCallback(() => {
    setPdfFile(null);
    setPdfInfo(null);
    setSelectedPages(new Set());
    setThumbnails({});
    setCurrentPage(1);
    setSearchTerm('');
    if (processor) {
      processor.cleanup();
      setProcessor(null);
    }
  }, [processor]);

  // Debug environment detection
  useEffect(() => {
    console.log('PDF Page Selector - Environment:', {
      isTauri: isTauriEnvironment(),
      hasTauriAPI: typeof window !== 'undefined' && '__TAURI__' in window,
      userAgent: navigator.userAgent
    });
  }, []);

  // Handle file selection (both browser and Tauri)
  const handleFileSelect = useCallback(async (file?: File) => {
    setIsLoading(true);

    try {
      if (isTauriEnvironment()) {
        // Use Tauri file dialog and processing
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
          
          // Generate thumbnails for first few pages
          const initialPages = Array.from({ length: Math.min(12, result.pdfInfo.totalPages) }, (_, i) => i + 1);
          const thumbs = await newProcessor.generateThumbnails(initialPages, 150);
          setThumbnails(thumbs);
          
          toast.success(`Loaded PDF with ${result.pdfInfo.totalPages} pages`);
        }
      } else {
        // Browser environment - use provided file or file input
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

        setPdfFile(file);
        
        const newProcessor = getPDFProcessor();
        const info = await newProcessor.loadPDF(file);
        
        setPdfInfo(info);
        setProcessor(newProcessor);
        
        // Generate thumbnails for first few pages
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
  }, []);

  // Handle Tauri file dialog
  const handleTauriFileDialog = useCallback(async () => {
    try {
      const filePath = await openPDFFileDialog();
      if (filePath) {
        // Process the selected file path
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
          
          // Generate thumbnails for first few pages
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
  }, []);

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset the input value to allow selecting the same file again
    e.target.value = '';
  }, [handleFileSelect]);

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Validate file type
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        toast.error('Please drop a PDF file');
        return;
      }
      
      // Validate file size (100MB)
      const maxSize = 100 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error('PDF file must be less than 100MB');
        return;
      }
      
      if (isTauriEnvironment()) {
        // In Tauri, we can still process the dropped file using the browser method
        handleFileSelect(file);
      } else {
        // In browser, use the regular file selection
        handleFileSelect(file);
      }
    }
  }, [handleFileSelect]);

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Handle drag enter
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Handle drag leave
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Toggle page selection
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

  // Select all pages
  const selectAllPages = useCallback(() => {
    if (pdfInfo) {
      setSelectedPages(new Set(pdfInfo.pages.map(p => p.pageNumber)));
    }
  }, [pdfInfo]);

  // Deselect all pages
  const deselectAllPages = useCallback(() => {
    setSelectedPages(new Set());
  }, []);

  // Load more thumbnails when needed
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

  // Load thumbnails for current grid view
  useEffect(() => {
    if (viewMode === 'grid' && pdfInfo) {
      const currentPages = getPagesForCurrentGrid();
      loadMoreThumbnails(currentPages.map(p => p.pageNumber));
    }
  }, [currentPage, viewMode, pdfInfo, loadMoreThumbnails]);

  // Handle import selected pages
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

  // Handle dialog close
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      resetState();
    }
    onOpenChange(open);
  }, [resetState, onOpenChange]);

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
        {!pdfFile && !pdfInfo ? (
          <div className="space-y-4">
            {isTauriEnvironment() ? (
              // Tauri environment - show file dialog button with drag-drop support
              <div
                className="border-2 border-dashed border-muted rounded-lg p-12 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary/50 transition-colors flex-1"
                onClick={handleTauriFileDialog}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
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
              // Browser environment - show drag and drop
              <>
                <div
                  className="border-2 border-dashed border-muted rounded-lg p-12 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary/50 transition-colors flex-1"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const fileInput = document.getElementById('pdf-file-input') as HTMLInputElement;
                    if (fileInput) {
                      fileInput.click();
                    } else {
                      console.error('PDF file input not found');
                    }
                  }}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
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
                
                {/* Fallback button */}
                <Button 
                  onClick={() => {
                    const fileInput = document.getElementById('pdf-file-input') as HTMLInputElement;
                    if (fileInput) {
                      fileInput.click();
                    }
                  }}
                  className="w-full"
                  variant="outline"
                >
                  <Upload size={16} className="mr-2" />
                  Choose PDF File
                </Button>
                
                <input
                  id="pdf-file-input"
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
              </>
            )}
          </div>
        ) : (
          // PDF content area
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* PDF Info Bar */}
            <div className="bg-muted/30 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <FileText size={24} className="text-primary" />
                  <div>
                    <p className="font-medium">{pdfInfo?.fileName}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(pdfInfo?.fileSize || 0)} • {pdfInfo?.totalPages} pages
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
              
              {pdfInfo?.metadata && (
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

              {/* Controls */}
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

              {/* Pages Display */}
              <ScrollArea className="flex-1">
                {viewMode === 'grid' ? (
                  // Grid view
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                    {getPagesForCurrentGrid().map((page) => (
                      <div
                        key={page.pageNumber}
                        className={cn(
                          'relative border rounded-lg overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-primary',
                          selectedPages.has(page.pageNumber) && 'ring-2 ring-primary bg-primary/5'
                        )}
                        onClick={() => togglePageSelection(page.pageNumber)}
                      >
                        <div className="aspect-[3/4] bg-muted relative">
                          {thumbnails[page.pageNumber] ? (
                            <img
                              src={thumbnails[page.pageNumber]}
                              alt={`Page ${page.pageNumber}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <FileText size={32} className="text-muted-foreground" />
                            </div>
                          )}
                          
                          {/* Selection overlay */}
                          <div className="absolute top-2 right-2">
                            <div className={cn(
                              'w-6 h-6 rounded border-2 flex items-center justify-center',
                              selectedPages.has(page.pageNumber) 
                                ? 'bg-primary border-primary text-primary-foreground' 
                                : 'bg-background border-muted-foreground'
                            )}>
                              {selectedPages.has(page.pageNumber) && (
                                <div className="w-3 h-3 bg-current rounded-sm" />
                              )}
                            </div>
                          </div>

                          {/* Page number */}
                          <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                            Page {page.pageNumber}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // List view
                  <div className="p-4 space-y-2">
                    {filteredPages.map((page) => (
                      <div
                        key={page.pageNumber}
                        className={cn(
                          'flex items-center gap-4 p-3 border rounded-lg cursor-pointer transition-all hover:bg-muted/50',
                          selectedPages.has(page.pageNumber) && 'bg-primary/5 border-primary'
                        )}
                        onClick={() => togglePageSelection(page.pageNumber)}
                      >
                        <Checkbox
                          checked={selectedPages.has(page.pageNumber)}
                          className="pointer-events-none"
                        />
                        
                        <div className="w-16 h-20 bg-muted rounded flex-shrink-0 relative">
                          {thumbnails[page.pageNumber] ? (
                            <img
                              src={thumbnails[page.pageNumber]}
                              alt={`Page ${page.pageNumber}`}
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <FileText size={20} className="text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1">
                          <p className="font-medium">Page {page.pageNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {page.width} × {page.height} px
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Grid pagination */}
                {viewMode === 'grid' && totalPagesGrid > 1 && (
                  <div className="flex items-center justify-center gap-2 p-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft size={16} />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPagesGrid}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPagesGrid, prev + 1))}
                      disabled={currentPage === totalPagesGrid}
                    >
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          {pdfFile && (
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
