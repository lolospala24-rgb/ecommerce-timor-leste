'use client';

import { useState } from 'react';
import Link from 'next/link';
import { History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ProductGrid } from '@/components/products/ProductGrid';
import { useRecentlyViewedProducts } from '@/hooks/useRecentlyViewed';

export default function RecentlyViewedPage() {
  const { products, isLoading, hasAny, clearAll } = useRecentlyViewedProducts({ limit: 20 });
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const handleClearAll = () => {
    clearAll();
    setConfirmClearOpen(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!hasAny || products.length === 0) {
    return (
      <div className="py-12 text-center">
        <History className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="text-2xl font-bold">Nothing Viewed Yet</h2>
        <p className="mt-2 text-muted-foreground">Products you look at will show up here.</p>
        <Button className="mt-4" asChild>
          <Link href="/products">Browse Products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Recently Viewed</h1>
          <p className="text-muted-foreground">
            {products.length} {products.length === 1 ? 'product' : 'products'} you&apos;ve looked at
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setConfirmClearOpen(true)}>
          Clear All
        </Button>
      </div>

      <ProductGrid products={products} columns={3} />

      <ConfirmDialog
        open={confirmClearOpen}
        onOpenChange={setConfirmClearOpen}
        title="Clear Recently Viewed"
        description="This clears your browsing history on this device. It won't affect your wishlist, cart, or orders."
        confirmText="Clear All"
        onConfirm={handleClearAll}
      />
    </div>
  );
}
