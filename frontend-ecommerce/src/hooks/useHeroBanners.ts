'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface HeroBanner {
  id: number;
  title: string;
  buttonUrl: string | null;
  desktopImage: string;
  mobileImage: string | null;
  position: number;
}

export const useHeroBanners = () => {
  return useQuery({
    queryKey: ['hero-banners'],
    queryFn: async () => {
      const response = await api.get('/hero-banners');
      return (response.data?.data ?? []) as HeroBanner[];
    },
    staleTime: 60_000,
  });
};
