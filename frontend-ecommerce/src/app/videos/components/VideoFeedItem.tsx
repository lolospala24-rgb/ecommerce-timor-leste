'use client';

import { forwardRef, useEffect, useRef, useState } from 'react';
import { Video } from '@/types/video';
import { videoService } from '@/services/video.service';
import { useVideoLike } from '@/hooks/video/useVideoLike';
import { VideoPlayer } from './VideoPlayer';
import { CreatorHeader } from './CreatorHeader';
import { VideoCaption } from './VideoCaption';
import { VideoActionsRail } from './VideoActionsRail';
import { ProductShoppingCard } from './ProductShoppingCard';
import { CommentDrawer } from './comments/CommentDrawer';

interface VideoFeedItemProps {
  video: Video;
  isActive: boolean;
}

export const VideoFeedItem = forwardRef<HTMLDivElement, VideoFeedItemProps>(function VideoFeedItem(
  { video, isActive },
  ref,
) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const hasRecordedView = useRef(false);
  const { like } = useVideoLike(video);

  useEffect(() => {
    if (isActive && !hasRecordedView.current) {
      hasRecordedView.current = true;
      videoService.recordView(video.id).catch(() => {});
    }
  }, [isActive, video.id]);

  return (
    <div
      ref={ref}
      data-video-id={video.id}
      className="flex h-full w-full shrink-0 snap-center items-center justify-center px-0 py-0 md:px-4 md:py-4"
    >
      <div className="relative h-full max-h-full w-full max-w-[420px] overflow-hidden rounded-none shadow-xl md:rounded-2xl">
        <VideoPlayer video={video} isActive={isActive} onDoubleTapLike={like} />

        {/* flex flex-col WITHOUT justify-between on purpose: when
            CreatorHeader's wrapper is `hidden` (display:none) below `lg`,
            it stops participating in the flexbox entirely, leaving only
            one flex child — and `justify-between` with a single child
            resolves to flex-start (there's no "between" left to
            distribute), which pinned the caption/rail block to the TOP of
            the overlay instead of the bottom. mt-auto on that block is the
            robust fix: it anchors itself (and everything after it) to the
            bottom of the flex column regardless of whether CreatorHeader
            is rendered above it. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col p-4">
          {/* Below `lg` the creator's identity moves down next to the
              caption (see VideoCaption) and onto the follow badge on the
              action rail's avatar, matching the redesigned mobile feed —
              this floating header is desktop/tablet-only from here down. */}
          <div className="hidden justify-start lg:flex">
            <CreatorHeader video={video} />
          </div>

          <div className="mt-auto flex items-end justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <VideoCaption video={video} />
              {video.enableShopping && video.product && (
                <ProductShoppingCard product={video.product} videoId={video.id} />
              )}
            </div>
            <VideoActionsRail video={video} onOpenComments={() => setCommentsOpen(true)} />
          </div>
        </div>
      </div>

      <CommentDrawer videoId={video.id} open={commentsOpen} onClose={() => setCommentsOpen(false)} />
    </div>
  );
});
