'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useWishlistStore } from '@/stores/wishlistStore';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Heart, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ProductCard } from '@/components/products/ProductCard';
import { AccountAppBar } from '@/components/account/AccountAppBar';

export default function WishlistPage() {
  const { isAuthenticated } = useAuthStore();
  const { items, isLoading, clearWishlist, fetchWishlist } = useWishlistStore();
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      await clearWishlist();
    } finally {
      setIsClearing(false);
      setConfirmClearOpen(false);
    }
  };

  // The wishlist store persists to localStorage, which can go stale across
  // devices/sessions — refresh from the backend whenever this page opens.
  useEffect(() => {
    if (isAuthenticated) {
      fetchWishlist();
    }
  }, [isAuthenticated, fetchWishlist]);

  if (!isAuthenticated) {
    return (
      <div className="py-12 text-center">
        <Heart className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="text-2xl font-bold">Tama ba konta atu haree lista hakarak</h2>
        <p className="mt-2 text-muted-foreground">Rai ita-nia produtu favoritu</p>
        <Button className="mt-4" asChild>
          <Link href="/login?redirect=/account/wishlist">Tama</Link>
        </Button>
      </div>
    );
  }

  if (isLoading && items.length === 0) {
    return (
      <div className="space-y-6">
        <AccountAppBar title="Lista hakarak" backHref="/account" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-12 text-center">
        <span className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-warning/15">
          <Heart className="h-10 w-10 text-warning-foreground" />
        </span>
        <h2 className="text-xl font-bold">Lista hakarak mamuk</h2>
        <p className="mt-2 text-muted-foreground">Baku ikon fuan iha produtu ruma atu rai iha ne'e.</p>
        <Button className="mt-4" asChild>
          <Link href="/products">Buka produtu</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <AccountAppBar
        title={`Lista hakarak (${items.length})`}
        backHref="/account"
        rightAction={
          <Button variant="ghost" size="icon" aria-label="Hamoos lista hakarak" onClick={() => setConfirmClearOpen(true)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {items.map((product) => (
          <ProductCard key={product.id} product={{ ...product, isActive: product.isActive ?? true, stock: product.stock ?? 0 }} />
        ))}
      </div>

      <ConfirmDialog
        open={confirmClearOpen}
        onOpenChange={setConfirmClearOpen}
        title="Hamoos lista hakarak"
        description="Ita boot iha serteza katak atu hamoos produtu hotu husi lista hakarak? Asaun ida-ne'e labele troka fali."
        confirmText="Hamoos hotu"
        onConfirm={handleClearAll}
        isLoading={isClearing}
      />
    </div>
  );
}
