'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { getProductPricing } from '@/lib/pricing';
import type { ActivePromotion } from '@/types/product.types';

const PLACEHOLDER_IMAGE = '/images/placeholder.png';

interface DealProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  comparePrice?: number | null;
  effectivePrice?: number;
  promotion?: ActivePromotion | null;
  thumbnail: string | null;
}

interface DealCarouselProps {
  /** The real, already-live name shown in "Promosaun iha <name>" — the
   *  active subcategory's name when one is selected, else the category's. */
  sectionName: string;
  products: DealProduct[];
}

// Presentational only — CategoryDetailScreen fetches the category's
// products once and derives this promoted subset (real promotion/
// comparePrice data per product, same formula ProductCard's own badge
// uses), rather than this component re-fetching or fabricating deals.
export function DealCarousel({ sectionName, products }: DealCarouselProps) {
  const { t } = useTranslation();
  if (products.length === 0) return null;

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="text-[15px] font-extrabold text-[#142019]">{t('category.promoTitle', { name: sectionName })}</h3>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1" data-lenis-prevent>
        {products.map((product) => {
          const pricing = getProductPricing(product);
          return (
            <Link
              key={product.id}
              href={`/products/${product.slug}`}
              className="w-[140px] shrink-0 overflow-hidden rounded-2xl border border-[#DDE3DE] bg-white"
            >
              <div className="relative aspect-square w-full bg-[#F4F6F3]">
                <Image
                  src={product.thumbnail || PLACEHOLDER_IMAGE}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="140px"
                />
                {pricing.badgeLabel && (
                  <span className="absolute left-1.5 top-1.5 rounded-md bg-[#B4410F] px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {pricing.badgeLabel}
                  </span>
                )}
              </div>
              <div className="p-2.5">
                <p className="line-clamp-2 text-[12px] font-semibold leading-tight text-[#142019]">{product.name}</p>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-[13px] font-extrabold text-[#17703F]">${pricing.currentPrice.toFixed(2)}</span>
                  {pricing.originalPrice != null && (
                    <span className="truncate text-[10px] text-[#56635B] line-through">
                      ${pricing.originalPrice.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
