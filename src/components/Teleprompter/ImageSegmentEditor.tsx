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
import { Slider } from '@/components/ui/slider';
import { Image, Upload, ZoomIn, ZoomOut } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface ImageSegmentEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ImageSegmentEditor = memo<ImageSegmentEditorProps>(({
  open,
  onOpenChange,
}) => {
  const addSegment = useTeleprompterStore((s) => s.addSegment);
  
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageName, setImageName] = useState('');
  const [duration, setDuration] = useState(10);
  const [zoom, setZoom] = useState(100);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      alert('Image file must be less than 50MB');
      return;
    }

    setImageName(file.name.replace(/\.[^/.]+$/, ''));

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageData(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    setImageName(file.name.replace(/\.[^/.]+$/, ''));

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageData(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (!file) continue;

        setImageName(`Pasted Image ${Date.now()}`);

        const reader = new FileReader();
        reader.onload = (event) => {
          setImageData(event.target?.result as string);
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  }, []);

  const handleAddSegment = useCallback(() => {
    if (!imageData) return;

    addSegment({
      type: 'image',
      name: imageName || 'Image Segment',
      content: imageData,
      duration,
      scrollSpeed: 0, // Images don't scroll
    });

    // Reset and close
    setImageData(null);
    setImageName('');
    setDuration(10);
    setZoom(100);
    onOpenChange(false);
  }, [imageData, imageName, duration, addSegment, onOpenChange]);

  const resetState = useCallback(() => {
    setImageData(null);
    setImageName('');
    setDuration(10);
    setZoom(100);
  }, []);

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetState();
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image size={20} />
            Add Image Segment
          </DialogTitle>
        </DialogHeader>

        <div
          className="flex-1 min-h-[400px] overflow-hidden flex flex-col"
          onPaste={handlePaste}
        >
          {!imageData ? (
            <div
              className="flex-1 border-2 border-dashed border-muted rounded-lg flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <Upload size={48} className="text-muted-foreground" />
              <div className="text-center">
                <p className="text-lg font-medium">Drop image here or click to upload</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Supports JPEG, PNG, WebP, GIF (max 50MB)
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  You can also paste an image from clipboard
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-4">
              {/* Image Preview */}
              <div className="flex-1 relative overflow-hidden rounded-lg bg-black flex items-center justify-center">
                <img
                  src={imageData}
                  alt="Preview"
                  className="max-w-full max-h-full object-contain transition-transform"
                  style={{ transform: `scale(${zoom / 100})` }}
                />
              </div>

              {/* Controls */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label className="text-sm">Segment Name</Label>
                    <Input
                      value={imageName}
                      onChange={(e) => setImageName(e.target.value)}
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

                <div className="flex items-center gap-4">
                  <Label className="text-sm">Preview Zoom</Label>
                  <ZoomOut size={16} className="text-muted-foreground" />
                  <Slider
                    value={[zoom]}
                    onValueChange={([v]) => setZoom(v)}
                    min={50}
                    max={400}
                    step={10}
                    className="flex-1"
                  />
                  <ZoomIn size={16} className="text-muted-foreground" />
                  <span className="text-sm text-muted-foreground w-12 text-right">
                    {zoom}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {imageData && (
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

ImageSegmentEditor.displayName = 'ImageSegmentEditor';

export default ImageSegmentEditor;
