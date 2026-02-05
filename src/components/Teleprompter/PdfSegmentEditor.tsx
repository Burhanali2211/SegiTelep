import React, { memo, useCallback, useState, useRef, useEffect } from 'react';
import { useTeleprompterStore } from '@/store/teleprompterStore';
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
import { 
  FileText, 
  Upload, 
  ChevronLeft, 
  ChevronRight,
  Loader2 
} from 'lucide-react';

interface PdfPage {
  pageNum: number;
  imageData: string;
  selected: boolean;
}

interface PdfSegmentEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PdfSegmentEditor = memo<PdfSegmentEditorProps>(({
  open,
  onOpenChange,
}) => {
  const addSegment = useTeleprompterStore((s) => s.addSegment);
  
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PdfPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [duration, setDuration] = useState(10);
  const [baseName, setBaseName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load PDF.js dynamically
  const loadPdfPages = useCallback(async (file: File) => {
    setLoading(true);
    
    try {
      // Dynamic import of PDF.js
      const pdfjsLib = await import('pdfjs-dist');
      
      // Set worker source
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      const loadedPages: PdfPage[] = [];
      
      for (let i = 1; i <= Math.min(pdf.numPages, 100); i++) {
        const page = await pdf.getPage(i);
        const scale = 1.5;
        const viewport = page.getViewport({ scale });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) continue;
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        await page.render({
          canvasContext: context,
          viewport,
        }).promise;
        
        loadedPages.push({
          pageNum: i,
          imageData: canvas.toDataURL('image/webp', 0.85),
          selected: false,
        });
      }
      
      setPages(loadedPages);
      setBaseName(file.name.replace(/\.[^/.]+$/, ''));
      setCurrentPage(0);
    } catch (error) {
      console.error('Error loading PDF:', error);
      alert('Failed to load PDF. Please try a different file.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please select a PDF file');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      alert('PDF file must be less than 100MB');
      return;
    }

    setPdfFile(file);
    loadPdfPages(file);
  }, [loadPdfPages]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || file.type !== 'application/pdf') return;

    setPdfFile(file);
    loadPdfPages(file);
  }, [loadPdfPages]);

  const togglePageSelection = useCallback((pageNum: number) => {
    setPages((prev) =>
      prev.map((p) =>
        p.pageNum === pageNum ? { ...p, selected: !p.selected } : p
      )
    );
  }, []);

  const selectAll = useCallback(() => {
    setPages((prev) => prev.map((p) => ({ ...p, selected: true })));
  }, []);

  const selectNone = useCallback(() => {
    setPages((prev) => prev.map((p) => ({ ...p, selected: false })));
  }, []);

  const handleAddSegments = useCallback(() => {
    const selectedPages = pages.filter((p) => p.selected);
    
    if (selectedPages.length === 0) {
      alert('Please select at least one page');
      return;
    }

    selectedPages.forEach((page) => {
      addSegment({
        type: 'pdf-page',
        name: `${baseName} - Page ${page.pageNum}`,
        content: page.imageData,
        duration,
        scrollSpeed: 0,
      });
    });

    // Reset and close
    resetState();
    onOpenChange(false);
  }, [pages, baseName, duration, addSegment, onOpenChange]);

  const resetState = useCallback(() => {
    setPdfFile(null);
    setPages([]);
    setCurrentPage(0);
    setBaseName('');
    setDuration(10);
  }, []);

  const selectedCount = pages.filter((p) => p.selected).length;

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetState();
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText size={20} />
            Add PDF Segments
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-[500px] overflow-hidden flex flex-col">
          {!pdfFile ? (
            <div
              className="flex-1 border-2 border-dashed border-muted rounded-lg flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <Upload size={48} className="text-muted-foreground" />
              <div className="text-center">
                <p className="text-lg font-medium">Drop PDF here or click to upload</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Max 100MB, up to 100 pages supported
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          ) : loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <Loader2 size={48} className="animate-spin text-primary" />
                <p className="text-muted-foreground">Loading PDF pages...</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex gap-4 overflow-hidden">
              {/* Thumbnail sidebar */}
              <div className="w-48 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {selectedCount} of {pages.length} selected
                  </span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={selectAll} className="h-6 px-2 text-xs">
                      All
                    </Button>
                    <Button variant="ghost" size="sm" onClick={selectNone} className="h-6 px-2 text-xs">
                      None
                    </Button>
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  <div className="space-y-2 pr-4">
                    {pages.map((page, index) => (
                      <div
                        key={page.pageNum}
                        className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                          page.selected
                            ? 'border-primary'
                            : 'border-transparent hover:border-muted'
                        } ${currentPage === index ? 'ring-2 ring-accent' : ''}`}
                        onClick={() => setCurrentPage(index)}
                      >
                        <img
                          src={page.imageData}
                          alt={`Page ${page.pageNum}`}
                          className="w-full"
                        />
                        <div className="absolute top-1 left-1">
                          <Checkbox
                            checked={page.selected}
                            onCheckedChange={() => togglePageSelection(page.pageNum)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 rounded">
                          {page.pageNum}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Main preview */}
              <div className="flex-1 flex flex-col gap-4">
                <div className="flex-1 relative overflow-hidden rounded-lg bg-black flex items-center justify-center">
                  {pages[currentPage] && (
                    <img
                      src={pages[currentPage].imageData}
                      alt={`Page ${pages[currentPage].pageNum}`}
                      className="max-w-full max-h-full object-contain"
                    />
                  )}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                  >
                    <ChevronLeft size={20} />
                  </Button>
                  <span className="text-sm">
                    Page {currentPage + 1} of {pages.length}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage((p) => Math.min(pages.length - 1, p + 1))}
                    disabled={currentPage === pages.length - 1}
                  >
                    <ChevronRight size={20} />
                  </Button>
                  <Button
                    variant={pages[currentPage]?.selected ? 'default' : 'secondary'}
                    onClick={() => pages[currentPage] && togglePageSelection(pages[currentPage].pageNum)}
                  >
                    {pages[currentPage]?.selected ? 'Selected' : 'Select Page'}
                  </Button>
                </div>

                {/* Settings */}
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label className="text-sm">Base Name</Label>
                    <Input
                      value={baseName}
                      onChange={(e) => setBaseName(e.target.value)}
                      placeholder="Segment base name"
                      className="mt-1"
                    />
                  </div>
                  <div className="w-32">
                    <Label className="text-sm">Duration per page (s)</Label>
                    <Input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      min={1}
                      max={300}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {pages.length > 0 && (
            <>
              <Button variant="secondary" onClick={resetState}>
                Choose Different
              </Button>
              <Button onClick={handleAddSegments} disabled={selectedCount === 0}>
                Add {selectedCount} Segment{selectedCount !== 1 ? 's' : ''}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

PdfSegmentEditor.displayName = 'PdfSegmentEditor';

export default PdfSegmentEditor;
