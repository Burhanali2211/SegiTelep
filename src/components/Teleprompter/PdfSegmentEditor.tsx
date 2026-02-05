import React, { memo, useCallback, useState, useRef } from 'react';
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
  AlertCircle,
} from 'lucide-react';

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
  const [duration, setDuration] = useState(10);
  const [baseName, setBaseName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleAddSegment = useCallback(() => {
    if (!pdfFile) return;

    // Create a text segment with the PDF info (for now, as PDF rendering requires more setup)
    addSegment({
      type: 'text',
      name: baseName || 'PDF Document',
      content: `📄 PDF Document: ${pdfFile.name}\n\nPDF rendering is coming in a future update. For now, please copy the text content from your PDF and paste it here.`,
      duration,
    });

    // Reset and close
    resetState();
    onOpenChange(false);
  }, [pdfFile, baseName, duration, addSegment, onOpenChange]);

  const resetState = useCallback(() => {
    setPdfFile(null);
    setBaseName('');
    setDuration(10);
  }, []);

  return (
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
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <Upload size={40} className="text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">Drop PDF here or click to upload</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Max 100MB
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

              <div className="p-3 bg-accent/10 rounded-lg flex items-start gap-2">
                <AlertCircle size={18} className="text-accent shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  PDF page rendering is coming soon. For now, a placeholder segment will be created. You can paste your PDF text content into it.
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label className="text-sm">Segment Name</Label>
                  <Input
                    value={baseName}
                    onChange={(e) => setBaseName(e.target.value)}
                    placeholder="Enter segment name"
                    className="mt-1"
                  />
                </div>
                <div className="w-32">
                  <Label className="text-sm">Duration (s)</Label>
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
              <Button onClick={handleAddSegment}>Add Segment</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

PdfSegmentEditor.displayName = 'PdfSegmentEditor';

export default PdfSegmentEditor;
