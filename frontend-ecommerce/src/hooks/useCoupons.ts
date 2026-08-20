'use client';

import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';

export interface CouponValidationResult {
  code: string;
  description: string | null;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  discountAmount: number;
}

const unwrapApiResponse = (response: any) => response?.data ?? response;

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
