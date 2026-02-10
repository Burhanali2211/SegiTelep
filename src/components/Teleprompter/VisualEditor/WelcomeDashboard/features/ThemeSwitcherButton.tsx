import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ThemeSwitcherButtonProps {
  className?: string;
}

/** Enhanced theme switcher with better functionality */
export const ThemeSwitcherButton = memo<ThemeSwitcherButtonProps>(({ className }) => {
  const handleClick = () => {
    // Check current theme
    const isDark = document.documentElement.classList.contains('dark');
    
    // Toggle theme
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      toast.success('Switched to light theme');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      toast.success('Switched to dark theme');
    }
  };

  const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  const Icon = currentTheme === 'dark' ? Sun : Moon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn('h-10 w-10 hover:bg-muted/50 transition-colors', className)} 
          onClick={handleClick}
        >
          <Icon size={18} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        Switch to {currentTheme === 'dark' ? 'light' : 'dark'} theme
      </TooltipContent>
    </Tooltip>
  );
});

ThemeSwitcherButton.displayName = 'ThemeSwitcherButton';
