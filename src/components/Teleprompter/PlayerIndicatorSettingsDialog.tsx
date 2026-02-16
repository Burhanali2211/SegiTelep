import React, { memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Eye,
  EyeOff,
  Clock,
  Palette,
  Layout,
  MousePointer2,
  Monitor,
  Check,
  RotateCcw
} from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface PlayerIndicatorSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PlayerIndicatorSettingsDialog = memo<PlayerIndicatorSettingsDialogProps>(({ open, onOpenChange }) => {
  const { settings, updateSettings, resetSettings } = usePlayerIndicatorStore();

  const behaviorOptions: { value: PlayerIndicatorBehavior; label: string; icon: any; description: string }[] = [
    {
      value: 'auto-hide',
      label: 'Auto Hide',
      icon: Clock,
      description: 'Controls hide automatically after a delay'
    },
    {
      value: 'show-on-hover',
      label: 'Show on Hover',
      icon: MousePointer2,
      description: 'Controls appear only when you hover over the player'
    },
    {
      value: 'always-show',
      label: 'Always Show',
      icon: Eye,
      description: 'Controls are always visible during playback'
    },
  ];

  const presetColors = [
    { name: 'Midnight', background: 'rgba(9, 9, 11, 0.95)', text: '#ffffff', border: 'rgba(255, 255, 255, 0.1)' },
    { name: 'Crystal', background: 'rgba(255, 255, 255, 0.95)', text: '#09090b', border: 'rgba(0, 0, 0, 0.1)' },
    { name: 'Electric', background: 'rgba(37, 99, 235, 0.95)', text: '#ffffff', border: 'rgba(255, 255, 255, 0.2)' },
    { name: 'Emerald', background: 'rgba(5, 150, 105, 0.95)', text: '#ffffff', border: 'rgba(255, 255, 255, 0.2)' },
    { name: 'Crimson', background: 'rgba(220, 38, 38, 0.95)', text: '#ffffff', border: 'rgba(255, 255, 255, 0.2)' },
    { name: 'Galaxy', background: 'rgba(124, 58, 237, 0.95)', text: '#ffffff', border: 'rgba(255, 255, 255, 0.2)' },
  ];

  const applyColorPreset = (preset: typeof presetColors[0]) => {
    updateSettings({
      backgroundColor: preset.background,
      textColor: preset.text,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-2xl border-border/50 shadow-2xl overflow-hidden p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2.5 text-xl font-bold tracking-tight">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Layout size={20} />
            </div>
            Indicator HUD Settings
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground ml-10">
            Customize the look and behavior of the playback heads-up display.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="interaction" className="w-full">
          <div className="px-6">
            <TabsList className="w-full bg-muted/50 p-1 rounded-xl h-11 border border-border/50">
              <TabsTrigger value="interaction" className="flex-1 rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200">
                <MousePointer2 size={14} />
                <span className="text-xs font-semibold">Interaction</span>
              </TabsTrigger>
              <TabsTrigger value="design" className="flex-1 rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200">
                <Palette size={14} />
                <span className="text-xs font-semibold">Design</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="px-6 py-6 pb-2 min-h-[340px]">
            <TabsContent value="interaction" className="m-0 space-y-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-[13px] font-bold text-foreground/80 flex items-center gap-2">
                    Visibility Behavior
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-40">
                        <Monitor size={14} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>How HUD handles visibility</TooltipContent>
                  </Tooltip>
                </div>

                <div className="grid gap-2">
                  {behaviorOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => updateSettings({ behavior: option.value })}
                      className={cn(
                        "flex items-start gap-4 p-3 rounded-xl border text-left transition-all duration-200 group relative overflow-hidden",
                        settings.behavior === option.value
                          ? "bg-primary/5 border-primary shadow-[0_0_15px_-5px_rgba(25,118,210,0.2)]"
                          : "bg-muted/30 border-border/50 hover:bg-muted/50 hover:border-border"
                      )}
                    >
                      <div className={cn(
                        "p-2 rounded-lg transition-colors",
                        settings.behavior === option.value ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                      )}>
                        <option.icon size={16} />
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-sm font-bold flex items-center gap-2">
                          {option.label}
                          {settings.behavior === option.value && (
                            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug font-medium opacity-80">
                          {option.description}
                        </p>
                      </div>
                      {settings.behavior === option.value && (
                        <Check size={14} className="absolute right-3 top-3 text-primary animate-in zoom-in-50 duration-200" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {settings.behavior === 'auto-hide' && (
                <div className="space-y-4 p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 animate-in zoom-in-95">
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs font-bold text-orange-600/80 uppercase tracking-wider flex items-center gap-2">
                      <Clock size={12} />
                      Auto-Hide Delay
                    </Label>
                    <span className="text-sm font-mono font-bold text-orange-600">{(settings.autoHideDelay / 1000).toFixed(1)}s</span>
                  </div>
                  <Slider
                    value={[settings.autoHideDelay]}
                    onValueChange={([value]) => updateSettings({ autoHideDelay: value })}
                    min={500}
                    max={10000}
                    step={100}
                    className="py-2"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground/60 font-bold">
                    <span>INSTANT</span>
                    <span>5.0s</span>
                    <span>10.0s</span>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="design" className="m-0 space-y-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
              <div className="space-y-4">
                <Label className="text-[13px] font-bold text-foreground/80">Style Presets</Label>
                <div className="grid grid-cols-2 gap-2">
                  {presetColors.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => applyColorPreset(preset)}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-xl border transition-all duration-200 text-left hover:scale-[1.02] active:scale-[0.98]",
                        settings.backgroundColor === preset.background
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border/50 bg-background"
                      )}
                    >
                      <div
                        className="w-8 h-8 rounded-lg shadow-inner border"
                        style={{ backgroundColor: preset.background, borderColor: preset.border }}
                      />
                      <span className="text-xs font-bold">{preset.name}</span>
                      {settings.backgroundColor === preset.background && (
                        <div className="ml-auto mr-1 h-1.5 w-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 space-y-2">
                    <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Background</Label>
                    <div className="flex items-center gap-2 p-1.5 bg-muted/30 rounded-lg border border-border/50">
                      <Input
                        type="color"
                        value={settings.backgroundColor.replace(/rgba?\(([^)]+)\)/, (m, c) => {
                          const parts = c.split(',');
                          if (parts.length >= 3) {
                            const r = parseInt(parts[0]);
                            const g = parseInt(parts[1]);
                            const b = parseInt(parts[2]);
                            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                          }
                          return '#000000';
                        })}
                        onChange={(e) => {
                          const hex = e.target.value;
                          const r = parseInt(hex.slice(1, 3), 16);
                          const g = parseInt(hex.slice(3, 5), 16);
                          const b = parseInt(hex.slice(5, 7), 16);
                          updateSettings({
                            backgroundColor: `rgba(${r}, ${g}, ${b}, ${settings.opacity})`,
                          });
                        }}
                        className="w-8 h-8 p-0 border-none bg-transparent cursor-pointer rounded-md overflow-hidden"
                      />
                      <code className="text-[10px] font-mono text-muted-foreground font-bold">RGBA</code>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Text Color</Label>
                    <div className="flex items-center gap-2 p-1.5 bg-muted/30 rounded-lg border border-border/50">
                      <Input
                        type="color"
                        value={settings.textColor}
                        onChange={(e) => updateSettings({ textColor: e.target.value })}
                        className="w-8 h-8 p-0 border-none bg-transparent cursor-pointer rounded-md overflow-hidden"
                      />
                      <code className="text-[10px] font-mono text-muted-foreground font-bold uppercase">{settings.textColor}</code>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                    <span>UI OPACITY</span>
                    <span className="text-primary font-mono">{Math.round(settings.opacity * 100)}%</span>
                  </div>
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
                    min={0.2}
                    max={1}
                    step={0.05}
                  />
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Live HUD Preview */}
        <div className="p-6 bg-muted/20 border-t border-border/50 space-y-3">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Monitor size={12} />
            Live HUD Preview
          </Label>
          <div className="relative aspect-video rounded-xl bg-slate-950/80 overflow-hidden border border-white/5 shadow-2xl group/preview">
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20 group-hover/preview:opacity-40 transition-opacity">
              <Eye size={48} className="text-white" />
            </div>

            <div
              className="absolute bottom-3 left-3 right-3 p-3 rounded-lg border shadow-xl transition-all duration-300 transform-gpu"
              style={{
                backgroundColor: settings.backgroundColor,
                color: settings.textColor,
                borderColor: 'rgba(255,255,255,0.1)',
                boxShadow: `0 8px 32px -4px rgba(0,0,0,0.4)`
              }}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-6 w-1 rounded-full bg-primary/60 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-tight opacity-50 leading-none mb-1">Current Scene</p>
                    <p className="text-xs font-bold truncate leading-none mt-1">Introduction & Welcome</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Clock size={10} className="opacity-60" />
                    <span className="text-[11px] font-mono font-bold tracking-tighter">04:20</span>
                  </div>
                  <p className="text-[9px] font-bold opacity-40">REMAINING</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 bg-muted/40 border-t border-border/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => resetSettings()}
            className="text-xs font-bold gap-2 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw size={13} />
            RESET FACTORY
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            className="ml-auto h-9 px-6 text-xs font-bold rounded-lg bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
          >
            SAVE & CLOSE
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});

PlayerIndicatorSettingsDialog.displayName = 'PlayerIndicatorSettingsDialog';
