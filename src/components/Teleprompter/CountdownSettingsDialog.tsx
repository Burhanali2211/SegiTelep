import React, { memo, useState, useEffect } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Timer, Volume2, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

const COUNTDOWN_SETTINGS_KEY = 'teleprompter-countdown-settings';

export interface CountdownSettings {
  enabled: boolean;
  duration: number; // seconds
  playSound: boolean;
  showPreview: boolean;
}

const DEFAULT_SETTINGS: CountdownSettings = {
  enabled: true,
  duration: 3,
  playSound: false,
  showPreview: true,
};

// Get countdown settings from localStorage
export function getCountdownSettings(): CountdownSettings {
  try {
    const stored = localStorage.getItem(COUNTDOWN_SETTINGS_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Failed to parse countdown settings:', e);
  }
  return DEFAULT_SETTINGS;
}

// Save countdown settings to localStorage
export function saveCountdownSettings(settings: CountdownSettings): void {
  localStorage.setItem(COUNTDOWN_SETTINGS_KEY, JSON.stringify(settings));
}

interface CountdownSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CountdownSettingsDialog = memo<CountdownSettingsDialogProps>(({ open, onOpenChange }) => {
  const [settings, setSettings] = useState<CountdownSettings>(getCountdownSettings);
  
  // Load settings when dialog opens
  useEffect(() => {
    if (open) {
      setSettings(getCountdownSettings());
    }
  }, [open]);
  
  const handleSave = () => {
    saveCountdownSettings(settings);
    onOpenChange(false);
  };
  
  const updateSetting = <K extends keyof CountdownSettings>(key: K, value: CountdownSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer size={20} className="text-primary" />
            Countdown Settings
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Enable Countdown */}
          <div className="flex items-center gap-3">
            <Checkbox
              id="countdown-enabled"
              checked={settings.enabled}
              onCheckedChange={(checked) => updateSetting('enabled', !!checked)}
            />
            <Label htmlFor="countdown-enabled" className="text-sm cursor-pointer">
              Enable countdown before playback
            </Label>
          </div>
          
          {/* Duration */}
          <div className={cn('space-y-2', !settings.enabled && 'opacity-50 pointer-events-none')}>
            <Label htmlFor="countdown-duration" className="text-sm">
              Duration (seconds)
            </Label>
            <Input
              id="countdown-duration"
              type="number"
              min={1}
              max={10}
              value={settings.duration}
              onChange={(e) => updateSetting('duration', Math.max(1, Math.min(10, parseInt(e.target.value) || 3)))}
              className="h-9 w-24"
            />
            <p className="text-[10px] text-muted-foreground">
              Countdown displays 1-10 seconds before playback starts
            </p>
          </div>
          
          {/* Play Sound */}
          <div className={cn(
            'flex items-center gap-3',
            !settings.enabled && 'opacity-50 pointer-events-none'
          )}>
            <Checkbox
              id="countdown-sound"
              checked={settings.playSound}
              onCheckedChange={(checked) => updateSetting('playSound', !!checked)}
              disabled={!settings.enabled}
            />
            <Label htmlFor="countdown-sound" className="text-sm cursor-pointer flex items-center gap-2">
              <Volume2 size={14} className="text-muted-foreground" />
              Play sound on countdown
            </Label>
          </div>
          
          {/* Show Preview */}
          <div className={cn(
            'flex items-center gap-3',
            !settings.enabled && 'opacity-50 pointer-events-none'
          )}>
            <Checkbox
              id="countdown-preview"
              checked={settings.showPreview}
              onCheckedChange={(checked) => updateSetting('showPreview', !!checked)}
              disabled={!settings.enabled}
            />
            <Label htmlFor="countdown-preview" className="text-sm cursor-pointer flex items-center gap-2">
              <Eye size={14} className="text-muted-foreground" />
              Show segment preview during countdown
            </Label>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

CountdownSettingsDialog.displayName = 'CountdownSettingsDialog';
