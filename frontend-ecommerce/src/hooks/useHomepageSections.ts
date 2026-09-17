'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Product } from '@/types/product';

export interface HomepageSection {
  id: number;
  name: string;
  title: string;
  subtitle: string | null;
  type: string;
  rule:
    | 'MANUAL'
    | 'NEWEST'
    | 'POPULAR'
    | 'BEST_SELLING'
    | 'LOCAL'
    | 'ON_SALE'
    | 'LIMITED_STOCK'
    | 'CATEGORY'
    | 'FLASH_SALE';
  displayOrder: number;
  products: Product[];
  /** Only present for rule === 'FLASH_SALE' — the soonest a currently-shown
   *  product's promotion expires, for the countdown timer. */
  endsAt?: string | null;
}

export const useHomepageSections = () => {
  return useQuery({
    queryKey: ['homepage', 'sections'],
    queryFn: async () => {
      const response = await api.get('/homepage/sections');
      return (response.data?.data ?? []) as HomepageSection[];
    },
    staleTime: 60_000,
  });
};
