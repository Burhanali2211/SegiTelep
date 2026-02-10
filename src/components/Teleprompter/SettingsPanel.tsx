import React, { memo, useCallback, useState, useEffect } from 'react';
import { useTeleprompterStore } from '@/store/teleprompterStore';
import { FONT_OPTIONS, TEXT_COLOR_OPTIONS, SPEED_PRESETS } from '@/types/teleprompter.types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Settings,
  Palette,
  Type,
  Gauge,
  Monitor,
  Eye,
  Timer,
  Volume2,
} from 'lucide-react';
import { getCountdownSettings, saveCountdownSettings, CountdownSettings } from '@/components/Teleprompter/CountdownSettingsDialog';

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SettingsPanel = memo<SettingsPanelProps>(({ open, onOpenChange }) => {
  const project = useTeleprompterStore((s) => s.project);
  const updateSettings = useTeleprompterStore((s) => s.updateSettings);
  const [countdownSettings, setCountdownSettings] = useState<CountdownSettings>(getCountdownSettings());

  // Load countdown settings when dialog opens
  useEffect(() => {
    if (open) {
      setCountdownSettings(getCountdownSettings());
    }
  }, [open]);

  const handleSettingChange = useCallback(
    <K extends keyof NonNullable<typeof project>['settings']>(
      key: K,
      value: NonNullable<typeof project>['settings'][K]
    ) => {
      updateSettings({ [key]: value });
    },
    [updateSettings]
  );

  const updateCountdownSetting = useCallback(
    <K extends keyof CountdownSettings>(
      key: K,
      value: CountdownSettings[K]
    ) => {
      const newSettings = { ...countdownSettings, [key]: value };
      setCountdownSettings(newSettings);
      saveCountdownSettings(newSettings);
    },
    [countdownSettings]
  );

  if (!project) return null;

  const { settings } = project;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings size={20} />
            Project Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="defaults" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="defaults">Defaults</TabsTrigger>
            <TabsTrigger value="display">Display</TabsTrigger>
            <TabsTrigger value="playback">Playback</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            {/* Default Segment Settings */}
            <TabsContent value="defaults" className="space-y-6 m-0">
              <div className="space-y-4">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Type size={16} />
                  Typography Defaults
                </h3>

                <div className="grid gap-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Default Font Size</Label>
                    <Select
                      value={String(settings.defaultFontSize)}
                      onValueChange={(v) =>
                        handleSettingChange('defaultFontSize', Number(v))
                      }
                    >
                      <SelectTrigger className="w-32">
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

                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Default Font Family</Label>
                    <Select
                      value={settings.defaultFontFamily}
                      onValueChange={(v) => handleSettingChange('defaultFontFamily', v)}
                    >
                      <SelectTrigger className="w-40">
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

                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Default Text Color</Label>
                    <div className="flex gap-1">
                      {TEXT_COLOR_OPTIONS.map((color) => (
                        <button
                          key={color.value}
                          onClick={() =>
                            handleSettingChange('defaultTextColor', color.value)
                          }
                          className={`w-8 h-8 rounded border-2 transition-all ${
                            settings.defaultTextColor === color.value
                              ? 'border-primary scale-110'
                              : 'border-transparent hover:border-muted'
                          }`}
                          style={{ backgroundColor: color.hex }}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Default Line Height</Label>
                    <div className="flex items-center gap-3 w-48">
                      <Slider
                        value={[settings.defaultLineHeight]}
                        onValueChange={([v]) => handleSettingChange('defaultLineHeight', v)}
                        min={1.2}
                        max={3}
                        step={0.1}
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground w-10 text-right">
                        {settings.defaultLineHeight.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Gauge size={16} />
                  Speed Defaults
                </h3>

                <div className="flex items-center justify-between">
                  <Label className="text-sm">Default Scroll Speed</Label>
                  <Select
                    value={String(settings.defaultScrollSpeed)}
                    onValueChange={(v) =>
                      handleSettingChange('defaultScrollSpeed', Number(v))
                    }
                  >
                    <SelectTrigger className="w-32">
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
              </div>
            </TabsContent>

            {/* Display Settings */}
            <TabsContent value="display" className="space-y-6 m-0">
              <div className="space-y-4">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Monitor size={16} />
                  Display Options
                </h3>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Mirror Mode</Label>
                    <p className="text-xs text-muted-foreground">
                      Flip display horizontally for beam splitter use
                    </p>
                  </div>
                  <Switch
                    checked={settings.mirrorMode}
                    onCheckedChange={(v) => handleSettingChange('mirrorMode', v)}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Eye size={16} />
                  Focus Guide
                </h3>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Show Guide Line</Label>
                    <p className="text-xs text-muted-foreground">
                      Display horizontal guide for reading focus
                    </p>
                  </div>
                  <Switch
                    checked={settings.showGuide}
                    onCheckedChange={(v) => handleSettingChange('showGuide', v)}
                  />
                </div>

                {settings.showGuide && (
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Guide Position</Label>
                    <div className="flex items-center gap-3 w-48">
                      <Slider
                        value={[settings.guidePosition]}
                        onValueChange={([v]) => handleSettingChange('guidePosition', v)}
                        min={10}
                        max={90}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground w-10 text-right">
                        {settings.guidePosition}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Playback Settings */}
            <TabsContent value="playback" className="space-y-6 m-0">
              <div className="space-y-4">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Timer size={16} />
                  Countdown Settings
                </h3>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Enable countdown before playback</Label>
                    <p className="text-xs text-muted-foreground">
                      Show countdown timer before starting playback
                    </p>
                  </div>
                  <Switch
                    checked={countdownSettings.enabled}
                    onCheckedChange={(v) => updateCountdownSetting('enabled', v)}
                  />
                </div>

                {countdownSettings.enabled && (
                  <>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Duration (seconds)</Label>
                      <div className="flex items-center gap-2 w-32">
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={countdownSettings.duration}
                          onChange={(e) => updateCountdownSetting('duration', Math.max(1, Math.min(10, parseInt(e.target.value) || 3)))}
                          className="h-8 w-16"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Play sound on countdown</Label>
                        <p className="text-xs text-muted-foreground">
                          Play beep sound during countdown
                        </p>
                      </div>
                      <Switch
                        checked={countdownSettings.playSound}
                        onCheckedChange={(v) => updateCountdownSetting('playSound', v)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Show segment preview</Label>
                        <p className="text-xs text-muted-foreground">
                          Show first segment during countdown
                        </p>
                      </div>
                      <Switch
                        checked={countdownSettings.showPreview}
                        onCheckedChange={(v) => updateCountdownSetting('showPreview', v)}
                      />
                    </div>
                  </>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Eye size={16} />
                  Control Visibility
                </h3>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Auto-hide Controls</Label>
                    <p className="text-xs text-muted-foreground">
                      Hide playback controls in fullscreen mode
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoHideControls}
                    onCheckedChange={(v) => handleSettingChange('autoHideControls', v)}
                  />
                </div>

                {settings.autoHideControls && (
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Hide Delay</Label>
                    <Select
                      value={String(settings.controlsHideDelay)}
                      onValueChange={(v) =>
                        handleSettingChange('controlsHideDelay', Number(v))
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1000">1 second</SelectItem>
                        <SelectItem value="2000">2 seconds</SelectItem>
                        <SelectItem value="3000">3 seconds</SelectItem>
                        <SelectItem value="5000">5 seconds</SelectItem>
                        <SelectItem value="10000">10 seconds</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
});

SettingsPanel.displayName = 'SettingsPanel';

export default SettingsPanel;
