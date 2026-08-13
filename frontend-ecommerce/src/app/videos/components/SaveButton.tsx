'use client';

import { Bookmark } from 'lucide-react';
import { Video } from '@/types/video';
import { useVideoSave } from '@/hooks/video/useVideoSave';

function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

export function SaveButton({ video }: { video: Video }) {
  const { toggleSave, isToggling } = useVideoSave(video);

  return (
    <div className="flex shrink-0 flex-col items-center gap-0.5 sm:gap-1">
      <button
        type="button"
        onClick={toggleSave}
        disabled={isToggling}
        aria-label={video.isSaved ? 'Remove from saved videos' : 'Save video'}
        aria-pressed={video.isSaved}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:bg-white active:scale-95 sm:h-11 sm:w-11"
      >
        <Bookmark className={`h-4 w-4 sm:h-5 sm:w-5 ${video.isSaved ? 'fill-amber-500 text-amber-500' : 'text-neutral-800'}`} />
      </button>
      <span className="text-[10px] font-semibold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.5)] sm:text-xs">
        {formatCount(video.savesCount)}
      </span>
    </div>
  );
}
