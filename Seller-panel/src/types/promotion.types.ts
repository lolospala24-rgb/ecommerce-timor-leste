export type PromotionStatus = 'SCHEDULED' | 'ACTIVE' | 'EXPIRED' | 'DEACTIVATED';
export type PromotionDiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface PromotionProductSummary {
  productId: number;
  name: string;
  thumbnail: string | null;
  price: number;
  stock: number;
  slug: string;
}

export interface Promotion {
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
  updatedAt: string;
}

export interface PromotionDetail extends Promotion {
  products: PromotionProductSummary[];
}

export interface CreatePromotionPayload {
  name: string;
  description?: string;
  discountType: PromotionDiscountType;
  discountValue: number;
  startAt: string;
  endAt: string;
  isActive?: boolean;
  productIds: number[];
}

export type UpdatePromotionPayload = Partial<CreatePromotionPayload>;

export interface PromotionConflict {
  productId: number;
  productName: string;
  promotionId: number;
  promotionName: string;
}
