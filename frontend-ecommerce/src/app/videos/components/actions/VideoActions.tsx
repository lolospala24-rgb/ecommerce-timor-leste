'use client';

import { Video } from '@/types/video';
import { LikeButton } from './LikeButton';
import { ShareButton } from './ShareButton';
import { BookmarkButton } from './BookmarkButton';
import { WishlistButton } from './WishlistButton';
import { CartButton } from './CartButton';
import { MessageCircle, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip } from '../ui/Tooltip';
import { cn } from '@/lib/utils';

interface VideoActionsProps {
  video: Video;
  variant?: 'floating' | 'inline';
  onCommentClick?: () => void;
  className?: string;
}

export function VideoActions({
  video,
  variant = 'inline',
  onCommentClick,
  className,
}: VideoActionsProps) {
  const isFloating = variant === 'floating';

  return (
    <div
      className={cn(
        'flex',
        isFloating
          ? 'flex-col items-center gap-4'
          : 'flex-row items-center gap-6 py-4 border-t border-[rgba(255,255,255,0.08)]',
        className
      )}
    >
      <LikeButton videoId={video.id} initialLikes={video.likes} variant={variant} />
      <Tooltip content={`${video.comments} Comments`}>
        <Button
          variant="ghost"
          size={isFloating ? 'icon' : 'default'}
          className={cn(
            'text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C]',
            isFloating && 'h-12 w-12 rounded-full relative'
          )}
          onClick={onCommentClick}
        >
          <MessageCircle className="h-5 w-5" />
          {!isFloating && <span className="ml-2 text-sm">{video.comments}</span>}
          {isFloating && video.comments > 0 && (
            <span className="absolute -bottom-1 text-[10px] text-[#A3A3A3]">{video.comments}</span>
          )}
        </Button>
      </Tooltip>
      <ShareButton videoId={video.id} initialShares={video.shares} variant={variant} />
      <BookmarkButton videoId={video.id} variant={variant} />
      <WishlistButton videoId={video.id} variant={variant} />
      <CartButton videoId={video.id} variant={variant} />

      {!isFloating && (
        <div className="flex-1 flex justify-end">
          <Button variant="ghost" size="icon" className="text-[#A3A3A3] hover:text-white">
            <Flag className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}