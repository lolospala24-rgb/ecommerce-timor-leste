import type { CartItem } from '@/types/cart.types';
import { getProductPricing } from '@/lib/pricing';

function toNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

/** Map a product (from catalog) into a flat cart line item. When `variant` is
 * given, its price/stock/sku take priority over the base product's — this
 * mirrors how the backend prices a cart line (`item.variant?.price ?? item.product.price`). */
export function productToCartItem(product: any, quantity: number, variant?: any | null): CartItem {
  const variantThumbnail = Array.isArray(variant?.images) ? variant.images[0] ?? null : null;
  const basePrice = toNumber(variant?.price ?? product.price);
  const comparePrice =
    (variant?.comparePrice ?? product.comparePrice) != null
      ? toNumber(variant?.comparePrice ?? product.comparePrice)
      : null;
  // Promotion is product-level, not per-variant — always product.promotion,
  // but the discount amount comes off whichever price (variant or base) is
  // actually in effect, via effectivePrice on that same object.
  const pricing = getProductPricing({
    price: basePrice,
    comparePrice,
    effectivePrice: variant?.effectivePrice ?? product.effectivePrice,
    promotion: product.promotion ?? null,
  });

  return {
    productId: product.id,
    sellerId: product.sellerId ?? product.seller?.id ?? null,
    variantId: variant?.id ?? null,
    variantSku: variant?.sku ?? null,
    variantAttributes: variant?.attributes ?? null,
    variantThumbnail,
    name: product.name ?? 'Product',
    nameTetum: product.nameTetum ?? null,
    slug: product.slug ?? String(product.id),
    price: pricing.currentPrice,
    comparePrice,
    originalPrice: pricing.originalPrice,
    promotion: pricing.hasPromotion ? product.promotion ?? null : null,
    thumbnail: variantThumbnail ?? product.thumbnail ?? null,
    quantity: toNumber(quantity, 1),
    stock: toNumber(variant?.stock ?? product.stock),
  };
}

/**
 * Normalize cart items from the API (nested `product`/`variant`) or
 * guest/local storage (flat).
 */
export function normalizeCartItem(raw: any): CartItem {
  const product = raw?.product ?? raw ?? {};
  const variant = raw?.variant ?? null;
  const productId = raw?.productId ?? product?.id ?? 0;
  const variantThumbnail = Array.isArray(variant?.images) ? variant.images[0] ?? null : null;
  const basePrice = toNumber(variant?.price ?? product.price ?? raw.price);
  const comparePrice =
    (variant?.comparePrice ?? product.comparePrice ?? raw.comparePrice) != null
      ? toNumber(variant?.comparePrice ?? product.comparePrice ?? raw.comparePrice)
      : null;
  const pricing = getProductPricing({
    price: basePrice,
    comparePrice,
    effectivePrice: variant?.effectivePrice ?? product.effectivePrice ?? raw.effectivePrice,
    promotion: product.promotion ?? raw.promotion ?? null,
  });

  return {
    productId,
    sellerId: product.sellerId ?? product.seller?.id ?? raw.sellerId ?? null,
    variantId: raw?.variantId ?? variant?.id ?? null,
    variantSku: variant?.sku ?? null,
    variantAttributes: variant?.attributes ?? null,
    variantThumbnail,
    name: product.name ?? raw.name ?? 'Product',
    nameTetum: product.nameTetum ?? raw.nameTetum ?? null,
    slug: product.slug ?? raw.slug ?? String(productId),
    price: pricing.currentPrice,
    comparePrice,
    originalPrice: pricing.originalPrice,
    promotion: pricing.hasPromotion ? (product.promotion ?? raw.promotion ?? null) : null,
    thumbnail: variantThumbnail ?? product.thumbnail ?? raw.thumbnail ?? null,
    quantity: toNumber(raw.quantity, 1),
    stock: toNumber(variant?.stock ?? product.stock ?? raw.stock),
  };
}

export function normalizeCartItems(items: unknown): CartItem[] {
  if (!Array.isArray(items)) return [];
  return items.map(normalizeCartItem).filter((item) => item.productId > 0);
}

export function getCartItemKey(item: CartItem): string {
  const productId = item?.productId ?? 0;
  const variantId = item?.variantId ?? 'default';
  const slug = item?.slug ?? String(productId);
  return `${productId}-${variantId}-${slug}`;
}
