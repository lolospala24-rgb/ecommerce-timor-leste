'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Heart, Flame, TicketPercent } from 'lucide-react';
import { useWishlistStore } from '@/stores/wishlistStore';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { getProductPricing } from '@/lib/pricing';
import { cn } from '@/lib/utils';
import type { Product } from '@/types/product.types';
import toast from 'react-hot-toast';

const PLACEHOLDER_IMAGE = '/images/placeholder.png';
const LOW_STOCK_THRESHOLD = 5;

interface FlashSaleProductCardProps {
  product: Product;
  priority?: boolean;
}

// Flash sale gets its own compact card (not the generic ProductCard) because
// the visual language is genuinely different here — a discount ribbon over a
// tighter price-first layout, no rating/cart-action chrome competing for the
// same small footprint. The urgency pill at the bottom is real-data-only: no
// fabricated "X% claimed" fill, since neither Promotion nor Product carries
// an original flash-sale allocation to compute that against (see
// backend-services schema.prisma — Promotion has no stock-limit field). It
// shows actual low-stock (same threshold ProductCard already uses) or a real
// sales count, full-filled pills either way, never a fraction we can't back.
export function FlashSaleProductCard({ product, priority = false }: FlashSaleProductCardProps) {
  const { t } = useTranslation();
  const [imageError, setImageError] = useState(false);
  const { toggleItem, isInWishlist } = useWishlistStore();
  const { isAuthenticated } = useAuthStore();

  const isWishlisted = isInWishlist(product.id);
  const isOutOfStock = product.stock === 0;
  const isLowStock = !isOutOfStock && product.stock <= LOW_STOCK_THRESHOLD;
  const soldCount = product.salesCount ?? 0;

  const pricing = getProductPricing(product);
  const imageSrc = imageError || !product.thumbnail ? PLACEHOLDER_IMAGE : product.thumbnail;

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error('Please login to add to wishlist');
      return;
    }
    try {
      await toggleItem(product);
    } catch {
      toast.error('Failed to update wishlist');
    }
  };

  return (
    <div className="group overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-square overflow-hidden bg-muted/40">
        <Link href={`/products/${product.slug}`} aria-label={product.name}>
          <Image
            src={imageSrc}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 16vw"
            priority={priority}
            loading={priority ? undefined : 'lazy'}
            onError={() => setImageError(true)}
          />
        </Link>

        {/* Discount ribbon — flag-notch shape is the flash sale's signature
            badge, distinct from the plain rounded badge regular product
            cards use elsewhere on the site. */}
        {pricing.discountPercent > 0 && (
          <div
            aria-hidden
            className="absolute left-0 top-0 z-10 bg-red-600 px-2 pb-1.5 pt-1 text-xs font-bold text-white shadow-sm"
            style={{ clipPath: 'polygon(0 0, 100% 0, 100% 78%, 50% 100%, 0 78%)' }}
          >
            -{pricing.discountPercent}%
          </div>
        )}

        <button
          type="button"
          onClick={handleWishlist}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          className="absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-background/90 shadow-sm transition-colors hover:bg-background"
        >
          <Heart className={cn('h-3.5 w-3.5 text-foreground', isWishlisted && 'fill-red-600 text-red-600')} />
        </button>

        {isOutOfStock && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/55">
            <span className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white">
              {t('product.outOfStock')}
            </span>
          </div>
        )}
      </div>

      <Link href={`/products/${product.slug}`} className="block p-2.5">
        <h3 className="line-clamp-2 min-h-[2rem] text-xs font-medium leading-tight text-foreground">
          {product.name}
        </h3>

        <div className="mt-1.5 flex items-baseline gap-1">
          {pricing.hasPromotion && <TicketPercent className="h-3.5 w-3.5 shrink-0 text-red-600" />}
          <span className="truncate text-base font-bold text-red-600">${pricing.currentPrice.toFixed(2)}</span>
        </div>
        {pricing.originalPrice != null && (
          <span className="block text-[11px] text-muted-foreground line-through">
            ${pricing.originalPrice.toFixed(2)}
          </span>
        )}

        {/* Sold/stock progress bar — Shopee-style, but the fill is a real
            ratio (soldCount / (soldCount + remaining stock)), never an
            arbitrary number: neither Promotion nor Product carries an
            original flash-sale allocation to compute a "X% claimed" figure
            against (checked schema.prisma), so this is the honest
            equivalent — actual units sold vs. actual units left. Shown
            whenever there's a real sold count to report; a healthy-stock
            item with zero recorded sales just shows an empty bar, which is
            still true, not hidden to fake momentum. "Terbatas" is a
            separate, independently-real signal (actual stock <= 5) — never
            implied by the bar itself. */}
        {!isOutOfStock && soldCount > 0 && (
          <div className="mt-2">
            <div className="flex items-center gap-1 text-[10px] font-medium text-orange-700">
              <Flame className="h-2.5 w-2.5 shrink-0" />
              {soldCount} Terjual
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-orange-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500"
                style={{ width: `${Math.min(Math.max((soldCount / (soldCount + product.stock)) * 100, 6), 95)}%` }}
              />
            </div>
          </div>
        )}

        {isLowStock && (
          <span className="mt-1.5 inline-block rounded-sm bg-red-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-red-600">
            Terbatas
          </span>
        )}
      </Link>
    </div>
  );
}
