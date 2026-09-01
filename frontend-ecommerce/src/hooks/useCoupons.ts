'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';

export interface CouponValidationResult {
  code: string;
  description: string | null;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  discountAmount: number;
}

export interface AvailableCoupon {
  code: string;
  description: string | null;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  minPurchaseAmount: number | null;
  maxDiscountAmount: number | null;
  meetsMinimum: boolean;
  discountAmount: number;
}

export interface PublicCoupon {
  code: string;
  description: string | null;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  minPurchaseAmount: number | null;
  maxDiscountAmount: number | null;
  endDate: string | null;
}

const unwrapApiResponse = (response: any) => response?.data ?? response;

// No-login-required listing for the public /deals page — a visitor doesn't
// need an account to see what promotions exist, only to apply one at
// checkout (that's useAvailableCoupons/useValidateCoupon below, both of
// which need a real user for per-user usage limits).
export const usePublicCoupons = () => {
  return useQuery({
    queryKey: ['coupons', 'public'],
    queryFn: async () => {
      const response = await api.get('/coupons/public');
      const data = unwrapApiResponse(response);
      return (data?.data ?? data ?? []) as PublicCoupon[];
    },
    staleTime: 60_000,
  });
};

// Every coupon the customer could plausibly use — including ones they
// haven't hit the minimum purchase for yet (meetsMinimum: false), so the
// cart page can show "spend $X more to unlock this" instead of hiding it.
export const useAvailableCoupons = (subtotal: number) => {
  return useQuery({
    queryKey: ['coupons', 'available', subtotal],
    queryFn: async () => {
      const response = await api.get(`/coupons/available?subtotal=${subtotal}`);
      const data = unwrapApiResponse(response);
      return (data?.data ?? data ?? []) as AvailableCoupon[];
    },
    staleTime: 30_000,
  });
};

// Preview-only — the final discount is always recomputed server-side again
// at order placement (see backend CouponsService.validateForCustomer,
// called from OrdersService.create), so this is purely for showing the
// customer what they'll get before they commit.
export const useValidateCoupon = () => {
  return useMutation({
    mutationFn: async ({ code, subtotal }: { code: string; subtotal: number }) => {
      const response = await api.post('/coupons/validate', { code, subtotal });
      const data = unwrapApiResponse(response);
      return (data?.data ?? data) as CouponValidationResult;
    },
  });
};
