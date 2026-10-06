'use client';

import Link from 'next/link';
import { AlertCircle, Check, Heart, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductInfoCardProps {
  categoryName?: string | null;
  categorySlug?: string | null;
  title: string;
  rating: number;
  totalReviews: number;
  salesCount: number;
  isWishlisted: boolean;
  onWishlistToggle: () => void;
  currentPrice: number;
  originalPrice?: number | null;
  discountPercent: number;
  savings: number;
  priceRange?: { min: number; max: number } | null;
  inStock: boolean;
  stockCount: number;
  onReviewsClick?: () => void;
}

export function ProductInfoCard({
  categoryName,
  categorySlug,
  title,
  rating,
  totalReviews,
  salesCount,
  isWishlisted,
  onWishlistToggle,
  currentPrice,
  originalPrice,
  discountPercent,
  savings,
  priceRange,
  inStock,
  stockCount,
  onReviewsClick,
}: ProductInfoCardProps) {
  return (
    <div className="relative -mt-[18px] rounded-t-[24px] bg-white px-5 pb-5 pt-5">
      <div className="flex items-start justify-between gap-3">
        {categoryName ? (
          <Link
            href={categorySlug ? `/categories/${categorySlug}` : '#'}
            className="inline-flex items-center rounded-full bg-[#E3F1E8] px-3 py-1 text-xs font-semibold text-[#17703F]"
          >
            {categoryName}
          </Link>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onWishlistToggle}
          aria-label={isWishlisted ? 'Hasai husi lista hakarak' : 'Tau ba lista hakarak'}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#DDE3DE] text-[#56635B]"
        >
          <Heart className={cn('h-5 w-5', isWishlisted && 'fill-[#B4410F] text-[#B4410F]')} />
        </button>
      </div>

      <h1 className="mt-3 text-2xl font-extrabold leading-tight text-[#142019]">{title}</h1>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[#56635B]">
        {totalReviews > 0 && (
          <>
            <span className="flex items-center gap-1 font-bold text-[#142019]">
              <Star className="h-4 w-4 fill-[#C27803] text-[#C27803]" />
              {rating.toFixed(1)}
            </span>
            <button type="button" onClick={onReviewsClick} className="underline underline-offset-2">
              {totalReviews} review
            </button>
          </>
        )}
        {totalReviews > 0 && salesCount > 0 && <span className="h-3.5 w-px bg-[#DDE3DE]" />}
        {salesCount > 0 && <span>Faan ona {salesCount}</span>}
      </div>

      <div className="mt-3 rounded-2xl bg-[#F4F6F3] p-4">
        <div className="flex flex-wrap items-end gap-2">
          {priceRange ? (
            <span className="text-[28px] font-extrabold leading-none text-[#17703F]">
              ${priceRange.min.toFixed(2)} - ${priceRange.max.toFixed(2)}
            </span>
          ) : (
            <span className="text-[32px] font-extrabold leading-none text-[#17703F]">
              ${currentPrice.toFixed(2)}
            </span>
          )}
          {originalPrice != null && (
            <span className="pb-0.5 text-sm text-[#56635B] line-through">${originalPrice.toFixed(2)}</span>
          )}
          {discountPercent > 0 && (
            <span className="mb-0.5 rounded-md bg-[#B4410F] px-2 py-0.5 text-xs font-bold text-white">
              -{discountPercent}%
            </span>
          )}
        </div>

        {inStock ? (
          <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-[#17703F]">
            <Check className="h-4 w-4" />
            Iha stok, restu {stockCount} deit.
            {savings > 0 && ` Poupa $${savings.toFixed(2)}.`}
          </p>
        ) : (
          <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-[#B4410F]">
            <AlertCircle className="h-4 w-4" />
            Stok la iha
          </p>
        )}
      </div>
    </div>
  );
}
