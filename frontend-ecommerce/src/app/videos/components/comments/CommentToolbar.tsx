'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Filter, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommentToolbarProps {
  sortBy: 'recent' | 'popular' | 'oldest';
  onSortChange: (sort: 'recent' | 'popular' | 'oldest') => void;
  totalComments: number;
  className?: string;
}

const sortOptions = [
  { value: 'recent', label: 'Most Recent' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'oldest', label: 'Oldest First' },
] as const;

export function CommentToolbar({
  sortBy,
  onSortChange,
  totalComments,
  className,
}: CommentToolbarProps) {
  const currentLabel = sortOptions.find((s) => s.value === sortBy)?.label || 'Sort';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-sm text-[#A3A3A3]">
        {totalComments} {totalComments === 1 ? 'comment' : 'comments'}
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C] gap-1.5"
          >
            <Filter className="h-3.5 w-3.5" />
            <span className="text-xs">{currentLabel}</span>
            <ArrowUpDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-44 bg-[#151515] border-[rgba(255,255,255,0.08)] text-white"
        >
          {sortOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onSortChange(option.value)}
              className={cn(
                'cursor-pointer gap-2',
                sortBy === option.value
                  ? 'text-[#6366F1] bg-[#6366F1]/10'
                  : 'hover:bg-[#1C1C1C]'
              )}
            >
              {option.label}
              {sortBy === option.value && (
                <span className="ml-auto text-[10px] text-[#6366F1]">✓</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}