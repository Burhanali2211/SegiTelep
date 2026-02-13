import React, { memo } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Trash2, ImagePlus, Upload, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AssetThumbnail } from '../../components/AssetThumbnail';
import type { ImagePage } from '../../types/visualEditor.types';

interface ImageSectionProps {
  pages: ImagePage[];
  currentPageIndex: number;
  onAddImage: () => void;
  onSelectPage: (index: number) => void;
  onRemovePage: (index: number) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ImageSection = memo<ImageSectionProps>(({ pages, currentPageIndex, onAddImage, onSelectPage, onRemovePage, fileInputRef, onFileChange }) => {
  // Filter only image pages (not PDF pages)
  const imagePages = pages.filter(page => !page.isPDF);
  const currentImagePageIndex = pages.findIndex(page => page.id === pages[currentPageIndex]?.id && !page.isPDF);

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Images</h3>
        {imagePages.length > 0 && <span className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">{imagePages.length}</span>}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onFileChange} />

      {imagePages.length === 0 ? (
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <button
              onClick={onAddImage}
              className={cn(
                'w-full h-16 rounded-lg border border-dashed border-muted-foreground/25',
                'flex items-center justify-center gap-2 px-3',
                'text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5',
                'transition-all duration-200 group'
              )}
            >
              <div className="w-6 h-6 rounded-md bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Upload size={12} className="group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-left">
                <span className="text-[10px] font-medium block">Add Image</span>
                <span className="text-[9px] text-muted-foreground">Click or drag & drop</span>
              </div>
            </button>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-48">
            <ContextMenuItem onClick={onAddImage}>
              <ImagePlus className="mr-2 h-4 w-4" />
              Add image
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ) : (
        <div className="space-y-1 w-full overflow-hidden">
          {imagePages.map((page, index) => {
            const actualPageIndex = pages.findIndex(p => p.id === page.id);
            const isSelected = actualPageIndex === currentPageIndex;

            return (
              <ContextMenu key={page.id}>
                <ContextMenuTrigger asChild>
                  <div
                    onClick={() => onSelectPage(actualPageIndex)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && onSelectPage(actualPageIndex)}
                    className={cn(
                      'flex items-center gap-1.5 p-1.5 rounded-md transition-all duration-200 group cursor-pointer',
                      'border border-transparent w-full min-w-0 max-w-full',
                      isSelected ? 'bg-primary/10 border-primary/30' : 'hover:bg-muted/50'
                    )}
                  >
                    {/* Thumbnail */}
                    <AssetThumbnail
                      assetId={page.assetId}
                      data={page.data}
                      className="w-8 h-8 rounded-md flex-shrink-0"
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="text-[9px] font-medium truncate flex-1 min-w-0">Image {actualPageIndex + 1}</span>
                          {page.segments.length > 0 && (
                            <span className="text-[8px] text-muted-foreground shrink-0 hidden xs:inline">{page.segments.length}r</span>
                          )}
                        </div>
                        <span className="text-[8px] text-muted-foreground truncate">Click to select</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      {imagePages.length > 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onRemovePage(actualPageIndex); }}
                          className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Remove image"
                        >
                          <Trash2 size={8} />
                        </button>
                      )}
                    </div>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-48">
                  <ContextMenuItem onClick={() => onSelectPage(actualPageIndex)}>
                    <Check className="mr-2 h-4 w-4" />
                    Select image
                  </ContextMenuItem>
                  {imagePages.length > 1 && (
                    <>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => onRemovePage(actualPageIndex)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove image
                      </ContextMenuItem>
                    </>
                  )}
                </ContextMenuContent>
              </ContextMenu>
            );
          })}

          {/* Add More Button */}
          <button
            onClick={onAddImage}
            className={cn(
              'w-full h-8 rounded-md border border-dashed border-muted-foreground/30',
              'flex items-center justify-center gap-2 px-3',
              'text-[10px] text-muted-foreground hover:text-foreground',
              'hover:border-primary/50 hover:bg-primary/5 transition-all'
            )}
          >
            <ImagePlus size={10} />
            <span>Add Image</span>
          </button>
        </div>
      )}
    </section>
  );
});

ImageSection.displayName = 'ImageSection';
