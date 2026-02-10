import React, { memo, useCallback, useRef } from 'react';
import { useVisualEditorState } from './useVisualEditorState';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useImageProcessing } from './hooks/useImageProcessing';
import { useUndoRedo } from './useUndoRedo';
import { ToolSection } from './components/panels/ToolSection';
import { ImageSection } from './components/panels/ImageSection';
import { PDFSection } from './components/panels/PDFSection';
import { RegionSection } from './components/panels/RegionSection';
import type { VisualSegment } from './types/visualEditor.types';

interface LeftControlPanelProps {
  className?: string;
}

export const LeftControlPanel = memo<LeftControlPanelProps>(({ className }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pages = useVisualEditorState((s) => s.pages);
  const currentPageIndex = useVisualEditorState((s) => s.currentPageIndex);
  const selectedSegmentIds = useVisualEditorState((s) => s.selectedSegmentIds);
  const playbackTime = useVisualEditorState((s) => s.playbackTime);
  const isDrawing = useVisualEditorState((s) => s.isDrawing);
  const chainTimesMode = useVisualEditorState((s) => s.chainTimesMode);
  const zoom = useVisualEditorState((s) => s.zoom);

  const addPage = useVisualEditorState((s) => s.addPage);
  const removePage = useVisualEditorState((s) => s.removePage);
  const setCurrentPage = useVisualEditorState((s) => s.setCurrentPage);
  const selectSegment = useVisualEditorState((s) => s.selectSegment);
  const toggleSegmentVisibility = useVisualEditorState((s) => s.toggleSegmentVisibility);
  const setPlaybackTime = useVisualEditorState((s) => s.setPlaybackTime);
  const setPlaying = useVisualEditorState((s) => s.setPlaying);
  const setDrawing = useVisualEditorState((s) => s.setDrawing);
  const toggleChainMode = useVisualEditorState((s) => s.toggleChainMode);
  const copySelected = useVisualEditorState((s) => s.copySelected);
  const deleteSegments = useVisualEditorState((s) => s.deleteSegments);
  const setZoom = useVisualEditorState((s) => s.setZoom);
  const resetView = useVisualEditorState((s) => s.resetView);
  const moveSegmentUp = useVisualEditorState((s) => s.moveSegmentUp);
  const moveSegmentDown = useVisualEditorState((s) => s.moveSegmentDown);
  const duplicateSegment = useVisualEditorState((s) => s.duplicateSegment);
  const { saveState } = useUndoRedo();

  const { handleFileChange } = useImageProcessing(addPage);

  const handleAddPDFPages = useCallback((pdfPages: { pageNumber: number; imageData: string }[]) => {
    // Add each PDF page as a separate image page with isPDF flag
    pdfPages.forEach((pdfPage) => {
      addPage(pdfPage.imageData, true); // Pass true for isPDF
    });
    saveState();
  }, [addPage, saveState]);

  const handleAddImage = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handlePlaySegment = useCallback(
    (segment: VisualSegment) => {
      setPlaybackTime(segment.startTime);
      setPlaying(true);
    },
    [setPlaybackTime, setPlaying]
  );

  const handleSegmentClick = useCallback(
    (e: React.MouseEvent, segment: VisualSegment, pageIndex: number) => {
      if (pageIndex !== currentPageIndex) setCurrentPage(pageIndex);
      if (e.ctrlKey || e.metaKey) selectSegment(segment.id, 'toggle');
      else if (e.shiftKey) selectSegment(segment.id, 'range');
      else selectSegment(segment.id, 'single');
    },
    [currentPageIndex, setCurrentPage, selectSegment]
  );

  const totalSegments = pages.reduce((acc, p) => acc + p.segments.length, 0);

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-gradient-to-b from-card to-card/95',
        'border-r border-border/50 shadow-xl shadow-black/5',
        className
      )}
    >
      <ToolSection
        isDrawing={isDrawing}
        chainTimesMode={chainTimesMode}
        zoom={zoom}
        selectedSegmentIds={selectedSegmentIds}
        setDrawing={setDrawing}
        toggleChainMode={toggleChainMode}
        setZoom={setZoom}
        resetView={resetView}
        copySelected={copySelected}
        deleteSegments={deleteSegments}
      />

      <Separator className="opacity-50" />

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          <ImageSection
            pages={pages}
            currentPageIndex={currentPageIndex}
            onAddImage={handleAddImage}
            onSelectPage={setCurrentPage}
            onRemovePage={removePage}
            fileInputRef={fileInputRef}
            onFileChange={handleFileChange}
          />

          <PDFSection
            pages={pages}
            currentPageIndex={currentPageIndex}
            onAddPages={handleAddPDFPages}
            onSelectPage={setCurrentPage}
            onRemovePage={removePage}
          />

          <RegionSection
            pages={pages}
            currentPageIndex={currentPageIndex}
            selectedSegmentIds={selectedSegmentIds}
            playbackTime={playbackTime}
            onSegmentClick={handleSegmentClick}
            onPlaySegment={handlePlaySegment}
            onToggleVisibility={toggleSegmentVisibility}
            onMoveUp={moveSegmentUp}
            onMoveDown={moveSegmentDown}
            onDuplicate={(id) => { saveState(); duplicateSegment(id); }}
            onDelete={(id) => { saveState(); deleteSegments([id]); }}
          />
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-border/50 bg-muted/20 shrink-0">
        <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground min-w-0">
          <span className="whitespace-nowrap shrink-0">{pages.length} image{pages.length !== 1 ? 's' : ''}</span>
          <span className="whitespace-nowrap shrink-0">{totalSegments} region{totalSegments !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  );
});

LeftControlPanel.displayName = 'LeftControlPanel';
