'use client';

import { Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Video } from '@/types/video';
import { videoService } from '@/services/video.service';
import { formatCompactNumber as formatCount } from '@/lib/formatters';

export function ShareButton({ video }: { video: Video }) {
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
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:bg-white active:scale-95 sm:h-11 sm:w-11"
      >
        <Share2 className="h-4 w-4 text-neutral-800 sm:h-5 sm:w-5" />
      </button>
      <span className="text-[10px] font-semibold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.5)] sm:text-xs">
        {formatCount(video.shares)}
      </span>
    </div>
  );
}
