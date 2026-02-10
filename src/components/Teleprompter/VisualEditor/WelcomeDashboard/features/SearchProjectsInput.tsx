import React, { memo } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchProjectsInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

/** Mock: Search / filter recent projects */
export const SearchProjectsInput = memo<SearchProjectsInputProps>(
  ({ placeholder = 'Search projects...', value = '', onChange, className }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.value);
    };

    return (
      <div className={cn('relative flex-1 max-w-xs', className)}>
        <Search
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          className="h-8 pl-8 text-sm"
        />
      </div>
    );
  }
);

SearchProjectsInput.displayName = 'SearchProjectsInput';
