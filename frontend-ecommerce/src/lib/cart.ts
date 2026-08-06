import type { CartItem } from '@/types/cart.types';

function toNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

/** Map a product (from catalog) into a flat cart line item. */
export function productToCartItem(product: any, quantity: number): CartItem {
  return {
    productId: product.id,
    name: product.name ?? 'Product',
    nameTetum: product.nameTetum ?? null,
    slug: product.slug ?? String(product.id),
    price: toNumber(product.price),
    comparePrice:
      product.comparePrice != null ? toNumber(product.comparePrice) : null,
    thumbnail: product.thumbnail ?? null,
    quantity: toNumber(quantity, 1),
    stock: toNumber(product.stock),
  };
}

/**
 * Normalize cart items from the API (nested `product`) or guest/local storage (flat).
 */
export function normalizeCartItem(raw: any): CartItem {
  const product = raw?.product ?? raw ?? {};
  const productId = raw?.productId ?? product?.id ?? 0;

  return {
    productId,
    name: product.name ?? raw.name ?? 'Product',
    nameTetum: product.nameTetum ?? raw.nameTetum ?? null,
    slug: product.slug ?? raw.slug ?? String(productId),
    price: toNumber(product.price ?? raw.price),
    comparePrice:
      product.comparePrice != null || raw.comparePrice != null
        ? toNumber(product.comparePrice ?? raw.comparePrice)
        : null,
    thumbnail: product.thumbnail ?? raw.thumbnail ?? null,
    quantity: toNumber(raw.quantity, 1),
    stock: toNumber(product.stock ?? raw.stock),
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
