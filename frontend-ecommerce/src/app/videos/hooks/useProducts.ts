'use client';

import { useQuery } from '@tanstack/react-query';
import { videoService } from '@/services/video.service';
import { Product } from '@/types/product.types';

export function useProducts(videoId?: string) {
  return useQuery<Product[], Error>({
    queryKey: ['video-products', videoId],
    queryFn: () => videoService.getVideoProducts(videoId as string),
    enabled: !!videoId,
  });
}
