'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface OrderFilters {
  page?: number;
  limit?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export const useOrders = (filters?: OrderFilters) => {
  return useQuery({
    queryKey: ['orders', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.status) params.append('status', filters.status);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      const response = await api.get(`/orders?${params.toString()}`);
      return response.data;
    },
  });
};

export const useUserOrders = (filters?: { page?: number; limit?: number; status?: string }) => {
  return useQuery({
    queryKey: ['orders', 'user', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.status) params.append('status', filters.status);
      const response = await api.get(`/orders/my-orders?${params.toString()}`);
      return response.data;
    },
  });
};

export const useOrder = (id?: number | null) => {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: async () => {
      if (!id) {
        return null;
      }
      const response = await api.get(`/orders/${id}`);
      return response.data.data || response.data;
    },
    enabled: !!id,
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { addressId: number; paymentMethod: string; shippingMethod?: string; shippingFee?: number; taxAmount?: number; serviceFee?: number; notes?: string }) => {
      // Client-side validation: ensure cart has valid items before sending to backend
      const cartResp = await api.get('/carts');
      const cartData = cartResp?.data?.data ?? cartResp?.data ?? {};
      const items = Array.isArray(cartData.items) ? cartData.items : [];

      if (!items || items.length === 0) {
        throw new Error('Cart is empty');
      }

      const invalid = items.filter((item: any) => {
        return (
          !item.product ||
          item.productId == null ||
          item.quantity == null ||
          item.quantity <= 0 ||
          item.product.price == null ||
          !Number.isFinite(item.product.price)
        );
      });

      if (invalid.length > 0) {
        throw new Error('Cart contains invalid product or pricing data');
      }

      const response = await api.post('/orders', data);
      return response.data.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order placed successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to place order');
    },
  });
};

export const useCancelOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason?: string }) => {
      const response = await api.post(`/orders/${id}/cancel`, { reason });
      return response.data.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order cancelled successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    },
  });
};

export const useOrderStats = () => {
  return useQuery({
    queryKey: ['orders', 'stats'],
    queryFn: async () => {
      const response = await api.get('/orders/stats');
      return response.data.data || response.data;
    },
  });
};