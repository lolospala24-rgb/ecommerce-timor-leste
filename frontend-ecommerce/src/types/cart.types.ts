import type { ActivePromotion } from './product.types';

export interface CartItem {
  id?: number;
  productId: number;
  sellerId?: number | null;
  variantId?: number | null;
  variantSku?: string | null;
  variantAttributes?: Record<string, string> | null;
  variantThumbnail?: string | null;
  name: string;
  nameTetum?: string | null;
  slug: string;
  // The price this line is actually charged at — already the effective
  // (promotion-discounted, if applicable) price. Never recompute a
  // discount from this + comparePrice; use originalPrice/promotion below.
  price: number;
  comparePrice?: number | null;
  // Crossed-out "was" price for display, or null when there's nothing to
  // cross out. Set by lib/cart.ts's getProductPricing() call — mirrors the
  // same product/comparePrice-vs-Promotion precedence used everywhere else.
  originalPrice?: number | null;
  promotion?: ActivePromotion | null;
  thumbnail: string | null;
  quantity: number;
  stock: number;
}

export interface Cart {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  shipping: number;
  total: number;
}