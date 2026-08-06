'use client';

import { Video } from '@/types/video';
import { VideoCard } from '@/components/player/VideoCard';
import { EmptyState } from '@/components/ui';
import { cn } from '@/lib/utils';

interface RelatedVideosProps {
  videos: Video[];
  title?: string;
  className?: string;
  onVideoClick?: (video: Video) => void;
}

export function RelatedVideos({
  videos,
  title = 'Related Videos',
  className,
  onVideoClick,
}: RelatedVideosProps) {
  if (videos.length === 0) {
    return (
      <EmptyState
        iconName="film"
        title="No related videos"
        description="Check back later for more content"
        size="sm"
      />
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <div className="space-y-2">
        {videos.slice(0, 5).map((video) => (
          <div
            key={video.id}
            className="cursor-pointer"
            onClick={() => onVideoClick?.(video)}
          >
            <VideoCard
              video={video}
              variant="compact"
              showCreator
              showActions={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}