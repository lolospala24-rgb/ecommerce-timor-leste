'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';
import { Video } from '@/types/video';
import { useVideoLike } from '@/hooks/video/useVideoLike';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { formatCompactNumber as formatCount } from '@/lib/formatters';

export function LikeButton({ video }: { video: Video }) {
  const { toggleLike, isToggling } = useVideoLike(video);
  const { t } = useTranslation();

  return (
    <div className="flex shrink-0 flex-col items-center gap-0.5 sm:gap-1">
      <button
        type="button"
        onClick={toggleLike}
        disabled={isToggling}
        aria-label={video.isLiked ? 'Unlike video' : 'Like video'}
        aria-pressed={video.isLiked}
        className="flex h-9 w-9 items-center justify-center rounded-full transition active:scale-95 lg:bg-white/90 lg:shadow-sm lg:backdrop-blur lg:hover:bg-white lg:h-11 lg:w-11"
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
              className={`h-6 w-6 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] lg:h-5 lg:w-5 lg:drop-shadow-none ${
                video.isLiked ? 'fill-rose-600 text-rose-600' : 'text-white lg:text-neutral-800'
              }`}
            />
          </motion.span>
        </AnimatePresence>
      </button>
      <span className="text-[11px] font-semibold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.5)] lg:text-xs">
        <span className="lg:hidden">{t('video.like')}</span>
        <span className="hidden lg:inline">{formatCount(video.likes)}</span>
      </span>
    </div>
  );
}
