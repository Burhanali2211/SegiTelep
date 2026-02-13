import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowDownAZ } from 'lucide-react';
import { toast } from 'sonner';

export type SortOption = 'recent' | 'name' | 'modified';

interface SortProjectsDropdownProps {
  value?: SortOption;
  onSort?: (option: SortOption) => void;
  className?: string;
}

/** Mock: Sort projects by date, name, etc. */
export const SortProjectsDropdown = memo<SortProjectsDropdownProps>(
  ({ value = 'recent', onSort, className }) => {
    const handleSelect = (option: SortOption) => {
      onSort?.(option);
    };

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className={className}>
            <ArrowDownAZ size={14} className="mr-1" />
            Sort
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleSelect('recent')}>
            Most recent
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleSelect('name')}>
            Name A–Z
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleSelect('modified')}>
            Last modified
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
);

SortProjectsDropdown.displayName = 'SortProjectsDropdown';
