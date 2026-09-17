'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';

export type PromotionStatus = 'SCHEDULED' | 'ACTIVE' | 'EXPIRED' | 'DEACTIVATED';
export type PromotionDiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface AdminPromotion {
  id: number;
  name: string;
  description: string | null;
  discountType: PromotionDiscountType;
  discountValue: number;
  startAt: string;
  endAt: string;
  isActive: boolean;
  status: PromotionStatus;
  productCount: number;
  createdAt: string;
  seller: { id: number; storeName: string };
}

interface Paginated<T> {
  data: T[];
  pagination: { total: number; page: number; limit: number; totalPages: number; hasNext: boolean; hasPrev: boolean };
}

// View + deactivate only — sellers own the create/edit lifecycle for their
// own promotions (see Seller-panel's usePromotions.ts). Deliberately no
// admin-side create/edit/delete here, matching the "no complex approval
// workflow" requirement for this feature.
export const useAdminPromotions = (params: { page?: number; limit?: number; status?: PromotionStatus }) => {
  return useQuery({
    queryKey: ['promotions', 'admin', params],
    queryFn: async () => {
      const response = await api.get('/promotions/admin', { params });
      return response.data as Paginated<AdminPromotion>;
    },
  });
};

export const useDeactivatePromotionAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.patch(`/promotions/admin/${id}/deactivate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions', 'admin'] });
      toast.success('Promotion deactivated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to deactivate promotion');
    },
  });
};
