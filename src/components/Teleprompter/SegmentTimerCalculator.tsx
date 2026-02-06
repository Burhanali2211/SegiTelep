import React, { memo, useState, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Calculator, Clock, Type, Gauge, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SegmentTimerCalculatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyDuration?: (duration: number) => void;
}

export const SegmentTimerCalculator = memo<SegmentTimerCalculatorProps>(({
  open,
  onOpenChange,
  onApplyDuration,
}) => {
  const [wordCount, setWordCount] = useState(100);
  const [wordsPerMinute, setWordsPerMinute] = useState(150);
  const [customText, setCustomText] = useState('');
  
  // Calculate duration based on word count and WPM
  const calculatedDuration = useMemo(() => {
    const minutes = wordCount / wordsPerMinute;
    const totalSeconds = minutes * 60;
    return {
      minutes: Math.floor(totalSeconds / 60),
      seconds: Math.round(totalSeconds % 60),
      totalSeconds: Math.round(totalSeconds * 100) / 100,
    };
  }, [wordCount, wordsPerMinute]);
  
  // Count words from custom text
  const handleTextChange = useCallback((text: string) => {
    setCustomText(text);
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    setWordCount(words.length || 0);
  }, []);
  
  // Copy duration to clipboard
  const handleCopy = useCallback(() => {
    const formatted = `${calculatedDuration.minutes}:${calculatedDuration.seconds.toString().padStart(2, '0')}`;
    navigator.clipboard.writeText(formatted);
    toast.success('Duration copied to clipboard');
  }, [calculatedDuration]);
  
  // Apply duration to selected segment
  const handleApply = useCallback(() => {
    if (onApplyDuration) {
      onApplyDuration(calculatedDuration.totalSeconds);
      toast.success('Duration applied to segment');
      onOpenChange(false);
    }
  }, [onApplyDuration, calculatedDuration.totalSeconds, onOpenChange]);
  
  // Format time display
  const formatTime = (minutes: number, seconds: number) => {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator size={20} className="text-primary" />
            Segment Timer Calculator
          </DialogTitle>
          <DialogDescription>
            Calculate segment duration based on word count and reading speed
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Word Count Input */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Type size={14} />
              Word Count
            </Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={wordCount}
                onChange={(e) => setWordCount(Math.max(0, parseInt(e.target.value) || 0))}
                className="flex-1"
                min={0}
              />
              <span className="flex items-center text-sm text-muted-foreground">words</span>
            </div>
          </div>
          
          {/* Reading Speed Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Gauge size={14} />
                Reading Speed
              </Label>
              <span className="text-sm font-medium">{wordsPerMinute} WPM</span>
            </div>
            <Slider
              value={[wordsPerMinute]}
              onValueChange={([value]) => setWordsPerMinute(value)}
              min={80}
              max={250}
              step={5}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Slow (80)</span>
              <span>Normal (150)</span>
              <span>Fast (250)</span>
            </div>
          </div>
          
          <Separator />
          
          {/* Result Display */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-primary" />
                <span className="text-sm font-medium">Calculated Duration</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                <Copy size={14} className="mr-1" />
                Copy
              </Button>
            </div>
            <div className="mt-2 text-3xl font-bold text-primary tabular-nums">
              {formatTime(calculatedDuration.minutes, calculatedDuration.seconds)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {calculatedDuration.totalSeconds.toFixed(2)} seconds total
            </p>
          </div>
          
          <Separator />
          
          {/* Paste Text to Calculate */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Or paste text to auto-count words:
            </Label>
            <textarea
              value={customText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Paste your script text here..."
              className={cn(
                "w-full h-24 px-3 py-2 text-sm rounded-md border border-input",
                "bg-background resize-none",
                "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              )}
            />
          </div>
          
          {/* Quick Reference */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium">Reading Speed Guide:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Slow/Careful: 80-100 WPM</li>
              <li>Normal/Conversational: 120-150 WPM</li>
              <li>Fast/Energetic: 160-200 WPM</li>
              <li>Very Fast: 200+ WPM</li>
            </ul>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {onApplyDuration && (
            <Button onClick={handleApply}>
              Apply to Segment
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

SegmentTimerCalculator.displayName = 'SegmentTimerCalculator';
