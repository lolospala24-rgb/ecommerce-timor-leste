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

const EXPORT_PAGE_LIMIT = 100;
const EXPORT_MAX_PAGES = 20; // caps at 2,000 orders — generous for a single store's history

// Not a hook — a plain fetch-all helper shared by CSV export (this file's
// callers) and the derived Customers directory (useCustomers.ts), which
// both need every one of the seller's own orders, not just one page.
export async function fetchAllSellerOrders(status?: OrderStatus): Promise<SellerOrder[]> {
  const all: SellerOrder[] = [];
  let page = 1;
  while (page <= EXPORT_MAX_PAGES) {
    const res = await api.get('/orders/seller/orders', { params: { page, limit: EXPORT_PAGE_LIMIT, status } });
    const body = unwrapPaginated<SellerOrder>(res);
    all.push(...body.data);
    if (!body.pagination?.hasNext) break;
    page += 1;
  }
  return all;
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
