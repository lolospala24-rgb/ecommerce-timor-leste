'use client';

import { useQueries } from '@tanstack/react-query';
import api from '@/lib/api';
import { normalizeProduct, unwrapApiData } from '@/lib/product';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { ProductCard } from './ProductCard';
import { Skeleton } from '@/components/ui/skeleton';

interface RecentlyViewedSectionProps {
  /** Hide this product from its own detail page's "recently viewed" list. */
  excludeId?: number;
  limit?: number;
}

export function RecentlyViewedSection({ excludeId, limit = 10 }: RecentlyViewedSectionProps) {
  const { ids } = useRecentlyViewed();
  const displayIds = ids.filter((id) => id !== excludeId).slice(0, limit);

  const results = useQueries({
    queries: displayIds.map((id) => ({
      queryKey: ['products', id],
      queryFn: async () => {
        const response = await api.get(`/products/${id}`);
        return normalizeProduct(unwrapApiData(response));
      },
      staleTime: 60_000,
    })),
  });

  const isLoading = displayIds.length > 0 && results.some((r) => r.isLoading);
  // A product can 404 (deleted/deactivated since it was viewed) — drop it
  // rather than showing a broken card.
  const products = results
    .map((r) => r.data)
    .filter((p): p is NonNullable<typeof p> => !!p && (p as any).id);

  if (displayIds.length === 0) return null;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Recently Viewed</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-5">
          {[...Array(Math.min(displayIds.length, 5))].map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Recently Viewed</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-5">
        {products.map((product: any) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
