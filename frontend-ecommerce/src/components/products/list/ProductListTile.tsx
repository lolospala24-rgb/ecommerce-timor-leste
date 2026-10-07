'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Heart, Star } from 'lucide-react';
import { useWishlistStore } from '@/stores/wishlistStore';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { getProductPricing } from '@/lib/pricing';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { ActivePromotion } from '@/types/product.types';

const PLACEHOLDER_IMAGE = '/images/placeholder.png';

interface ProductListTileProps {
  product: {
    id: number;
    name: string;
    slug: string;
    price: number;
    comparePrice?: number | null;
    effectivePrice?: number;
    promotion?: ActivePromotion | null;
    thumbnail: string | null;
    stock: number;
    rating?: number;
    totalReviews?: number;
    salesCount?: number;
    resolvedOrigin?: { municipality: string } | null;
    seller?: { storeName?: string } | null;
  };
}

// Same data this screen's grid-view ProductCard already reads — just laid
// out horizontally, per the new design's list-view spec.
export function ProductListTile({ product }: ProductListTileProps) {
  const { t } = useTranslation();
  const [imageError, setImageError] = useState(false);
  const { toggleItem, isInWishlist } = useWishlistStore();
  const { isAuthenticated } = useAuthStore();
  const isWishlisted = isInWishlist(product.id);
  const pricing = getProductPricing(product);
  const hasRating = (product.totalReviews ?? 0) > 0;
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
    <Link
      href={`/products/${product.slug}`}
      className="relative flex gap-3 rounded-2xl border border-[#DDE3DE] bg-white p-3"
    >
      <div className="relative h-[120px] w-[120px] shrink-0 overflow-hidden rounded-xl bg-[#F4F6F3]">
        <Image
          src={imageSrc}
          alt={product.name}
          fill
          className="object-cover"
          sizes="120px"
          onError={() => setImageError(true)}
        />
        {pricing.badgeLabel && (
          <span className="absolute left-1.5 top-1.5 rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {pricing.badgeLabel}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1 pr-8">
        <h3 className="line-clamp-2 text-[14px] font-semibold text-[#142019]">{product.name}</h3>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-[16px] font-extrabold text-[#17703F]">${pricing.currentPrice.toFixed(2)}</span>
          {pricing.originalPrice != null && (
            <span className="text-[12px] text-[#56635B] line-through">${pricing.originalPrice.toFixed(2)}</span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[12px] text-[#56635B]">
          {hasRating && (
            <>
              <span className="inline-flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                {(product.rating || 0).toFixed(1)}
              </span>
              <span>·</span>
            </>
          )}
          {!!product.salesCount && (
            <>
              <span>{t('productList.sold', { count: product.salesCount })}</span>
              {product.resolvedOrigin?.municipality && <span>·</span>}
            </>
          )}
          {product.resolvedOrigin?.municipality && <span className="truncate">{product.resolvedOrigin.municipality}</span>}
        </div>
        {product.seller?.storeName && (
          <p className="mt-0.5 truncate text-[12px] text-[#56635B]">{product.seller.storeName}</p>
        )}
      </div>

      <button
        type="button"
        onClick={handleWishlist}
        aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90"
      >
        <Heart className={cn('h-4 w-4 text-[#142019]', isWishlisted && 'fill-red-600 text-red-600')} />
      </button>
    </Link>
  );
}
