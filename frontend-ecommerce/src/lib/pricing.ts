import type { ActivePromotion } from '@/types/product.types';

export interface PricingSource {
  price: number;
  comparePrice?: number | null;
  effectivePrice?: number | null;
  promotion?: ActivePromotion | null;
}

export interface ProductPricing {
  // The price to show as the "now" price and the one already reflected in
  // cart/checkout totals — comes straight from the server (effectivePrice),
  // never recomputed here.
  currentPrice: number;
  // The crossed-out "was" price, or null when there's nothing to cross out.
  // When a promotion is active this is always the product's own permanent
  // price (never comparePrice) — the promotion never changes that price,
  // it only overlays a temporary discount on top of it.
  originalPrice: number | null;
  // Rounded whole-number percent, 0 when there's no discount to show.
  discountPercent: number;
  savings: number;
  hasPromotion: boolean;
  badgeLabel: string | null;
}

// Single place that decides "comparePrice or Promotion?" for every price
// display surface (ProductCard, ProductDetail, seller store, cart) — see
// the audit note on this formula being duplicated 3+ times before this.
// An active Promotion always wins over comparePrice: comparePrice is a
// static, permanent merchandising field with its own independent meaning,
// while Promotion is the time-bound layer this feature adds. Showing both
// discounted against each other at once would read as a fake double
// discount, so once a Promotion is active, comparePrice is simply ignored
// for this product until the promotion ends.
export function getProductPricing(source: PricingSource): ProductPricing {
  const basePrice = source.price;

  if (source.promotion) {
    const current = source.effectivePrice ?? basePrice;
    const savings = Math.max(Math.round((basePrice - current) * 100) / 100, 0);
    const discountPercent =
      source.promotion.discountType === 'PERCENTAGE'
        ? Math.round(source.promotion.discountValue)
        : basePrice > 0
          ? Math.round((savings / basePrice) * 100)
          : 0;
    const badgeLabel =
      source.promotion.discountType === 'PERCENTAGE'
        ? `-${discountPercent}%`
        : `-$${source.promotion.discountValue.toFixed(2)}`;

    return {
      currentPrice: current,
      originalPrice: current < basePrice ? basePrice : null,
      discountPercent,
      savings,
      hasPromotion: true,
      badgeLabel,
    };
  }

  const comparePrice = source.comparePrice ?? null;
  const hasCompareDiscount = !!comparePrice && comparePrice > basePrice;
  const discountPercent = hasCompareDiscount ? Math.round(((comparePrice! - basePrice) / comparePrice!) * 100) : 0;

  return {
    currentPrice: basePrice,
    originalPrice: hasCompareDiscount ? comparePrice : null,
    discountPercent,
    savings: hasCompareDiscount ? Math.round((comparePrice! - basePrice) * 100) / 100 : 0,
    hasPromotion: false,
    badgeLabel: hasCompareDiscount ? `-${discountPercent}%` : null,
  };
}
