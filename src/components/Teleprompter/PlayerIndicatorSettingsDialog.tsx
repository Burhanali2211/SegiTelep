import React, { memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { usePlayerIndicatorStore, PlayerIndicatorBehavior } from '@/store/playerIndicatorStore';
import { Eye, EyeOff, Clock, Palette } from 'lucide-react';

interface PlayerIndicatorSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PlayerIndicatorSettingsDialog = memo<PlayerIndicatorSettingsDialogProps>(({ open, onOpenChange }) => {
  const { settings, updateSettings } = usePlayerIndicatorStore();

  const behaviorOptions: { value: PlayerIndicatorBehavior; label: string; description: string }[] = [
    {
      value: 'auto-hide',
      label: 'Auto Hide',
      description: 'Controls hide automatically after a delay'
    },
    {
      value: 'show-on-hover',
      label: 'Show on Hover',
      description: 'Controls appear only when you hover over the player'
    },
    {
      value: 'always-show',
      label: 'Always Show',
      description: 'Controls are always visible during playback'
    },
  ];

  const presetColors = [
    { name: 'Dark', background: 'rgba(0, 0, 0, 0.9)', text: '#ffffff' },
    { name: 'Light', background: 'rgba(255, 255, 255, 0.9)', text: '#000000' },
    { name: 'Blue', background: 'rgba(59, 130, 246, 0.9)', text: '#ffffff' },
    { name: 'Green', background: 'rgba(34, 197, 94, 0.9)', text: '#ffffff' },
    { name: 'Red', background: 'rgba(239, 68, 68, 0.9)', text: '#ffffff' },
    { name: 'Purple', background: 'rgba(147, 51, 234, 0.9)', text: '#ffffff' },
  ];

  const applyColorPreset = (preset: typeof presetColors[0]) => {
    updateSettings({
      backgroundColor: preset.background,
      textColor: preset.text,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye size={20} />
            Player Indicator Settings
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Behavior Setting */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Indicator Behavior</Label>
            <Select
              value={settings.behavior}
              onValueChange={(value: PlayerIndicatorBehavior) =>
                updateSettings({ behavior: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {behaviorOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {option.description}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Auto-Hide Delay (only show for auto-hide behavior) */}
          {settings.behavior === 'auto-hide' && (
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Clock size={16} />
                Auto-Hide Delay: {settings.autoHideDelay / 1000}s
              </Label>
              <Slider
                value={[settings.autoHideDelay]}
                onValueChange={([value]) => updateSettings({ autoHideDelay: value })}
                min={1000}
                max={10000}
                step={500}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1s</span>
                <span>5s</span>
                <span>10s</span>
              </div>
            </div>
          )}

          {/* Color Settings */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Palette size={16} />
              Appearance
            </Label>
            
            {/* Color Presets */}
            <div className="grid grid-cols-3 gap-2">
              {presetColors.map((preset) => (
                <Button
                  key={preset.name}
                  variant="outline"
                  size="sm"
                  className="h-auto p-2 flex flex-col items-center gap-1"
                  onClick={() => applyColorPreset(preset)}
                >
                  <div
                    className="w-8 h-4 rounded border border-border"
                    style={{ backgroundColor: preset.background }}
                  />
                  <span className="text-xs">{preset.name}</span>
                </Button>
              ))}
            </div>

            {/* Custom Colors */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Background Color</Label>
                <Input
                  type="color"
                  value={settings.backgroundColor.replace(/rgba?\(([^)]+)\)/, '#000000')}
                  onChange={(e) => {
                    const hex = e.target.value;
                    const r = parseInt(hex.slice(1, 3), 16);
                    const g = parseInt(hex.slice(3, 5), 16);
                    const b = parseInt(hex.slice(5, 7), 16);
                    updateSettings({
                      backgroundColor: `rgba(${r}, ${g}, ${b}, ${settings.opacity})`,
                    });
                  }}
                  className="w-full h-8"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Text Color</Label>
                <Input
                  type="color"
                  value={settings.textColor}
                  onChange={(e) => updateSettings({ textColor: e.target.value })}
                  className="w-full h-8"
                />
              </div>
            </div>

            {/* Opacity Slider */}
            <div className="space-y-2">
              <Label className="text-xs">
                Opacity: {Math.round(settings.opacity * 100)}%
              </Label>
              <Slider
                value={[settings.opacity]}
                onValueChange={([value]) => {
                  const currentBg = settings.backgroundColor;
                  const rgbMatch = currentBg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                  if (rgbMatch) {
                    const [, r, g, b] = rgbMatch;
                    updateSettings({
                      backgroundColor: `rgba(${r}, ${g}, ${b}, ${value})`,
                      opacity: value,
                    });
                  }
                }}
                min={0.1}
                max={1}
                step={0.1}
                className="w-full"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Preview</Label>
            <div
              className="p-3 rounded text-sm"
              style={{
                backgroundColor: settings.backgroundColor,
                color: settings.textColor,
                opacity: settings.opacity,
              }}
            >
              <div className="flex items-center justify-between">
                <span>Current Segment: 1/10</span>
                <span>00:15 / 02:30</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={() => usePlayerIndicatorStore.getState().resetSettings()}
          >
            Reset to Default
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});

PlayerIndicatorSettingsDialog.displayName = 'PlayerIndicatorSettingsDialog';
