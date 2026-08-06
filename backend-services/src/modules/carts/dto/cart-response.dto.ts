// placeholder for src/modules/carts/dto/cart-response.dto.ts
export class CartResponseDto {
  id: number;
  userId: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  
  items?: CartItemDto[];
  summary?: CartSummaryDto;
  coupon?: CouponDto;
}

export class CartItemDto {
  id: number;
  productId: number;
  quantity: number;
  product?: {
    id: number;
    name: string;
    nameTetum: string | null;
    price: number;
    thumbnail: string | null;
    stock: number;
    sellerId: number;
    seller?: {
      id: number;
      storeName: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

export class CartSummaryDto {
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  totalItems: number;
  sellerGroups: SellerGroupDto[];
}

export class SellerGroupDto {
  sellerId: number;
  sellerName: string;
  items: CartItemGroupDto[];
  subtotal: number;
}

export class CartItemGroupDto {
  productId: number;
  name: string;
  nameTetum: string | null;
  quantity: number;
  price: number;
  total: number;
  thumbnail: string | null;
}

export class CouponDto {
  code: string;
  discount: number;
  type: 'percentage' | 'fixed';
  value: number;
}