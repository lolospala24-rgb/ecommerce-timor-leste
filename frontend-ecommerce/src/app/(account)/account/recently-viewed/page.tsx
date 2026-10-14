'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useRecentlyViewedProducts } from '@/hooks/useRecentlyViewed';
import { AccountAppBar } from '@/components/account/AccountAppBar';

// The underlying store (useRecentlyViewed) only keeps an ordered list of
// product ids in localStorage — no per-view timestamp — so "Ohin/Horiseik"
// day grouping from the design isn't backed by real data and isn't faked
// here. This renders one flat, most-recent-first grid instead.
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
        <AccountAppBar title="Haree foin dadaun" backHref="/account" />
        <div className="grid grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!hasAny || products.length === 0) {
    return (
      <div>
        <AccountAppBar title="Haree foin dadaun" backHref="/account" />
        <div className="py-12 text-center">
          <Clock className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-bold">Seidauk haree produtu</h2>
          <Button className="mt-4" asChild>
            <Link href="/products">Buka produtu</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <AccountAppBar
        title="Haree foin dadaun"
        backHref="/account"
        rightAction={
          <button
            type="button"
            onClick={() => setConfirmClearOpen(true)}
            className="flex items-center gap-1 text-sm font-semibold text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Hamoos hotu
          </button>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        {products.map((product: any) => (
          <Link key={product.id} href={`/products/${product.slug}`} className="space-y-1.5">
            <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
              <Image
                src={product.thumbnail || '/images/placeholder.png'}
                alt={product.name}
                fill
                className="object-cover"
              />
            </div>
            <p className="line-clamp-2 text-xs font-medium leading-tight text-foreground">{product.name}</p>
            <p className="text-sm font-bold text-success">${product.price.toFixed(2)}</p>
          </Link>
        ))}
      </div>

      <ConfirmDialog
        open={confirmClearOpen}
        onOpenChange={setConfirmClearOpen}
        title="Hamoos haree foin dadaun"
        description="Ida-ne'e hamoos de'it ita-nia istória haree iha aparelhu ida-ne'e. La afeta lista hakarak, karreta, ka order."
        confirmText="Hamoos hotu"
        onConfirm={handleClearAll}
      />
    </div>
  );
}
