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
      className="flex h-full w-full shrink-0 snap-center items-center justify-center px-0 py-4 md:px-4"
    >
      <div className="relative h-full max-h-full w-full max-w-[420px] overflow-hidden rounded-none shadow-xl md:rounded-2xl">
        <VideoPlayer video={video} isActive={isActive} onDoubleTapLike={like} />

        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4">
          <div className="flex justify-start">
            <CreatorHeader video={video} />
          </div>

          <div className="flex items-end justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <VideoCaption video={video} />
              {video.product && <ProductShoppingCard product={video.product} />}
            </div>
            <VideoActionsRail video={video} onOpenComments={() => setCommentsOpen(true)} />
          </div>
        </div>
      </div>

      <CommentDrawer videoId={video.id} open={commentsOpen} onClose={() => setCommentsOpen(false)} />
    </div>
  );
});
