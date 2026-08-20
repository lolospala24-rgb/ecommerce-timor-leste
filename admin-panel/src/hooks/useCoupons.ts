'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { unwrapApiData } from '@/lib/utils';
import toast from 'react-hot-toast';

export type CouponDiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface Coupon {
  id: number;
  code: string;
  description: string | null;
  discountType: CouponDiscountType;
  discountValue: number;
  maxDiscountAmount: number | null;
  minPurchaseAmount: number | null;
  usageLimit: number | null;
  usageLimitPerUser: number;
  usedCount: number;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CouponPayload {
  code: string;
  description?: string;
  discountType: CouponDiscountType;
  discountValue: number;
  maxDiscountAmount?: number;
  minPurchaseAmount?: number;
  usageLimit?: number;
  usageLimitPerUser?: number;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
}

export type UpdateCouponPayload = Partial<CouponPayload>;

export const useCoupons = () => {
  return useQuery({
    queryKey: ['coupons', 'admin'],
    queryFn: async () => {
      const response = await api.get('/coupons/admin');
      return unwrapApiData<Coupon[]>(response.data);
    },
  });
};

export const useCoupon = (id: number | null) => {
  return useQuery({
    queryKey: ['coupons', 'admin', id],
    queryFn: async () => {
      const response = await api.get(`/coupons/admin/${id}`);
      return unwrapApiData<Coupon>(response.data);
    },
    enabled: id !== null,
  });
};

export const useCreateCoupon = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CouponPayload) => {
      const response = await api.post('/coupons', payload);
      return unwrapApiData<Coupon>(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Coupon created');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create coupon');
    },
  });
};

export const useUpdateCoupon = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateCouponPayload }) => {
      const response = await api.patch(`/coupons/${id}`, data);
      return unwrapApiData<Coupon>(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Coupon updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update coupon');
    },
  });
};

export const useDeleteCoupon = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/coupons/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Coupon deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete coupon');
    },
  });
};
