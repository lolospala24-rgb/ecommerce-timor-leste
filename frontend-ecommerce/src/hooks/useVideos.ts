import { useInfiniteQuery } from '@tanstack/react-query';
import { videoService } from '@/services/video.service';
import { VideoFeedFilters } from '@/types/video';

const PAGE_SIZE = 6;

export const useVideos = (filters: VideoFeedFilters = {}) => {
  return useInfiniteQuery({
    queryKey: ['videos', 'feed', filters],
    queryFn: ({ pageParam = 1 }) =>
      videoService.getFeed({ ...filters, page: pageParam, limit: filters.limit ?? PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.items.length, 0);
      return loaded < lastPage.total ? allPages.length + 1 : undefined;
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useSavedVideos = () => {
  return useInfiniteQuery({
    queryKey: ['videos', 'saved'],
    queryFn: ({ pageParam = 1 }) => videoService.getSaved(pageParam, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.items.length, 0);
      return loaded < lastPage.total ? allPages.length + 1 : undefined;
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
};
