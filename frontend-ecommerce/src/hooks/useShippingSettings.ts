'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface ShippingSettings {
  enableFreeShipping: boolean;
  freeShippingThreshold: number;
  enableCOD?: boolean;
  enableLocalPickup?: boolean;
}

const unwrapApiResponse = (response: any) => response?.data ?? response;

export const useShippingSettings = () => {
  return useQuery({
    queryKey: ['shipping-settings'],
    queryFn: async () => {
      const response = await api.get('/shipping-settings');
      const data = unwrapApiResponse(response);
      return (data?.data ?? data ?? {}) as ShippingSettings;
    },
    staleTime: 5 * 60_000,
  });
};
