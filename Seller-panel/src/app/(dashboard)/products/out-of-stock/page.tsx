'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { ProductsTable } from '@/components/products/ProductsTable';
import { Skeleton } from '@/components/ui/skeleton';
import { useSellerProducts } from '@/hooks/useSellerProducts';

export default function OutOfStockPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useSellerProducts({ page, limit: 12, status: 'out-of-stock' });

  return (
    <div>
      <PageHeader title="Out of Stock" description="Products with zero stock — restock or deactivate them." />
      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : (
          <>
            <ProductsTable products={data?.data || []} />
            {data && (
              <div className="p-4">
                <PaginationControls
                  page={data.pagination.page}
                  totalPages={data.pagination.totalPages}
                  hasNext={data.pagination.hasNext}
                  hasPrev={data.pagination.hasPrev}
                  total={data.pagination.total}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
