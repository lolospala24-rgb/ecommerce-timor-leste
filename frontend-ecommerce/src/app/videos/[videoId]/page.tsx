'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useVideo } from '@/hooks/useVideo';
import { useVideos } from '@/hooks/useVideos';
import { VideoFeed } from '../components/VideoFeed';
import { VideoErrorState } from '../components/VideoErrorState';

export default function SingleVideoPage() {
  const params = useParams<{ videoId: string }>();
  const videoId = Number(params.videoId);

  const { video, isLoading: isLoadingVideo, error } = useVideo(Number.isFinite(videoId) ? videoId : null);
  const { data, isLoading: isLoadingFeed, fetchNextPage, hasNextPage, isFetchingNextPage } = useVideos({
    filter: 'latest',
  });

  const videos = useMemo(() => {
    const feedVideos = data?.pages.flatMap((page) => page.items) ?? [];
    if (!video) return feedVideos;
    return [video, ...feedVideos.filter((v) => v.id !== video.id)];
  }, [video, data]);

  if (isLoadingVideo || (isLoadingFeed && videos.length === 0)) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-300" />
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center">
        <VideoErrorState onRetry={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <VideoFeed
      videos={videos}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
      initialVideoId={video.id}
    />
  );
}
