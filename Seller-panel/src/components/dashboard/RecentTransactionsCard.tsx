'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { useSellerLedger } from '@/hooks/useFinance';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';

const TYPE_LABELS: Record<string, string> = {
  SALE: 'Sale recorded',
  COMMISSION: 'Platform commission',
  RELEASE: 'Earnings released',
  REFUND: 'Refund',
  COMMISSION_REVERSAL: 'Commission reversed',
  PAYOUT: 'Payout',
};

function netAmount(entry: { availableDelta: number; pendingDelta: number; processingDelta: number; paidOutDelta: number; refundedDelta: number }) {
  return entry.availableDelta + entry.pendingDelta + entry.processingDelta + entry.paidOutDelta + entry.refundedDelta;
}

export function RecentTransactionsCard() {
  const { data, isLoading } = useSellerLedger({ page: 1, limit: 6 });

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-medium">Recent Transactions</h3>
        <Link href="/finance/transactions" className="text-sm text-primary hover:underline">
          View all
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : !data?.data?.length ? (
        <EmptyState icon={Receipt} title="No transactions yet" description="Sales, commissions and payouts will appear here." />
      ) : (
        <div className="divide-y">
          {data.data.map((entry) => {
            const net = netAmount(entry);
            return (
              <div key={entry.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{TYPE_LABELS[entry.type] || entry.type}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.order ? `${entry.order.orderNumber} · ` : ''}
                    {format(new Date(entry.createdAt), 'MMM d, yyyy')}
                  </p>
                </div>
                <p className={cn('flex-shrink-0 text-sm font-medium tabular-nums', net >= 0 ? 'text-success' : 'text-destructive')}>
                  {net >= 0 ? '+' : ''}
                  ${net.toFixed(2)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
