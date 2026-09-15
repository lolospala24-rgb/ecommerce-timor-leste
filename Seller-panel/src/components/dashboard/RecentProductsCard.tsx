'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSellerProducts } from '@/hooks/useSellerProducts';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Box } from 'lucide-react';

export function RecentProductsCard() {
  const { data, isLoading } = useSellerProducts({ page: 1, limit: 5 });

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-medium">Recent Products</h3>
        <Link href="/products" className="text-sm text-primary hover:underline">
          View all
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !data?.data?.length ? (
        <EmptyState icon={Box} title="No products yet" description="Products you add will show up here." />
      ) : (
        <div className="divide-y">
          {data.data.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="-mx-2 flex items-center gap-3 rounded-md px-2 py-3 transition-colors first:pt-0 last:pb-0 hover:bg-accent/40"
            >
              <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                {product.thumbnail && (
                  <Image src={product.thumbnail} alt={product.name} width={40} height={40} unoptimized className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{product.name}</p>
                <p className="text-xs text-muted-foreground">{product.category?.name}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <p className="text-sm font-medium tabular-nums">${product.price.toFixed(2)}</p>
                <Badge variant={product.stock === 0 ? 'destructive' : 'secondary'} className="text-[11px]">
                  {product.stock === 0 ? 'Out of stock' : `${product.stock} in stock`}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
