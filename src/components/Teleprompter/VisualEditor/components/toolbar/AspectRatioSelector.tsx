import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { RectangleHorizontal } from 'lucide-react';
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

    return (
        <div className={cn("flex items-center gap-1.5", className)}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 bg-background/50 border border-input/50 rounded-full p-0.5 pl-2 backdrop-blur-sm hover:bg-accent/30 transition-colors">
                        <Select
                            value={aspectRatioConstraint || 'free'}
                            onValueChange={(val) => setAspectRatioConstraint(val === 'free' ? null : val)}
                        >
                            <SelectTrigger className="h-7 min-w-[85px] border-0 bg-transparent focus:ring-0 focus:ring-offset-0 px-2 text-xs font-medium gap-1.5 hover:bg-transparent shadow-none">
                                <RectangleHorizontal size={14} className="shrink-0 text-muted-foreground/70" />
                                <SelectValue placeholder="Ratio" />
                            </SelectTrigger>
                            <SelectContent align="end" className="w-[220px] rounded-xl border-border/50 shadow-xl bg-popover/95 backdrop-blur-xl">
                                {ASPECT_RATIO_PRESETS.map((preset) => (
                                    <SelectItem
                                        key={preset.value}
                                        value={preset.value}
                                        className="text-xs py-2.5 px-3 cursor-pointer focus:bg-accent/50 rounded-lg m-1"
                                    >
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-medium text-foreground">{preset.label}</span>
                                            <span className="text-[10px] text-muted-foreground">{preset.description}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {aspectRatioConstraint === 'custom' && (
                            <>
                                <div className="w-px h-4 bg-border/50" />
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-2.5 rounded-full text-[10px] font-mono hover:bg-accent/50 mr-0.5"
                                        >
                                            {customAspectRatio.width}:{customAspectRatio.height}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-48 p-3 rounded-xl border-border/50 shadow-xl bg-popover/95 backdrop-blur-xl" align="end">
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs font-semibold text-foreground">Custom Ratio</p>
                                                <span className="text-[10px] text-muted-foreground font-mono">W:H</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1">
                                                    <Input
                                                        type="number"
                                                        value={customAspectRatio.width}
                                                        onChange={(e) => setCustomAspectRatio({ ...customAspectRatio, width: Math.max(1, parseInt(e.target.value) || 1) })}
                                                        className="h-8 text-xs text-center font-mono rounded-lg bg-background/50"
                                                        min={1}
                                                    />
                                                </div>
                                                <span className="text-muted-foreground/50 text-xs font-bold">:</span>
                                                <div className="flex-1">
                                                    <Input
                                                        type="number"
                                                        value={customAspectRatio.height}
                                                        onChange={(e) => setCustomAspectRatio({ ...customAspectRatio, height: Math.max(1, parseInt(e.target.value) || 1) })}
                                                        className="h-8 text-xs text-center font-mono rounded-lg bg-background/50"
                                                        min={1}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </>
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs font-medium">
                    Set Aspect Ratio Constraint
                </TooltipContent>
            </Tooltip>
        </div>
    );
});

AspectRatioSelector.displayName = 'AspectRatioSelector';
