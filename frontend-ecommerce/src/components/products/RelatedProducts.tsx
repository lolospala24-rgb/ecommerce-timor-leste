'use client';

import Link from 'next/link';
import { useRelatedProducts } from '@/hooks/useProducts';
import { ProductCard } from './ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight } from 'lucide-react';

interface RelatedProductsProps {
  currentProductId: number;
  limit?: number;
}

export function RelatedProducts({ currentProductId, limit = 4 }: RelatedProductsProps) {
  const { data: products, isLoading } = useRelatedProducts(currentProductId, limit);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">You May Also Like</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {[...Array(limit)].map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">You May Also Like</h2>
        <Link
          href="/products"
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          View All
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Horizontal scroll on mobile (each card a fixed fraction of the
          viewport, snapping into place) — a 2-column grid here would
          force tiny cards for what's meant to be a quick, swipeable
          "you might also like" strip. Reverts to a normal grid from sm:
          up, where there's room for full-size cards side by side. */}
      <div
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4"
        data-lenis-prevent
      >
        {products.map((product: any) => (
          <div key={product.id} className="w-[42vw] shrink-0 snap-start xs:w-[38vw] sm:w-auto">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </div>
  );
}