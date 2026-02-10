import React, { memo, useCallback, useState } from 'react';
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
import { 
  FileText, 
  Upload,
  Settings,
} from 'lucide-react';
import { PDFPageSelector } from './PDFPageSelector';

interface PdfSegmentEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PdfSegmentEditor = memo<PdfSegmentEditorProps>(({
  open,
  onOpenChange,
}) => {
  const addSegment = useTeleprompterStore((s) => s.addSegment);
  
  const [showPageSelector, setShowPageSelector] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(10);
  const [baseName, setBaseName] = useState('');

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
    setBaseName(file.name.replace(/\.[^/.]+$/, ''));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || file.type !== 'application/pdf') return;

    setPdfFile(file);
    setBaseName(file.name.replace(/\.[^/.]+$/, ''));
  }, []);

  const handlePagesSelected = useCallback((pages: { pageNumber: number; imageData: string }[]) => {
    // Add each selected page as a separate segment
    pages.forEach((page, index) => {
      addSegment({
        type: 'pdf-page',
        name: `${baseName || 'PDF Document'} - Page ${page.pageNumber}`,
        content: page.imageData,
        duration,
        scrollSpeed: 0,
      });
    });

    // Reset state and close dialogs
    setPdfFile(null);
    setBaseName('');
    setDuration(10);
    setShowPageSelector(false);
    onOpenChange(false);
  }, [addSegment, baseName, duration, onOpenChange]);

  const handleAddSingleSegment = useCallback(() => {
    if (!pdfFile) return;

    setShowPageSelector(true);
  }, [pdfFile]);

  const resetState = useCallback(() => {
    setPdfFile(null);
    setBaseName('');
    setDuration(10);
    setShowPageSelector(false);
  }, []);

  return (
    <>
      <Dialog open={open} onOpenChange={(open) => {
        if (!open) resetState();
        onOpenChange(open);
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText size={20} />
              Add PDF Segment
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!pdfFile ? (
              <div
                className="border-2 border-dashed border-muted rounded-lg p-8 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => document.getElementById('pdf-file-input')?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <Upload size={40} className="text-muted-foreground" />
                <div className="text-center">
                  <p className="font-medium">Drop PDF here or click to upload</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Max 100MB, supports multi-page PDFs
                  </p>
                </div>
                <input
                  id="pdf-file-input"
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg flex items-center gap-3">
                  <FileText size={24} className="text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{pdfFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-muted/50 rounded-lg flex items-start gap-2">
                  <Settings size={18} className="text-primary shrink-0 mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <p className="mb-2">Choose how you want to import this PDF:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Select specific pages to import as individual segments</li>
                      <li>Each selected page will become a separate segment</li>
                      <li>You can preview pages before importing</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-32">
                    <Label className="text-sm">Default Duration (s)</Label>
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
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {pdfFile && (
              <>
                <Button variant="secondary" onClick={resetState}>
                  Choose Different
                </Button>
                <Button onClick={handleAddSingleSegment}>
                  Select Pages
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Page Selector Dialog */}
      <PDFPageSelector
        open={showPageSelector}
        onOpenChange={setShowPageSelector}
        onPagesSelected={handlePagesSelected}
      />
    </>
  );
});

PdfSegmentEditor.displayName = 'PdfSegmentEditor';

export default PdfSegmentEditor;
