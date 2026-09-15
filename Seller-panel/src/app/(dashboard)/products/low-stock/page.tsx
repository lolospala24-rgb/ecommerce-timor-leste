'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ProductsTable } from '@/components/products/ProductsTable';
import { Skeleton } from '@/components/ui/skeleton';
import { useSellerProducts } from '@/hooks/useSellerProducts';

// There's no backend `low-stock` filter (confirmed — only `active` /
// `inactive` / `out-of-stock` exist), so this scans the seller's active
// catalog and filters client-side against each product's own
// lowStockThreshold (falling back to the same 10-unit default the
// dashboard's overview card uses).
export default function LowStockPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useSellerProducts({ page, limit: 50, status: 'active' });

  const lowStockProducts = useMemo(
    () => (data?.data || []).filter((p) => p.stock > 0 && p.stock < (p.lowStockThreshold ?? 10)),
    [data],
  );

  return (
    <div>
      <PageHeader title="Low Stock" description="Active products running low — restock before they sell out." />
      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : (
          <ProductsTable products={lowStockProducts} />
        )}
      </div>
      {data && data.pagination.totalPages > 1 && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Scanning page {page} of {data.pagination.totalPages} of your active catalog —{' '}
          <button className="text-primary hover:underline" onClick={() => setPage((p) => p + 1)}>
            scan next page
          </button>
        </p>
      )}
    </div>
  );
}
