import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingProps {
    className?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    variant?: 'spinner' | 'fullscreen' | 'overlay' | 'inline';
    text?: string;
}

export const Loading: React.FC<LoadingProps> = ({
    className,
    size = 'md',
    variant = 'spinner',
    text,
}) => {
    const sizeClasses = {
        xs: 'w-3 h-3',
        sm: 'w-4 h-4 text-xs',
        md: 'w-6 h-6 text-sm',
        lg: 'w-8 h-8 text-base',
        xl: 'w-12 h-12 text-lg',
    };

    const loader = (
        <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
            <div className="relative flex items-center justify-center">
                {/* Ambient glow effect for premium feel */}
                {(variant === 'fullscreen' || variant === 'overlay' || size === 'xl' || size === 'lg') && (
                    <div className={cn(
                        "absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse",
                        size === 'xl' ? 'scale-150' : 'scale-125'
                    )} />
                )}
                <Loader2 className={cn(
                    "animate-spin text-primary relative z-10",
                    sizeClasses[size]
                )} />
            </div>
            {text && (
                <p className={cn(
                    "text-muted-foreground font-medium tracking-wide animate-pulse",
                    size === 'xl' || size === 'lg' ? 'text-lg' : 'text-sm'
                )}>
                    {text}
                </p>
            )}
        </div>
    );

    if (variant === 'fullscreen') {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md">
                {loader}
            </div>
        );
    }

    if (variant === 'overlay') {
        return (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                {loader}
            </div>
        );
    }

    if (variant === 'inline') {
        return (
            <div className={cn("inline-flex items-center gap-2", className)}>
                <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
                {text && <span className="text-muted-foreground font-medium">{text}</span>}
            </div>
        )
    }

    return loader;
};

Loading.displayName = 'Loading';
