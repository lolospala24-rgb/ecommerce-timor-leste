'use client';

import Image from 'next/image';
import { useMemo } from 'react';
import { Trophy } from 'lucide-react';
import { useSellerProducts } from '@/hooks/useSellerProducts';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';

export function TopProductsCard() {
  const { data, isLoading } = useSellerProducts({ page: 1, limit: 50 });

  const top = useMemo(
    () => [...(data?.data || [])].sort((a, b) => b._count.orderItems - a._count.orderItems).slice(0, 5),
    [data],
  );

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-4 font-medium">Top Selling Products</h3>
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : top.length === 0 || top[0]._count.orderItems === 0 ? (
        <EmptyState icon={Trophy} title="No sales yet" description="Your best-selling products will be ranked here." />
      ) : (
        <div className="space-y-3">
          {top.map((product, idx) => (
            <div key={product.id} className="flex items-center gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                {idx + 1}
              </span>
              <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                {product.thumbnail && (
                  <Image src={product.thumbnail} alt={product.name} width={36} height={36} unoptimized className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{product.name}</p>
                <p className="text-xs text-muted-foreground">{product._count.orderItems} sold</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
