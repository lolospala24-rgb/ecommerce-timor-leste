'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { OrdersTable } from '@/components/orders/OrdersTable';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useSellerOrders } from '@/hooks/useSellerOrders';
import type { OrderStatus } from '@/types/order.types';

const TABS: { value: OrderStatus | undefined; label: string }[] = [
  { value: undefined, label: 'All' },
  { value: 'PENDING', label: 'New' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'SHIPPING', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

function OrdersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = (searchParams.get('status') as OrderStatus | null) || undefined;
  const [page, setPage] = useState(1);

  const { data, isLoading } = useSellerOrders({ page, limit: 15, status });

  const setStatus = (value: OrderStatus | undefined) => {
    setPage(1);
    router.push(value ? `/orders?status=${value}` : '/orders');
  };

  return (
    <div>
      <PageHeader title="Orders" description="Track and fulfill orders placed on your store." />

      <div className="mb-4 flex gap-1 overflow-x-auto rounded-md border bg-card p-1">
        {TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => setStatus(tab.value)}
            className={cn(
              'flex-shrink-0 rounded px-3 py-1.5 text-sm font-medium transition-colors',
              status === tab.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : (
          <>
            <OrdersTable orders={data?.data || []} />
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

export default function OrdersPage() {
  return (
    <Suspense fallback={null}>
      <OrdersPageContent />
    </Suspense>
  );
}
