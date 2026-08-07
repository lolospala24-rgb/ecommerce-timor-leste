'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip } from '../ui/Tooltip';
import { useVideo } from '@/hooks/useVideo';
import { cn } from '@/lib/utils';

interface LikeButtonProps {
  videoId: string;
  initialLikes?: number;
  variant?: 'floating' | 'inline';
  size?: 'default' | 'lg';
}

export function LikeButton({ videoId, initialLikes = 0, variant = 'inline', size = 'default' }: LikeButtonProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(initialLikes);
  const { toggleLike, isLiking } = useVideo(videoId);
  const isFloating = variant === 'floating';
  const isLarge = size === 'lg';

  const handleClick = async () => {
    const newState = !isLiked;
    setIsLiked(newState);
    setLikes(prev => newState ? prev + 1 : prev - 1);
    await toggleLike();
  };

  return (
    <div className="flex flex-col items-center">
      <Tooltip content={isLiked ? 'Unlike' : 'Like'}>
        <Button
          variant="ghost"
          size={isFloating ? 'icon' : 'default'}
          className={cn(
            'transition-all',
            isFloating ? 'h-12 w-12 rounded-full' : 'px-4',
            isLiked
              ? 'text-[#FF3B5C] hover:text-[#FF3B5C] hover:bg-[#FF3B5C]/10'
              : 'text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C]'
          )}
          onClick={handleClick}
          disabled={isLiking}
        >
          <Heart className={cn(isLarge ? 'h-6 w-6' : 'h-5 w-5', isLiked && 'fill-[#FF3B5C]')} />
          {!isFloating && <span className="ml-2 text-sm">{likes > 0 ? likes : 'Like'}</span>}
        </Button>
      </Tooltip>
      {isFloating && likes > 0 && (
        <span className="text-[10px] text-[#A3A3A3]">{likes}</span>
      )}
    </div>
  );
}