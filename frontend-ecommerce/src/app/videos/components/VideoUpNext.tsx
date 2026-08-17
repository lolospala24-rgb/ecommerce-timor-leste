'use client';

import Image from 'next/image';
import { Play } from 'lucide-react';
import { Video } from '@/types/video';
import { formatCompactNumber } from '@/lib/formatters';

interface VideoUpNextProps {
  videos: Video[];
  onSelect: (videoId: number) => void;
}

// Real "what's next in this feed" — the next few videos already loaded in
// the current tab's list (For You / Following / Trending), not a separate
// recommendation source. Selecting one scrolls the main feed to it rather
// than navigating away, so the snap-scroll/IntersectionObserver state in
// VideoFeed stays the single source of truth for what's playing.
export function VideoUpNext({ videos, onSelect }: VideoUpNextProps) {
  if (videos.length === 0) return null;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-neutral-900">Up next</h3>
      <div className="mt-3 space-y-2">
        {videos.map((video) => (
          <button
            key={video.id}
            type="button"
            onClick={() => onSelect(video.id)}
            className="flex w-full items-center gap-3 rounded-xl p-1.5 text-left transition hover:bg-neutral-50"
          >
            <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
              {video.thumbnailUrl ? (
                <Image src={video.thumbnailUrl} alt={video.title} fill sizes="40px" className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-neutral-300">
                  <Play className="h-4 w-4" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-xs font-medium leading-snug text-neutral-800">{video.title}</p>
              <p className="mt-0.5 text-xs text-neutral-400">
                {video.product?.seller?.storeName ?? 'E-Commerce'} · {formatCompactNumber(video.views)} views
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
