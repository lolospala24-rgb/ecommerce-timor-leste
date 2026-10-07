'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { unwrapApiData } from '@/lib/product';

interface TrendingSearch {
  rank: number;
  term: string;
}

// GET /search/trending — already live, already consumed inline by
// SearchAiBar; factored into a hook here so PopularSearchChips can reuse
// the same real data instead of refetching ad hoc.
export function useTrendingSearches(limit: number = 10) {
  return useQuery<TrendingSearch[]>({
    queryKey: ['search', 'trending', limit],
    queryFn: async () => {
      const response = await api.get('/search/trending', { params: { limit } });
      return unwrapApiData<TrendingSearch[]>(response);
    },
    staleTime: 1000 * 60 * 5,
  });
}
