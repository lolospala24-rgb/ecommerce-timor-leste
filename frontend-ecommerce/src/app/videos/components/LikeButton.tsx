'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';
import { Video } from '@/types/video';
import { useVideoLike } from '@/hooks/video/useVideoLike';

function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

export function LikeButton({ video }: { video: Video }) {
  const { toggleLike, isToggling } = useVideoLike(video);

  return (
    <div className="flex shrink-0 flex-col items-center gap-0.5 sm:gap-1">
      <button
        type="button"
        onClick={toggleLike}
        disabled={isToggling}
        aria-label={video.isLiked ? 'Unlike video' : 'Like video'}
        aria-pressed={video.isLiked}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:bg-white active:scale-95 sm:h-11 sm:w-11"
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.span
            key={video.isLiked ? 'liked' : 'unliked'}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Heart
              className={`h-4 w-4 sm:h-5 sm:w-5 ${video.isLiked ? 'fill-rose-600 text-rose-600' : 'text-neutral-800'}`}
            />
          </motion.span>
        </AnimatePresence>
      </button>
      <span className="text-[10px] font-semibold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.5)] sm:text-xs">
        {formatCount(video.likes)}
      </span>
    </div>
  );
}
