'use client';

import { useQuery } from '@tanstack/react-query';
import { creatorService } from '@/services/creator.service';
import { Creator } from '@/types/creator';

export const useCreator = (id: string) => {
  const query = useQuery({
    queryKey: ['creator', id],
    queryFn: () => creatorService.getCreatorById(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });

  return {
    creator: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
};


