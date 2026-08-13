'use client';

import { MessageCircle } from 'lucide-react';
import { Video } from '@/types/video';

function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

interface CommentButtonProps {
  video: Video;
  onOpen: () => void;
}

export function CommentButton({ video, onOpen }: CommentButtonProps) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-0.5 sm:gap-1">
      <button
        type="button"
        onClick={onOpen}
        aria-label="Open comments"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:bg-white active:scale-95 sm:h-11 sm:w-11"
      >
        <MessageCircle className="h-4 w-4 text-neutral-800 sm:h-5 sm:w-5" />
      </button>
      <span className="text-[10px] font-semibold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.5)] sm:text-xs">
        {formatCount(video.commentsCount)}
      </span>
    </div>
  );
}
