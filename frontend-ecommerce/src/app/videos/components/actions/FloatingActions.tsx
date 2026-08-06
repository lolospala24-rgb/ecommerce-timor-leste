'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Video } from '@/types/video';
import { LikeButton } from './LikeButton';
import { ShareButton } from './ShareButton';
import { BookmarkButton } from './BookmarkButton';
import { WishlistButton } from './WishlistButton';
import { CartButton } from './CartButton';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FloatingActionsProps {
  video: Video;
  onCommentClick?: () => void;
}

export function FloatingActions({ video, onCommentClick }: FloatingActionsProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="absolute right-4 bottom-24 flex flex-col items-center gap-4 md:hidden"
      >
        {/* Like */}
        <LikeButton
          videoId={video.id}
          initialLikes={video.likes}
          variant="floating"
          size="lg"
        />

        {/* Comment */}
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C] transition-all duration-200 group relative"
          onClick={onCommentClick}
        >
          <MessageCircle className="h-6 w-6 transition-transform group-hover:scale-110" />
          {video.comments > 0 && (
            <span className="absolute -bottom-1 text-[10px] font-medium text-[#A3A3A3]">
              {video.comments > 999 ? '999+' : video.comments}
            </span>
          )}
        </Button>

        {/* Share */}
        <ShareButton
          videoId={video.id}
          initialShares={video.shares}
          variant="floating"
          size="lg"
        />

        {/* Bookmark */}
        <BookmarkButton
          videoId={video.id}
          variant="floating"
          size="lg"
        />

        {/* Wishlist */}
        <WishlistButton
          videoId={video.id}
          variant="floating"
          size="lg"
        />

        {/* Cart */}
        <CartButton
          videoId={video.id}
          variant="floating"
          size="lg"
        />
      </motion.div>
    </AnimatePresence>
  );
}