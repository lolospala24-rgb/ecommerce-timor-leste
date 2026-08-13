import { useQuery } from '@tanstack/react-query';
import { videoService } from '@/services/video.service';

export const useVideo = (id: number | null) => {
  const query = useQuery({
    queryKey: ['video', id],
    queryFn: () => videoService.getById(id as number),
    enabled: id != null,
    staleTime: 60 * 1000,
  });

  return { video: query.data, isLoading: query.isLoading, error: query.error };
};

export const useVideoRecommendations = (id: number | null) => {
  const query = useQuery({
    queryKey: ['video', id, 'recommendations'],
    queryFn: () => videoService.getRecommendations(id as number),
    enabled: id != null,
    staleTime: 5 * 60 * 1000,
  });

  return { recommendations: query.data ?? [], isLoading: query.isLoading };
};
