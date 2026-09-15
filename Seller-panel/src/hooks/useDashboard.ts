import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { unwrapApiData, unwrapOnce } from '@/lib/utils';
import type { SellerDashboard, SellerSalesSeries } from '@/types/dashboard.types';

export function useSellerDashboard(filters?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['seller-dashboard', filters],
    queryFn: async () => {
      const res = await api.get('/dashboard/seller', { params: filters });
      return unwrapApiData<SellerDashboard>(res);
    },
    staleTime: 60_000,
  });
}

export function useSellerSales(period: 'day' | 'week' | 'month' | 'year' = 'month') {
  return useQuery({
    queryKey: ['seller-sales', period],
    queryFn: async () => {
      const res = await api.get('/dashboard/seller/sales', { params: { period } });
      return unwrapOnce<SellerSalesSeries>(res);
    },
    staleTime: 60_000,
  });
}
