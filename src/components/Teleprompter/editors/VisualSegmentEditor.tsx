import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { useTeleprompterStore } from '@/store/teleprompterStore';
import { Region, isVisualSegment } from '@/types/teleprompter.types';
import { RegionSelector } from './RegionSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Square,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

interface RegionItem extends Region {
  id: string;
  name: string;
  duration: number;
  audioId?: string;
}

interface ImageItem {
  id: string;
  name: string;
  data: string;
  regions: RegionItem[];
}

interface VisualSegmentEditorProps {
  className?: string;
}

export const VisualSegmentEditor = memo<VisualSegmentEditorProps>(({ className }) => {
  const project = useTeleprompterStore((s) => s.project);
  const selectedSegmentId = useTeleprompterStore((s) => s.editor.selectedSegmentId);
  const playback = useTeleprompterStore((s) => s.playback);
  const updateSegment = useTeleprompterStore((s) => s.updateSegment);
  const addSegment = useTeleprompterStore((s) => s.addSegment);
  const hasUnsavedChanges = useTeleprompterStore((s) => s.hasUnsavedChanges);
  const saveCurrentProject = useTeleprompterStore((s) => s.saveCurrentProject);
  const play = useTeleprompterStore((s) => s.play);
  const pause = useTeleprompterStore((s) => s.pause);
  const stop = useTeleprompterStore((s) => s.stop);
  const nextSegment = useTeleprompterStore((s) => s.nextSegment);
  const prevSegment = useTeleprompterStore((s) => s.prevSegment);
  const setCurrentSegment = useTeleprompterStore((s) => s.setCurrentSegment);
  const selectSegment = useTeleprompterStore((s) => s.selectSegment);

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for managing images and regions
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);

  const { isPlaying, isPaused, currentSegmentIndex } = playback;
  const currentSegment = project?.segments[currentSegmentIndex];
  const totalSegments = project?.segments.length || 0;
  
  // Get visual segments only for navigation
  const visualSegments = project?.segments.filter(isVisualSegment) || [];
  const currentVisualIndex = visualSegments.findIndex(s => s.id === currentSegment?.id);

  // Currently selected image
  const selectedImage = images.find(img => img.id === selectedImageId);

  // Load existing visual segment into editor when selected
  useEffect(() => {
    if (selectedSegmentId && project) {
      const segment = project.segments.find(s => s.id === selectedSegmentId);
      if (segment && isVisualSegment(segment) && segment.content?.startsWith('data:')) {
        // Check if this image is already loaded
        const existingImage = images.find(img => img.data === segment.content);
        if (!existingImage) {
          const newImage: ImageItem = {
            id: uuidv4(),
            name: segment.name || 'Loaded Image',
            data: segment.content,
            regions: [],
          };
          setImages(prev => [...prev, newImage]);
          setSelectedImageId(newImage.id);
        } else {
          setSelectedImageId(existingImage.id);
        }
      }
    }
  }, [selectedSegmentId, project]);

  // Handle file upload (supports multiple)
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      if (file.size > 10 * 1024 * 1024) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const data = event.target?.result as string;
        const newImage: ImageItem = {
          id: uuidv4(),
          name: file.name.replace(/\.[^/.]+$/, ''),
          data,
          regions: [],
        };
        setImages(prev => [...prev, newImage]);
        setSelectedImageId(newImage.id);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Delete image
  const handleDeleteImage = useCallback((imageId: string) => {
    setImages(prev => prev.filter(img => img.id !== imageId));
    if (selectedImageId === imageId) {
      setSelectedImageId(images[0]?.id || null);
    }
  }, [selectedImageId, images]);

  // Handle region creation
  const handleRegionCreate = useCallback((region: Region) => {
    if (!selectedImageId) return;
    
    const newRegion: RegionItem = {
      ...region,
      id: uuidv4(),
      name: `Region ${(selectedImage?.regions.length || 0) + 1}`,
      duration: 5,
    };
    
    setImages(prev => prev.map(img => 
      img.id === selectedImageId 
        ? { ...img, regions: [...img.regions, newRegion] }
        : img
    ));
    setSelectedRegionId(newRegion.id);
    setIsDrawing(false);
  }, [selectedImageId, selectedImage]);

  // Handle region update
  const handleRegionUpdate = useCallback((regionId: string, updates: Partial<RegionItem>) => {
    if (!selectedImageId) return;
    
    setImages(prev => prev.map(img => 
      img.id === selectedImageId 
        ? { 
            ...img, 
            regions: img.regions.map(r => r.id === regionId ? { ...r, ...updates } : r)
          }
        : img
    ));
  }, [selectedImageId]);

  // Handle region delete
  const handleRegionDelete = useCallback((regionId: string) => {
    if (!selectedImageId) return;
    
    setImages(prev => prev.map(img => 
      img.id === selectedImageId 
        ? { ...img, regions: img.regions.filter(r => r.id !== regionId) }
        : img
    ));
    if (selectedRegionId === regionId) {
      setSelectedRegionId(null);
    }
  }, [selectedImageId, selectedRegionId]);

  // Create segments from all regions of selected image
  const handleCreateSegmentsFromImage = useCallback(() => {
    if (!selectedImage || selectedImage.regions.length === 0) return;

    selectedImage.regions.forEach((region) => {
      addSegment({
        type: 'image-region',
        name: region.name,
        content: selectedImage.data,
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

    // Clear regions after creating segments
    setImages(prev => prev.map(img => 
      img.id === selectedImageId 
        ? { ...img, regions: [] }
        : img
    ));
    setSelectedRegionId(null);
  }, [selectedImage, selectedImageId, addSegment]);

  // Create segments from all images
  const handleCreateAllSegments = useCallback(() => {
    images.forEach((image) => {
      if (image.regions.length === 0) {
        // Create single segment for entire image
        addSegment({
          type: 'image',
          name: image.name,
          content: image.data,
          duration: 5,
        });
      } else {
        // Create segments from regions
        image.regions.forEach((region) => {
          addSegment({
            type: 'image-region',
            name: region.name,
            content: image.data,
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
      }
    });

    // Clear all
    setImages([]);
    setSelectedImageId(null);
    setSelectedRegionId(null);
  }, [images, addSegment]);

  // Playback handlers
  const handlePlayPause = useCallback(() => {
    if (!project || totalSegments === 0) return;
    if (isPlaying && !isPaused) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, isPaused, play, pause, project, totalSegments]);

  const handleStop = useCallback(() => {
    stop();
  }, [stop]);

  const handlePrevSegment = useCallback(() => {
    if (currentSegmentIndex > 0) {
      const newIndex = currentSegmentIndex - 1;
      setCurrentSegment(newIndex);
      if (project?.segments[newIndex]) {
        selectSegment(project.segments[newIndex].id);
      }
    }
  }, [currentSegmentIndex, setCurrentSegment, selectSegment, project]);

  const handleNextSegment = useCallback(() => {
    if (currentSegmentIndex < totalSegments - 1) {
      const newIndex = currentSegmentIndex + 1;
      setCurrentSegment(newIndex);
      if (project?.segments[newIndex]) {
        selectSegment(project.segments[newIndex].id);
      }
    }
  }, [currentSegmentIndex, totalSegments, setCurrentSegment, selectSegment, project]);

  // Total regions count
  const totalRegions = images.reduce((sum, img) => sum + img.regions.length, 0);

  return (
    <div className={cn('flex flex-col h-full overflow-hidden', className)}>
      {/* Header with playback controls */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-sm">Visual Editor</h2>
          <span className="text-xs text-muted-foreground">
            {images.length} image{images.length !== 1 ? 's' : ''} • {totalRegions} region{totalRegions !== 1 ? 's' : ''}
          </span>
        </div>
        
        {/* Playback Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handlePrevSegment}
            disabled={currentSegmentIndex === 0}
            title="Previous Segment"
          >
            <SkipBack size={16} />
          </Button>
          <Button
            variant={isPlaying && !isPaused ? 'default' : 'secondary'}
            size="icon"
            className="h-8 w-8"
            onClick={handlePlayPause}
            disabled={totalSegments === 0}
            title={isPlaying && !isPaused ? 'Pause' : 'Play'}
          >
            {isPlaying && !isPaused ? <Pause size={16} /> : <Play size={16} />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleStop}
            disabled={!isPlaying}
            title="Stop"
          >
            <Square size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleNextSegment}
            disabled={currentSegmentIndex >= totalSegments - 1}
            title="Next Segment"
          >
            <SkipForward size={16} />
          </Button>
          <span className="text-xs text-muted-foreground ml-2">
            {currentSegmentIndex + 1}/{totalSegments}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={14} className="mr-1" />
            Add Image
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
          multiple
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Image Thumbnails Sidebar */}
        {images.length > 0 && (
          <div className="w-24 border-r border-border bg-card/50 shrink-0">
            <ScrollArea className="h-full">
              <div className="p-2 space-y-2">
                {images.map((image, index) => (
                  <div
                    key={image.id}
                    className={cn(
                      'relative rounded-lg overflow-hidden cursor-pointer border-2 transition-all',
                      selectedImageId === image.id
                        ? 'border-primary'
                        : 'border-transparent hover:border-border'
                    )}
                    onClick={() => setSelectedImageId(image.id)}
                  >
                    <img
                      src={image.data}
                      alt={image.name}
                      className="w-full h-16 object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                      <p className="text-[10px] text-white truncate">{image.name}</p>
                    </div>
                    {image.regions.length > 0 && (
                      <div className="absolute top-1 right-1 bg-primary text-primary-foreground text-[10px] px-1 rounded">
                        {image.regions.length}
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 left-1 h-5 w-5 bg-black/50 hover:bg-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteImage(image.id);
                      }}
                    >
                      <X size={10} className="text-white" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Canvas Area */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {selectedImage ? (
            <>
              {/* Canvas */}
              <div className="flex-1 min-h-0 relative">
                <RegionSelector
                  imageSrc={selectedImage.data}
                  regions={selectedImage.regions}
                  selectedRegionId={selectedRegionId}
                  onRegionCreate={handleRegionCreate}
                  onRegionSelect={setSelectedRegionId}
                  onRegionUpdate={(id, region) => handleRegionUpdate(id, region)}
                  isDrawing={isDrawing}
                  className="h-full"
                />
                
                {/* Draw Mode Indicator */}
                {isDrawing && (
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-sm font-medium shadow-lg z-10">
                    Click and drag to draw a region
                  </div>
                )}
              </div>
              
              {/* Regions Strip */}
              <div className="border-t border-border bg-card shrink-0">
                <div className="flex items-center gap-2 px-4 py-2">
                  <span className="text-xs font-medium text-muted-foreground shrink-0">REGIONS</span>
                  <div className="flex-1 overflow-x-auto">
                    <div className="flex items-center gap-2">
                      {selectedImage.regions.map((region) => (
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
                      
                      {selectedImage.regions.length === 0 && !isDrawing && (
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
                    
                    {selectedImage.regions.length > 0 && (
                      <Button size="sm" className="h-8" onClick={handleCreateSegmentsFromImage}>
                        <Plus size={14} className="mr-1" />
                        Create {selectedImage.regions.length} Segment{selectedImage.regions.length !== 1 ? 's' : ''}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : images.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-muted/30">
              <ImageIcon size={64} className="text-muted-foreground" />
              <p className="text-muted-foreground text-lg">No images loaded</p>
              <p className="text-muted-foreground text-sm">Upload images to create visual segments</p>
              <Button onClick={() => fileInputRef.current?.click()} size="lg">
                <Upload size={18} className="mr-2" />
                Upload Images
              </Button>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-muted/30">
              <p className="text-muted-foreground">Select an image from the sidebar</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      {images.length > 0 && totalRegions > 0 && (
        <div className="border-t border-border bg-card px-4 py-2 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Ready to create {totalRegions} segment{totalRegions !== 1 ? 's' : ''} from {images.length} image{images.length !== 1 ? 's' : ''}
            </span>
            <Button onClick={handleCreateAllSegments}>
              <Plus size={16} className="mr-2" />
              Create All Segments
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});

VisualSegmentEditor.displayName = 'VisualSegmentEditor';

export default VisualSegmentEditor;
