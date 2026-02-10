import React from 'react';
import { cn } from '@/lib/utils';

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
  textSize?: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
}

export const AppLogo: React.FC<AppLogoProps> = ({ 
  size = 'md', 
  className,
  showText = true,
  textSize = 'base'
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  };

  const textSizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <img 
        src="/logo.png" 
        alt="SegiTelep Logo" 
        className={cn('object-contain', sizeClasses[size])}
      />
      {showText && (
        <span className={cn('font-semibold', textSizes[textSize])}>
          SegiTelep
        </span>
      )}
    </div>
  );
};

export default AppLogo;
