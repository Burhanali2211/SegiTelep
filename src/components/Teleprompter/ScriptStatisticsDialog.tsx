import React, { memo, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTeleprompterStore } from '@/store/teleprompterStore';
import { useVisualEditorState } from '@/components/Teleprompter/VisualEditor/useVisualEditorState';
import {
  FileText,
  Type,
  Clock,
  Gauge,
  Image,
  Layers,
  Layout,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScriptStatisticsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sublabel?: string;
}

const StatItem = ({ icon, label, value, sublabel }: StatItemProps) => (
  <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/50">
    <div className="p-2 rounded-md bg-primary/10 text-primary">
      {icon}
    </div>
    <div className="flex-1">
      <p className="text-sm font-medium">{label}</p>
      {sublabel && <p className="text-[10px] text-muted-foreground">{sublabel}</p>}
    </div>
    <div className="text-lg font-semibold tabular-nums">
      {value}
    </div>
  </div>
);

export const ScriptStatisticsDialog = memo<ScriptStatisticsDialogProps>(({ open, onOpenChange }) => {
  const project = useTeleprompterStore((s) => s.project);
  const pages = useVisualEditorState((s) => s.pages);
  
  const stats = useMemo(() => {
    // Text mode statistics from teleprompter store
    const textSegments = project?.segments.filter(s => s.type === 'text') ?? [];
    const totalWords = textSegments.reduce((acc, seg) => {
      const words = (seg.content || '').trim().split(/\s+/).filter(w => w.length > 0);
      return acc + words.length;
    }, 0);
    
    const totalCharacters = textSegments.reduce((acc, seg) => {
      return acc + (seg.content || '').length;
    }, 0);
    
    // Average reading speed (words per minute)
    const avgWPM = 150; // Average reading speed
    const estimatedReadingMinutes = totalWords / avgWPM;
    const readingMinutes = Math.floor(estimatedReadingMinutes);
    const readingSeconds = Math.round((estimatedReadingMinutes - readingMinutes) * 60);
    
    // Visual mode statistics
    const visualSegments = pages.reduce((acc, p) => acc + p.segments.length, 0);
    const visibleVisualSegments = pages.reduce((acc, p) => acc + p.segments.filter(s => !s.isHidden).length, 0);
    const hiddenSegments = visualSegments - visibleVisualSegments;
    
    // Calculate total duration from visual segments
    const allVisualSegments = pages.flatMap(p => p.segments.filter(s => !s.isHidden));
    const maxEndTime = allVisualSegments.length > 0
      ? Math.max(...allVisualSegments.map(s => s.endTime))
      : 0;
    const durationMinutes = Math.floor(maxEndTime / 60);
    const durationSeconds = Math.round(maxEndTime % 60);
    const durationCentis = Math.round((maxEndTime % 1) * 100);
    
    return {
      // Text stats
      textSegmentCount: textSegments.length,
      totalWords,
      totalCharacters,
      readingTime: `${readingMinutes}:${readingSeconds.toString().padStart(2, '0')}`,
      avgWPM,
      
      // Visual stats
      pageCount: pages.length,
      visualSegmentCount: visualSegments,
      visibleSegmentCount: visibleVisualSegments,
      hiddenSegmentCount: hiddenSegments,
      totalDuration: `${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}.${durationCentis.toString().padStart(2, '0')}`,
      
      // Combined
      totalSegments: (project?.segments.length ?? 0) + visualSegments,
    };
  }, [project?.segments, pages]);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 size={20} className="text-primary" />
            Script Statistics
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          {/* Text Mode Stats */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Text Mode
            </h4>
            <div className="space-y-2">
              <StatItem
                icon={<FileText size={16} />}
                label="Text Segments"
                value={stats.textSegmentCount}
              />
              <StatItem
                icon={<Type size={16} />}
                label="Total Words"
                value={stats.totalWords.toLocaleString()}
                sublabel={`${stats.totalCharacters.toLocaleString()} characters`}
              />
              <StatItem
                icon={<Clock size={16} />}
                label="Est. Reading Time"
                value={stats.readingTime}
                sublabel={`at ${stats.avgWPM} wpm`}
              />
            </div>
          </div>
          
          {/* Visual Mode Stats */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Visual Mode
            </h4>
            <div className="space-y-2">
              <StatItem
                icon={<Layout size={16} />}
                label="Pages"
                value={stats.pageCount}
              />
              <StatItem
                icon={<Image size={16} />}
                label="Visual Segments"
                value={stats.visibleSegmentCount}
                sublabel={stats.hiddenSegmentCount > 0 ? `${stats.hiddenSegmentCount} hidden` : undefined}
              />
              <StatItem
                icon={<Clock size={16} />}
                label="Total Duration"
                value={stats.totalDuration}
              />
            </div>
          </div>
          
          {/* Summary */}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-primary/5">
              <span className="text-sm font-medium">Total Segments</span>
              <span className="text-xl font-bold text-primary">
                {stats.totalSegments}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

ScriptStatisticsDialog.displayName = 'ScriptStatisticsDialog';
