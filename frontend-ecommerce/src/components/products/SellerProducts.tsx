'use client';

import Link from 'next/link';
import { useSellerProducts } from '@/hooks/useProducts';
import { ProductCard } from './ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight, Store } from 'lucide-react';

interface SellerProductsProps {
  sellerId: number;
  sellerName: string;
  currentProductId: number;
  limit?: number;
}

export function SellerProducts({ sellerId, sellerName, currentProductId, limit = 8 }: SellerProductsProps) {
  const { data, isLoading } = useSellerProducts(sellerId, { page: 1, limit: limit + 1, sortBy: 'newest' });
  const products = (data?.data ?? []).filter((p: any) => p.id !== currentProductId).slice(0, limit);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">More from {sellerName}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // A seller with only this one product has nothing to show here — no
  // empty shell, just skip the section entirely.
  if (products.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <Store className="h-5 w-5 text-primary" />
          More from {sellerName}
        </h2>
        <Link
          href={`/sellers/${sellerId}`}
          className="flex items-center gap-1 text-sm text-primary hover:underline"
        >
          Visit Store
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Same horizontal-scroll-on-mobile pattern as RelatedProducts, so the
          two sections read as one consistent system rather than two
          differently-behaving product strips. */}
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
