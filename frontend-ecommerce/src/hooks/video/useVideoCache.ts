import { QueryClient, InfiniteData } from '@tanstack/react-query';
import { Video, VideoListResult } from '@/types/video';

/**
 * A video can be visible in several caches at once (the main feed, a saved
 * feed, the single-video query) — every optimistic like/save/follow update
 * has to reach all of them, or the UI desyncs the moment the user scrolls
 * away and back. This sweeps every cache keyed under 'videos' plus the
 * single-video cache in one call.
 */
export function patchVideoInCaches(
  queryClient: QueryClient,
  videoId: number,
  patch: Partial<Video> | ((video: Video) => Partial<Video>),
) {
  const apply = (video: Video): Video => ({
    ...video,
    ...(typeof patch === 'function' ? patch(video) : patch),
  });

  queryClient.setQueriesData<InfiniteData<VideoListResult>>({ queryKey: ['videos'] }, (old) => {
    if (!old) return old;
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        items: page.items.map((v) => (v.id === videoId ? apply(v) : v)),
      })),
    };
  });

  queryClient.setQueryData<Video>(['video', videoId], (old) => (old ? apply(old) : old));
}

/** Same idea as patchVideoInCaches, but for every video by a given seller — used when the follow state changes. */
export function patchVideosBySeller(
  queryClient: QueryClient,
  sellerId: number,
  patch: Partial<Video> | ((video: Video) => Partial<Video>),
) {
  const apply = (video: Video): Video =>
    video.product?.seller?.id === sellerId
      ? { ...video, ...(typeof patch === 'function' ? patch(video) : patch) }
      : video;

  queryClient.setQueriesData<InfiniteData<VideoListResult>>({ queryKey: ['videos'] }, (old) => {
    if (!old) return old;
    return {
      ...old,
      pages: old.pages.map((page) => ({ ...page, items: page.items.map(apply) })),
    };
  });

  queryClient.setQueriesData<Video>({ queryKey: ['video'] }, (old) => (old ? apply(old) : old));
}
