'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

const unwrapApiResponse = (response: any) => response?.data ?? response;

// Only meaningful for a logged-in customer viewing an out-of-stock product —
// callers gate rendering on isAuthenticated + stock === 0 themselves, this
// hook just reflects whatever the backend says.
export const useNotifyMeStatus = (productId: number, enabled: boolean) => {
  return useQuery({
    queryKey: ['stock-notification', productId],
    queryFn: async () => {
      const response = await api.get(`/products/${productId}/notify-me`);
      const data = unwrapApiResponse(response);
      return (data?.data ?? data) as { subscribed: boolean };
    },
    enabled,
    staleTime: 30_000,
  });
};

export const useSubscribeNotifyMe = (productId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await api.post(`/products/${productId}/notify-me`);
      return unwrapApiResponse(response);
    },
    onSuccess: () => {
      queryClient.setQueryData(['stock-notification', productId], { subscribed: true });
    },
  });
};

export const useUnsubscribeNotifyMe = (productId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await api.delete(`/products/${productId}/notify-me`);
      return unwrapApiResponse(response);
    },
    onSuccess: () => {
      queryClient.setQueryData(['stock-notification', productId], { subscribed: false });
    },
  });
};
