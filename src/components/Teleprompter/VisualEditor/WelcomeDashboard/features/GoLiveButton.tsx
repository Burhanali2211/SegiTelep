import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';

interface GoLiveButtonProps {
    className?: string;
    onClick: (e: React.MouseEvent) => void;
    variant?: 'outline' | 'default' | 'ghost' | 'secondary';
    size?: 'sm' | 'default' | 'icon';
}

export const GoLiveButton = memo<GoLiveButtonProps>(({
    className,
    onClick,
    variant = 'default',
    size = 'sm'
}) => {
    return (
        <Button
            variant={variant}
            size={size}
            className={className}
            onClick={onClick}
        >
            <Play size={14} className="mr-1.5 fill-current" />
            Go Live
        </Button>
    );
});

GoLiveButton.displayName = 'GoLiveButton';
