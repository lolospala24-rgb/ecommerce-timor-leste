'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface ShippingOption {
  shippingZoneId: number;
  zoneName: string;
  courierId: number | null;
  courierName: string | null;
  shippingMethod: string | null;
  shippingCost: number;
  estimatedDeliveryDays: number | null;
}

const unwrapApiResponse = (response: any) => response?.data ?? response;

// Powers the "check shipping cost" widget on the product detail page —
// same public GET /shipping/options endpoint the checkout page's courier
// picker is built from, just queried ahead of adding to cart.
export const useShippingOptions = (municipalityId: number | null) => {
  return useQuery({
    queryKey: ['shipping', 'options', municipalityId],
    queryFn: async () => {
      const response = await api.get(`/shipping/options?municipalityId=${municipalityId}`);
      const data = unwrapApiResponse(response);
      return (data?.data ?? data ?? []) as ShippingOption[];
    },
    enabled: !!municipalityId,
    staleTime: 5 * 60_000,
  });
};
