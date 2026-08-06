'use client';

import { useQuery } from '@tanstack/react-query';
import { videoService } from '@/services/video.service';
import { Video } from '@/types/video';

export function useRecommendations(videoId?: string) {
  return useQuery<Video[], Error>({
    queryKey: ['video-recs', videoId],
    queryFn: () => videoService.getRecommendations(videoId as string),
    enabled: !!videoId,
  });
}
