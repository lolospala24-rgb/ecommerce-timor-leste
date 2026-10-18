'use client';

import { Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Video } from '@/types/video';
import { videoService } from '@/services/video.service';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { formatCompactNumber as formatCount } from '@/lib/formatters';

export function ShareButton({ video }: { video: Video }) {
  const { t } = useTranslation();

  const handleShare = async () => {
    const url = `${window.location.origin}/videos/${video.id}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: video.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied');
      }
      videoService.share(video.id).catch(() => {});
    } catch {
      // User cancelled the native share sheet — not an error.
    }
  };

  return (
    <div className="flex shrink-0 flex-col items-center gap-0.5 sm:gap-1">
      <button
        type="button"
        onClick={handleShare}
        aria-label="Share video"
        className="flex h-9 w-9 items-center justify-center rounded-full transition active:scale-95 lg:bg-white/90 lg:shadow-sm lg:backdrop-blur lg:hover:bg-white lg:h-11 lg:w-11"
      >
        <Share2 className="h-6 w-6 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] lg:h-5 lg:w-5 lg:text-neutral-800 lg:drop-shadow-none" />
      </button>
      <span className="text-[11px] font-semibold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.5)] lg:text-xs">
        <span className="lg:hidden">{t('video.share')}</span>
        <span className="hidden lg:inline">{formatCount(video.shares)}</span>
      </span>
    </div>
  );
}
