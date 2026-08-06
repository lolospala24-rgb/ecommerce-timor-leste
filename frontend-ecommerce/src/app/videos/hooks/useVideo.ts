'use client';

import { useQuery } from '@tanstack/react-query';
import { videoService } from '@/services/video.service';
import { Video } from '@/types/video';

export function useVideo(id: string | undefined) {
  return useQuery<Video, Error>({
    queryKey: ['video', id],
    queryFn: () => videoService.getVideoById(id as string),
    enabled: !!id,
  });
}
