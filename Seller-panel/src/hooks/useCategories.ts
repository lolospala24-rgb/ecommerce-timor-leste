import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { unwrapPaginated } from '@/lib/utils';

export interface Category {
  id: number;
  name: string;
  nameTetum?: string | null;
  slug: string;
  parentId: number | null;
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories', { params: { limit: 200 } });
      return unwrapPaginated<Category>(res).data;
    },
    staleTime: 5 * 60_000,
  });
}
