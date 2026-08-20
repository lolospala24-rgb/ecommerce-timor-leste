import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AppliedCoupon {
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  discountAmount: number;
}

interface CouponState {
  appliedCoupon: AppliedCoupon | null;
  setAppliedCoupon: (coupon: AppliedCoupon | null) => void;
  clearCoupon: () => void;
}

// Persisted so the coupon a customer applied on the cart page is still
// there when they land on the checkout page — the discount amount shown
// is only ever a preview either way, since both OrdersService.create and
// the checkout page's own totals always re-validate the code against the
// real, current cart before it affects what's actually charged.
export const useCouponStore = create<CouponState>()(
  persist(
    (set) => ({
      appliedCoupon: null,
      setAppliedCoupon: (coupon) => set({ appliedCoupon: coupon }),
      clearCoupon: () => set({ appliedCoupon: null }),
    }),
    {
      name: 'coupon-storage',
    },
  ),
);
