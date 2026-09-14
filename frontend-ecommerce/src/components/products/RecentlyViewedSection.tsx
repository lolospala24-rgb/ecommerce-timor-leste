'use client';

import { useRecentlyViewedProducts } from '@/hooks/useRecentlyViewed';
import { ProductCard } from './ProductCard';
import { Skeleton } from '@/components/ui/skeleton';

interface RecentlyViewedSectionProps {
  /** Hide this product from its own detail page's "recently viewed" list. */
  excludeId?: number;
  limit?: number;
  /**
   * Own a full-width `<section>` + `.container-custom` wrapper (matching
   * TopSellers/HomepageSections) for standalone placement, e.g. on the
   * homepage. Off by default so the existing ProductDetail.tsx usage (which
   * places this bare inside its own layout) is unaffected. Whether wrapped
   * or not, this still renders nothing at all — never an empty padded
   * section — when there's nothing to show.
   */
  wrapInSection?: boolean;
}

export function RecentlyViewedSection({ excludeId, limit = 10, wrapInSection = false }: RecentlyViewedSectionProps) {
  const { products, isLoading, hasAny } = useRecentlyViewedProducts({ excludeId, limit });

  if (!hasAny) return null;
  if (!isLoading && products.length === 0) return null;

  const content = isLoading ? (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Recently Viewed</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-4 xl:grid-cols-6">
        {[...Array(Math.min(limit, 6))].map((_, i) => (
          <Skeleton key={i} className="h-80 rounded-lg" />
        ))}
      </div>
    </div>
  ) : (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Recently Viewed</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-4 xl:grid-cols-6">
        {products.map((product: any) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );

  if (!wrapInSection) return content;

  return (
    <section className="py-12 md:py-16">
      <div className="container-custom">{content}</div>
    </section>
  );
}
