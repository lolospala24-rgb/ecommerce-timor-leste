'use client';

import { Star } from 'lucide-react';
import { useSellerDashboard } from '@/hooks/useDashboard';
import { Skeleton } from '@/components/ui/skeleton';

function computeRate(numerator: number, denominator: number) {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

export function StorePerformanceCard() {
  const { data, isLoading } = useSellerDashboard();

  if (isLoading || !data) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <Skeleton className="mb-3 h-5 w-32" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const { orders, reviews, products } = data.overview;
  const fulfillmentRate = computeRate(orders.delivered, orders.total);
  const cancellationRate = computeRate(orders.cancelled, orders.total);
  const activeRate = computeRate(products.active, products.total);

  const rows = [
    { label: 'Order fulfillment rate', value: `${fulfillmentRate}%`, tone: fulfillmentRate >= 80 ? 'success' : 'default' },
    { label: 'Cancellation rate', value: `${cancellationRate}%`, tone: cancellationRate > 15 ? 'destructive' : 'default' },
    { label: 'Active catalog', value: `${activeRate}%`, tone: 'default' },
  ] as const;

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-4 font-medium">Store Performance</h3>

      <div className="mb-4 flex items-center gap-3 rounded-md bg-accent/60 p-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/15 text-warning">
          <Star className="h-5 w-5 fill-current" />
        </div>
        <div>
          <p className="text-lg font-semibold tabular-nums">{reviews.averageRating.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">from {reviews.total} review{reviews.total === 1 ? '' : 's'}</p>
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-medium tabular-nums">{row.value}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={
                  row.tone === 'destructive' ? 'h-full bg-destructive' : row.tone === 'success' ? 'h-full bg-success' : 'h-full bg-primary'
                }
                style={{ width: row.value }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
