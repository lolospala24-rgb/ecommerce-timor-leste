'use client';

import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip } from '../ui/Tooltip';
import { cn } from '@/lib/utils';

interface BookmarkButtonProps {
  videoId: string;
  variant?: 'floating' | 'inline';
}

export function BookmarkButton({ videoId, variant = 'inline' }: BookmarkButtonProps) {
  const [isSaved, setIsSaved] = useState(false);
  const isFloating = variant === 'floating';

  const handleClick = () => setIsSaved(!isSaved);

  return (
    <Tooltip content={isSaved ? 'Unsave' : 'Save'}>
      <Button
        variant="ghost"
        size={isFloating ? 'icon' : 'default'}
        className={cn(
          'text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C]',
          isFloating && 'h-12 w-12 rounded-full',
          isSaved && 'text-[#6366F1] hover:text-[#6366F1] hover:bg-[#6366F1]/10'
        )}
        onClick={handleClick}
      >
        <Bookmark className={cn('h-5 w-5', isSaved && 'fill-[#6366F1]')} />
        {!isFloating && <span className="ml-2 text-sm">{isSaved ? 'Saved' : 'Save'}</span>}
      </Button>
    </Tooltip>
  );
}