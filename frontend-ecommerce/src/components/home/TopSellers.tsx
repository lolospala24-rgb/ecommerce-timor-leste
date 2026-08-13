'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useTopSellers } from '@/hooks/useSellers';
import { normalizeImageUrl } from '@/lib/images';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Store, Star, ChevronRight, Award } from 'lucide-react';

export function TopSellers() {
  const { data: sellers, isLoading } = useTopSellers(6);

  if (isLoading) {
    return (
      <section className="py-12 md:py-16 bg-muted/10">
        <div className="container-custom">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold sm:text-3xl">Top Sellers</h2>
            <p className="text-muted-foreground mt-1">Loading top sellers...</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!sellers || sellers.length === 0) {
    return null;
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <section className="py-12 md:py-16 bg-muted/10">
      <div className="container-custom">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-primary">
            <Award className="h-5 w-5" />
            <span className="text-sm font-medium">Trusted Sellers</span>
          </div>
          <h2 className="text-2xl font-bold sm:text-3xl">Top Sellers</h2>
          <p className="text-muted-foreground mt-1">
            Trusted sellers with the best products
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sellers.slice(0, 6).map((seller: any) => (
            <SellerCard key={seller.id} seller={seller} />
          ))}
        </div>

        <div className="text-center mt-6">
          <Link
            href="/sellers"
            className="text-primary hover:underline font-medium inline-flex items-center gap-1 group"
          >
            View All Sellers
            <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function SellerCard({ seller }: { seller: any }) {
  const [imageError, setImageError] = useState(false);
  const logoSrc = normalizeImageUrl(seller.storeLogo);

  return (
    <Link
      href={`/sellers/${seller.id}`}
      className="group block rounded-xl border bg-card p-5 transition-all hover:shadow-lg hover:-translate-y-1 hover:border-primary/20"
    >
      <div className="flex items-start gap-4">
        <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-primary/10">
          {logoSrc && !imageError ? (
            <Image
              src={logoSrc}
              alt={seller.storeName}
              fill
              className="object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Store className="h-6 w-6 text-primary" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold group-hover:text-primary transition-colors truncate">
              {seller.storeName}
            </h3>
            {seller.isVerified && (
              <Badge variant="default" className="text-xs bg-green-600 text-white px-1.5 py-0.5">
                ✓
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {seller.ownerName}
          </p>
          <div className="flex items-center gap-3 mt-1 text-sm">
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
              <span className="font-medium">{seller.rating?.toFixed(1) || '0'}</span>
            </div>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground text-xs">
              {seller.totalProducts} products
            </span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t pt-4">
        <span className="text-sm font-medium text-primary">
          ${seller.totalRevenue?.toLocaleString() || '0'} in sales
        </span>
        <span className="text-sm text-primary font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform">
          Visit Store
          <ChevronRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}