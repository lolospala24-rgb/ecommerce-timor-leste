'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { videoService } from '@/services/video.service';
import { VideoFilters, VideoResponse } from '@/types/video';

export function useVideos(filters: VideoFilters = {}) {
  return useInfiniteQuery<VideoResponse>({
    queryKey: ['videos', filters],
    queryFn: ({ pageParam }) => videoService.getVideos({ ...filters, page: Number(pageParam ?? 1) }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const meta = lastPage?.meta;
      if (!meta || typeof meta.page !== 'number' || typeof meta.totalPages !== 'number') return undefined;
      return meta.page < meta.totalPages ? meta.page + 1 : undefined;
    },
  });
}
