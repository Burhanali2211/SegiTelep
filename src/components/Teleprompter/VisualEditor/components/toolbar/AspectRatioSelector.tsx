import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Settings2, Hash } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useVisualEditorState } from '@/components/Teleprompter/VisualEditor/useVisualEditorState';
import { ASPECT_RATIO_PRESETS } from '@/components/Teleprompter/VisualEditor/constants/aspectRatioPresets';
import { cn } from '@/lib/utils';

export const AspectRatioSelector = memo(({ className }: { className?: string }) => {
    const aspectRatioConstraint = useVisualEditorState((s) => s.aspectRatioConstraint);
    const customAspectRatio = useVisualEditorState((s) => s.customAspectRatio);
    const setAspectRatioConstraint = useVisualEditorState((s) => s.setAspectRatioConstraint);
    const setCustomAspectRatio = useVisualEditorState((s) => s.setCustomAspectRatio);

    const activePreset = ASPECT_RATIO_PRESETS.find(p => p.value === (aspectRatioConstraint || 'free'));
    const ActiveIcon = activePreset?.icon || Settings2;

    return (
        <div className={cn("flex items-center gap-1.5", className)}>
            <div className="flex items-center gap-1 bg-background/50 border border-input/40 rounded-full p-0.5 backdrop-blur-md shadow-sm">
                <Select
                    value={aspectRatioConstraint || 'free'}
                    onValueChange={(val) => setAspectRatioConstraint(val === 'free' ? null : val)}
                >
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <SelectTrigger className="h-8 min-w-[110px] border-0 bg-transparent focus:ring-0 focus:ring-offset-0 px-3 text-xs font-semibold gap-2 hover:bg-accent/20 rounded-full shadow-none transition-all">
                                <ActiveIcon size={14} className="shrink-0 text-primary" />
                                <SelectValue placeholder="Ratio" />
                            </SelectTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs font-medium">
                            Lock Aspect Ratio
                        </TooltipContent>
                    </Tooltip>

                    <SelectContent align="start" className="w-[280px] p-2 rounded-2xl border-border/40 shadow-2xl bg-popover/95 backdrop-blur-xl">
                        <div className="px-2 py-1.5 mb-1">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Canvas Aspect Ratio</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-1">
                            {ASPECT_RATIO_PRESETS.map((preset) => {
                                const Icon = preset.icon;
                                return (
                                    <SelectItem
                                        key={preset.value}
                                        value={preset.value}
                                        className="text-xs py-2 pl-3 pr-10 cursor-pointer focus:bg-primary/10 rounded-xl transition-colors group [&>span:first-of-type]:left-auto [&>span:first-of-type]:right-3"
                                    >
                                        <div className="flex items-center gap-3 w-full">
                                            <div className="w-8 h-8 rounded-lg bg-muted/40 flex items-center justify-center group-focus:bg-primary/20 transition-colors">
                                                <Icon size={16} className="text-muted-foreground group-focus:text-primary" />
                                            </div>
                                            <div className="flex flex-col flex-1">
                                                <span className="font-bold text-foreground leading-tight">{preset.label}</span>
                                                <span className="text-[10px] text-muted-foreground leading-tight">{preset.description}</span>
                                            </div>
                                        </div>
                                    </SelectItem>

                                );
                            })}
                        </div>
                    </SelectContent>
                </Select>

                {aspectRatioConstraint === 'custom' && (
                    <>
                        <div className="w-px h-4 bg-border/40 mx-0.5" />
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-3 rounded-full text-[11px] font-mono font-bold hover:bg-primary/10 hover:text-primary transition-all text-muted-foreground"
                                >
                                    {customAspectRatio.width}:{customAspectRatio.height}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-4 rounded-2xl border-border/40 shadow-2xl bg-popover/95 backdrop-blur-xl" align="end">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Hash size={14} className="text-primary" />
                                            <p className="text-xs font-bold text-foreground">Custom Ratio</p>
                                        </div>
                                        <span className="text-[10px] text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded">W:H</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 space-y-1">
                                            <Input
                                                type="number"
                                                value={customAspectRatio.width}
                                                onChange={(e) => setCustomAspectRatio({ ...customAspectRatio, width: Math.max(1, parseInt(e.target.value) || 1) })}
                                                className="h-9 text-xs text-center font-mono font-bold rounded-xl bg-background/50 border-border/50 focus-visible:ring-primary/30"
                                                min={1}
                                            />
                                        </div>
                                        <span className="text-muted-foreground/30 text-xs font-black">:</span>
                                        <div className="flex-1 space-y-1">
                                            <Input
                                                type="number"
                                                value={customAspectRatio.height}
                                                onChange={(e) => setCustomAspectRatio({ ...customAspectRatio, height: Math.max(1, parseInt(e.target.value) || 1) })}
                                                className="h-9 text-xs text-center font-mono font-bold rounded-xl bg-background/50 border-border/50 focus-visible:ring-primary/30"
                                                min={1}
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground text-center">Enter width and height proportions</p>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </>
                )}
            </div>
        </div>
    );
});

AspectRatioSelector.displayName = 'AspectRatioSelector';

