'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { unwrapApiData } from '@/lib/utils';

// How many customers are waiting for this out-of-stock product to be
// restocked — admin/seller-only signal (backend enforces ownership), shown
// on the product detail page next to the Stock badge.
export const useNotifyMeWaitingCount = (productId: number, enabled: boolean) => {
  return useQuery({
    queryKey: ['stock-notification-count', productId],
    queryFn: async () => {
      const response = await api.get(`/products/${productId}/notify-me/count`);
      const data = unwrapApiData<{ count: number }>(response);
      return data;
    },
    enabled,
    staleTime: 30_000,
  });
};
