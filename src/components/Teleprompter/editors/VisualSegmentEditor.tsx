import React, { memo, useState, useCallback, useRef } from 'react';
import { useTeleprompterStore } from '@/store/teleprompterStore';
import { Region, Segment, isVisualSegment } from '@/types/teleprompter.types';
import { RegionSelector } from './RegionSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Image as ImageIcon,
  Crop,
  Plus,
  Trash2,
  Upload,
  Clock,
  Save,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

interface RegionItem extends Region {
  id: string;
  name: string;
  duration: number;
  audioId?: string;
}

interface VisualSegmentEditorProps {
  className?: string;
}

export const VisualSegmentEditor = memo<VisualSegmentEditorProps>(({ className }) => {
  const project = useTeleprompterStore((s) => s.project);
  const selectedSegmentId = useTeleprompterStore((s) => s.editor.selectedSegmentId);
  const updateSegment = useTeleprompterStore((s) => s.updateSegment);
  const addSegment = useTeleprompterStore((s) => s.addSegment);
  const hasUnsavedChanges = useTeleprompterStore((s) => s.hasUnsavedChanges);
  const saveCurrentProject = useTeleprompterStore((s) => s.saveCurrentProject);

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [regions, setRegions] = useState<RegionItem[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const segment = project?.segments.find((s) => s.id === selectedSegmentId);
  const isVisual = segment && isVisualSegment(segment);

  // Image source: either from segment content or uploaded
  const imageSrc = segment?.content?.startsWith('data:') ? segment.content : uploadedImage;

  // Handle file upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Image is too large (max 10MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result as string;
      setUploadedImage(data);
      setRegions([]);
      setSelectedRegionId(null);
      
      if (selectedSegmentId) {
        updateSegment(selectedSegmentId, { content: data });
      }
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [selectedSegmentId, updateSegment]);

  // Handle region creation
  const handleRegionCreate = useCallback((region: Region) => {
    const newRegion: RegionItem = {
      ...region,
      id: uuidv4(),
      name: `Region ${regions.length + 1}`,
      duration: 5,
    };
    setRegions((prev) => [...prev, newRegion]);
    setSelectedRegionId(newRegion.id);
    setIsDrawing(false);
  }, [regions.length]);

  // Handle region update
  const handleRegionUpdate = useCallback((id: string, updates: Partial<RegionItem>) => {
    setRegions((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  }, []);

  // Handle region delete
  const handleRegionDelete = useCallback((id: string) => {
    setRegions((prev) => prev.filter((r) => r.id !== id));
    if (selectedRegionId === id) {
      setSelectedRegionId(null);
    }
  }, [selectedRegionId]);

  // Create segments from all regions
  const handleCreateSegments = useCallback(() => {
    if (!imageSrc || regions.length === 0) return;

    regions.forEach((region) => {
      addSegment({
        type: 'image-region',
        name: region.name,
        content: imageSrc,
        region: {
          x: region.x,
          y: region.y,
          width: region.width,
          height: region.height,
        },
        duration: region.duration,
        audioId: region.audioId,
      });
    });

    setRegions([]);
    setSelectedRegionId(null);
  }, [imageSrc, regions, addSegment]);

  // Update segment duration
  const handleDurationChange = useCallback((duration: number) => {
    if (selectedSegmentId) {
      updateSegment(selectedSegmentId, { duration });
    }
  }, [selectedSegmentId, updateSegment]);

  // Update segment name
  const handleNameChange = useCallback((name: string) => {
    if (selectedSegmentId) {
      updateSegment(selectedSegmentId, { name });
    }
  }, [selectedSegmentId, updateSegment]);

  // No segment selected
  if (!segment) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-full gap-4', className)}>
        <ImageIcon size={48} className="text-muted-foreground" />
        <p className="text-muted-foreground">Select an image segment to edit</p>
      </div>
    );
  }

  // Not a visual segment
  if (!isVisual) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-full gap-4', className)}>
        <ImageIcon size={48} className="text-muted-foreground" />
        <p className="text-muted-foreground">This is not an image segment</p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full overflow-hidden', className)}>
      {/* Compact Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Input
            value={segment.name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="h-8 text-sm font-medium bg-transparent border-transparent hover:border-border focus:border-primary max-w-[200px]"
          />
          <span className="text-xs text-muted-foreground capitalize">
            {segment.type.replace('-', ' ')}
          </span>
          <div className="flex items-center gap-2 ml-4">
            <Clock size={14} className="text-muted-foreground" />
            <Select
              value={String(segment.duration)}
              onValueChange={(v) => handleDurationChange(Number(v))}
            >
              <SelectTrigger className="h-7 w-20 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 5, 8, 10, 15, 20, 30, 45, 60].map((sec) => (
                  <SelectItem key={sec} value={String(sec)}>
                    {sec}s
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={14} className="mr-1" />
            Replace
          </Button>
          {hasUnsavedChanges && (
            <Button size="sm" variant="ghost" onClick={saveCurrentProject} className="h-7 px-2">
              <Save size={14} className="mr-1" />
              Save
            </Button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {/* Main Canvas Area - Maximum Space */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {imageSrc ? (
          <>
            {/* Canvas */}
            <div className="flex-1 min-h-0 relative">
              <RegionSelector
                imageSrc={imageSrc}
                regions={regions}
                selectedRegionId={selectedRegionId}
                onRegionCreate={handleRegionCreate}
                onRegionSelect={setSelectedRegionId}
                onRegionUpdate={(id, region) => handleRegionUpdate(id, region)}
                isDrawing={isDrawing}
                className="h-full"
              />
              
              {/* Draw Mode Indicator */}
              {isDrawing && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-sm font-medium shadow-lg">
                  Draw a rectangle to select a region
                </div>
              )}
            </div>
            
            {/* Horizontal Regions Strip */}
            <div className="border-t border-border bg-card shrink-0">
              <div className="flex items-center gap-2 px-4 py-2">
                <span className="text-xs font-medium text-muted-foreground shrink-0">REGIONS</span>
                <div className="flex-1 overflow-x-auto">
                  <div className="flex items-center gap-2">
                    {regions.map((region) => (
                      <div
                        key={region.id}
                        className={cn(
                          'flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all shrink-0',
                          selectedRegionId === region.id
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-secondary/50 hover:bg-secondary'
                        )}
                        onClick={() => setSelectedRegionId(region.id)}
                      >
                        <Input
                          value={region.name}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleRegionUpdate(region.id, { name: e.target.value });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-6 w-24 text-xs bg-transparent border-transparent hover:border-border px-1"
                        />
                        <Select
                          value={String(region.duration)}
                          onValueChange={(v) => handleRegionUpdate(region.id, { duration: Number(v) })}
                        >
                          <SelectTrigger 
                            className="h-6 w-14 text-xs border-transparent"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 5, 8, 10, 15, 20, 30].map((sec) => (
                              <SelectItem key={sec} value={String(sec)}>
                                {sec}s
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRegionDelete(region.id);
                          }}
                        >
                          <X size={12} />
                        </Button>
                      </div>
                    ))}
                    
                    {regions.length === 0 && !isDrawing && (
                      <span className="text-xs text-muted-foreground">No regions - click "Draw Region" to add</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant={isDrawing ? 'default' : 'outline'}
                    size="sm"
                    className="h-8"
                    onClick={() => setIsDrawing(!isDrawing)}
                  >
                    <Crop size={14} className="mr-1" />
                    {isDrawing ? 'Cancel' : 'Draw Region'}
                  </Button>
                  
                  {regions.length > 0 && (
                    <Button size="sm" className="h-8" onClick={handleCreateSegments}>
                      <Plus size={14} className="mr-1" />
                      Create {regions.length} Segment{regions.length !== 1 ? 's' : ''}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-muted/30">
            <ImageIcon size={64} className="text-muted-foreground" />
            <p className="text-muted-foreground">No image loaded</p>
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload size={16} className="mr-2" />
              Upload Image
            </Button>
          </div>
        )}
      </div>
    </div>
  );
});

VisualSegmentEditor.displayName = 'VisualSegmentEditor';

export default VisualSegmentEditor;
