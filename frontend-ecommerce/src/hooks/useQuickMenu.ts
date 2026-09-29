'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface QuickMenuItem {
  id: number;
  title: string;
  subtitle: string | null;
  iconType: 'LIBRARY' | 'UPLOAD';
  iconKey: string | null;
  iconUrl: string | null;
  linkType: 'INTERNAL' | 'EXTERNAL';
  link: string;
  displayOrder: number;
  badge: string | null;
  openInNewTab: boolean;
}

// Backend already filters to isActive + within schedule and orders by
// displayOrder — this just renders whatever comes back, no client-side
// re-filtering. Same 60s staleTime as useHeroBanners: this only changes
// when an admin edits it, but the backend's own Redis cache (5 min TTL,
// see QuickMenuService) absorbs the cost of polling more than that.
export const useQuickMenu = () => {
  return useQuery({
    queryKey: ['quick-menu'],
    queryFn: async () => {
      const response = await api.get('/quick-menu');
      return (response.data?.data ?? []) as QuickMenuItem[];
    },
    staleTime: 60_000,
  });
};
