'use client';

import { forwardRef } from 'react';
import Image from 'next/image';
import { Video } from '@/types/video';

interface VideoFeedItemPlaceholderProps {
  video: Video;
}

// Stand-in for VideoFeedItem, rendered for videos outside the active
// viewing window in VideoFeed. Keeps the exact same outer wrapper (ref,
// data-video-id, sizing) so scroll-snap positions and the
// IntersectionObserver in VideoFeed don't shift when items enter/exit the
// window — only the expensive inner content (the <video> element, likes,
// comments, view-tracking) is swapped out for a static thumbnail, so a
// long infinite-scroll session doesn't keep dozens of <video> elements
// mounted at once.
export const VideoFeedItemPlaceholder = forwardRef<HTMLDivElement, VideoFeedItemPlaceholderProps>(
  function VideoFeedItemPlaceholder({ video }, ref) {
    return (
      <div
        ref={ref}
        data-video-id={video.id}
        className="flex h-full w-full shrink-0 snap-center items-center justify-center px-0 py-4 md:px-4"
      >
        <div className="relative h-full max-h-full w-full max-w-[420px] overflow-hidden rounded-none bg-neutral-100 shadow-xl md:rounded-2xl">
          {video.thumbnailUrl && (
            <Image src={video.thumbnailUrl} alt="" fill className="object-cover" sizes="420px" />
          )}
        </div>
      </div>
    );
  },
);
