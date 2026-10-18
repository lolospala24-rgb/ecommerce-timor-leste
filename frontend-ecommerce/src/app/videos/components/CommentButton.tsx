'use client';

import { MessageCircle } from 'lucide-react';
import { Video } from '@/types/video';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { formatCompactNumber as formatCount } from '@/lib/formatters';

interface CommentButtonProps {
  video: Video;
  onOpen: () => void;
}

export function CommentButton({ video, onOpen }: CommentButtonProps) {
  const { t } = useTranslation();

  return (
    <div className="flex shrink-0 flex-col items-center gap-0.5 sm:gap-1">
      <button
        type="button"
        onClick={onOpen}
        aria-label="Open comments"
        className="flex h-9 w-9 items-center justify-center rounded-full transition active:scale-95 lg:bg-white/90 lg:shadow-sm lg:backdrop-blur lg:hover:bg-white lg:h-11 lg:w-11"
      >
        <MessageCircle className="h-6 w-6 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] lg:h-5 lg:w-5 lg:text-neutral-800 lg:drop-shadow-none" />
      </button>
      <span className="text-[11px] font-semibold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.5)] lg:text-xs">
        <span className="lg:hidden">{t('video.comment')}</span>
        <span className="hidden lg:inline">{formatCount(video.commentsCount)}</span>
      </span>
    </div>
  );
}
