import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TutorialButtonProps {
  className?: string;
  variant?: 'default' | 'ghost' | 'outline';
}

/** Enhanced tutorial button with better functionality */
export const TutorialButton = memo<TutorialButtonProps>(({ className, variant = 'outline' }) => {
  const handleClick = () => {
    // Open tutorial modal or navigate to tutorial
    toast.success('Opening SegiTelep tutorial...');
    // Future: Open actual tutorial modal/video
    setTimeout(() => {
      window.open('https://github.com/Burhanali2211/segitelep#tutorial', '_blank');
    }, 500);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button 
          variant={variant} 
          size="sm" 
          className={cn('hover:bg-primary hover:text-primary-foreground transition-colors', className)} 
          onClick={handleClick}
        >
          <BookOpen size={14} className="mr-1.5" />
          Tutorial
        </Button>
      </TooltipTrigger>
      <TooltipContent>Interactive tutorial (5 min)</TooltipContent>
    </Tooltip>
  );
});

TutorialButton.displayName = 'TutorialButton';
