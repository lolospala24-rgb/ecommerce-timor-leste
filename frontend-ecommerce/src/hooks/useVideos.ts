import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { videoService } from '@/services/video.service';
import { CreatorService } from '@/services/creator.service';
import { VideoFilters, VideoResponse } from '@/types/video';
import { Creator } from '@/types/creator';

export const useVideos = (filters: VideoFilters = {}) => {
  return useInfiniteQuery({
    queryKey: ['videos', filters],
    queryFn: ({ pageParam = 1 }) =>
      videoService.getVideos({ ...filters, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: VideoResponse | undefined) => {
      // Defensive: backend/route may return empty payload or a different shape.
      const meta = (lastPage as any)?.meta;
      const page = meta?.page;
      const totalPages = meta?.totalPages;

      if (typeof page !== 'number' || typeof totalPages !== 'number') {
        return undefined;
      }

      return page < totalPages ? page + 1 : undefined;
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

// NOTE:
// TrendingCreators component expects: id, username, name, avatar, isVerified, followers
// This hook currently relies on an API endpoint returning creators.
// If your backend endpoint differs, adjust `getFeaturedCreators` URL.
export const useFeaturedCreators = (limit: number = 5) => {
  return useQuery({
    queryKey: ['featuredCreators', { limit }],
    queryFn: async (): Promise<{ data: Creator[] }> => {
      // Prefer a dedicated creator endpoint if present in backend.
      // Fallback: reuse getCreatorById is not suitable; so we call a generic endpoint.
      // Implement `creatorService.getFeaturedCreators` if you have it.
      const creatorServiceAny = CreatorService as any;

      // If backend already has a method, use it.
      if (typeof creatorServiceAny?.prototype?.getFeaturedCreators === 'function') {
        const svc = creatorServiceAny.getInstance();
        const res = await svc.getFeaturedCreators(limit);
        return res;
      }

      // Generic REST call through the service's API client (best-effort).
      // `creatorService` in this codebase is a singleton of CreatorService.
      const { creatorService } = await import('@/services/creator.service');
      if (typeof (creatorService as any)?.getFeaturedCreators === 'function') {
        const res = await (creatorService as any).getFeaturedCreators(limit);
        return res;
      }

      throw new Error(
        'useFeaturedCreators: Missing backend endpoint/hook. Please implement creatorService.getFeaturedCreators(limit) or useFeaturedCreators API call.'
      );
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

