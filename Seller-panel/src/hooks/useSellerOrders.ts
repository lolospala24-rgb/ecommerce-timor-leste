import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { unwrapApiData, unwrapPaginated } from '@/lib/utils';
import type { OrderStatus, SellerOrder, SellerOrderDetail } from '@/types/order.types';

export function useSellerOrders(params: { page?: number; limit?: number; status?: OrderStatus }) {
  return useQuery({
    queryKey: ['seller-orders', params],
    queryFn: async () => {
      const res = await api.get('/orders/seller/orders', { params });
      return unwrapPaginated<SellerOrder>(res);
    },
  });
}

export function useSellerOrder(id: number | undefined) {
  return useQuery({
    queryKey: ['seller-order', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get(`/orders/${id}`);
      return unwrapApiData<SellerOrderDetail>(res);
    },
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, trackingNumber, note }: { id: number; status: OrderStatus; trackingNumber?: string; note?: string }) => {
      const res = await api.patch(`/orders/${id}/status`, { status, trackingNumber, note });
      return unwrapApiData<SellerOrder>(res);
    },
    onSuccess: (_data, vars) => {
      toast.success('Order status updated');
      qc.invalidateQueries({ queryKey: ['seller-orders'] });
      qc.invalidateQueries({ queryKey: ['seller-order', vars.id] });
      qc.invalidateQueries({ queryKey: ['seller-dashboard'] });
      qc.invalidateQueries({ queryKey: ['seller-balance'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update order status');
    },
  });
}
