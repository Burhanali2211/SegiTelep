import React, { memo, useCallback, useRef, useEffect, useState } from 'react';
import { useTeleprompterStore } from '@/store/teleprompterStore';
import { 
  FONT_OPTIONS, 
  TEXT_COLOR_OPTIONS, 
  SPEED_PRESETS,
  Segment 
} from '@/types/teleprompter.types';
import { 
  Type, 
  Palette,
  Gauge,
  FlipHorizontal,
  AlignCenter,
  Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface ContentEditorProps {
  className?: string;
}

export const ContentEditor = memo<ContentEditorProps>(({ className }) => {
  const project = useTeleprompterStore((s) => s.project);
  const selectedSegmentId = useTeleprompterStore((s) => s.editor.selectedSegmentId);
  const updateSegment = useTeleprompterStore((s) => s.updateSegment);
  const hasUnsavedChanges = useTeleprompterStore((s) => s.hasUnsavedChanges);
  const saveCurrentProject = useTeleprompterStore((s) => s.saveCurrentProject);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localContent, setLocalContent] = useState('');
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const segment = project?.segments.find((s) => s.id === selectedSegmentId);
  
  // Sync local content with segment
  useEffect(() => {
    if (segment) {
      setLocalContent(segment.content);
    }
  }, [segment?.id]);
  
  // Debounced update
  const handleContentChange = useCallback((value: string) => {
    setLocalContent(value);
    
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = setTimeout(() => {
      if (selectedSegmentId) {
        updateSegment(selectedSegmentId, { content: value });
      }
    }, 300);
  }, [selectedSegmentId, updateSegment]);
  
  const handleNameChange = useCallback((name: string) => {
    if (selectedSegmentId) {
      updateSegment(selectedSegmentId, { name });
    }
  }, [selectedSegmentId, updateSegment]);
  
  const handleSettingChange = useCallback(<K extends keyof Segment>(
    key: K,
    value: Segment[K]
  ) => {
    if (selectedSegmentId) {
      updateSegment(selectedSegmentId, { [key]: value });
    }
  }, [selectedSegmentId, updateSegment]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);
  
  if (!project || !segment) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)}>
        <div className="text-center text-muted-foreground">
          <Type size={48} className="mx-auto mb-4 opacity-50" />
          <p>Select a segment to edit</p>
        </div>
      </div>
    );
  }
  
  const characterCount = localContent.length;
  const wordCount = localContent.trim() ? localContent.trim().split(/\s+/).length : 0;
  
  return (
    <div className={cn('flex flex-col h-full overflow-hidden', className)}>
      {/* Header */}
      <div className="panel-header shrink-0">
        <div className="flex items-center gap-3 flex-1">
          <Input
            value={segment.name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="h-8 text-sm font-medium bg-transparent border-transparent hover:border-border focus:border-primary max-w-[200px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {wordCount} words · {characterCount.toLocaleString()} chars
          </span>
          {hasUnsavedChanges && (
            <Button
              size="sm"
              variant="ghost"
              onClick={saveCurrentProject}
              className="h-7 px-2"
            >
              <Save size={14} className="mr-1" />
              Save
            </Button>
          )}
        </div>
      </div>
      
      {/* Settings Bar */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-border bg-card/50 flex-wrap shrink-0">
        {/* Font Size */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Size</Label>
          <Select
            value={String(segment.fontSize)}
            onValueChange={(v) => handleSettingChange('fontSize', Number(v))}
          >
            <SelectTrigger className="h-7 w-20 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[24, 32, 40, 48, 56, 64, 72, 80, 96, 120].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}px
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Font Family */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Font</Label>
          <Select
            value={segment.fontFamily}
            onValueChange={(v) => handleSettingChange('fontFamily', v)}
          >
            <SelectTrigger className="h-7 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((font) => (
                <SelectItem key={font} value={font}>
                  {font}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Text Color */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Color</Label>
          <div className="flex gap-1">
            {TEXT_COLOR_OPTIONS.map((color) => (
              <button
                key={color.value}
                onClick={() => handleSettingChange('textColor', color.value)}
                className={cn(
                  'w-6 h-6 rounded border-2 transition-all',
                  segment.textColor === color.value
                    ? 'border-primary scale-110'
                    : 'border-transparent hover:border-muted'
                )}
                style={{ backgroundColor: color.hex }}
                title={color.label}
              />
            ))}
          </div>
        </div>
        
        {/* Speed */}
        <div className="flex items-center gap-2">
          <Gauge size={14} className="text-muted-foreground" />
          <Select
            value={String(segment.scrollSpeed)}
            onValueChange={(v) => handleSettingChange('scrollSpeed', Number(v))}
          >
            <SelectTrigger className="h-7 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPEED_PRESETS.map((speed) => (
                <SelectItem key={speed} value={String(speed)}>
                  {speed} px/s
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Mirror Toggle */}
        <Button
          variant={segment.mirror ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleSettingChange('mirror', !segment.mirror)}
          className="h-7 px-2"
        >
          <FlipHorizontal size={14} className="mr-1" />
          Mirror
        </Button>
      </div>
      
      {/* Text Editor */}
      <div className="flex-1 min-h-0 p-4 overflow-hidden">
        <textarea
          ref={textareaRef}
          value={localContent}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="Enter your teleprompter text here..."
          className="editor-textarea text-lg h-full"
          style={{
            fontSize: Math.min(segment.fontSize / 3, 24),
            fontFamily: segment.fontFamily,
          }}
          spellCheck
        />
      </div>
      
      {/* Footer Stats */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border text-xs text-muted-foreground shrink-0">
        <div className="flex items-center gap-4">
          <span>Scroll: {segment.scrollSpeed} px/s</span>
          <span>Est. duration: ~{Math.round((wordCount / 150) * 60)}s</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="kbd">Ctrl+S</kbd>
          <span>to save</span>
        </div>
      </div>
    </div>
  );
});

ContentEditor.displayName = 'ContentEditor';

export default ContentEditor;
