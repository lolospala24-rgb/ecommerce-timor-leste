'use client';

import Link from 'next/link';
import { Wallet, Clock, Loader2, Banknote, RotateCcw } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useSellerBalance, useSellerLedger } from '@/hooks/useFinance';
import { format } from 'date-fns';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

const TYPE_LABELS: Record<string, string> = {
  SALE: 'Sale recorded',
  COMMISSION: 'Platform commission',
  RELEASE: 'Earnings released',
  REFUND: 'Refund',
  COMMISSION_REVERSAL: 'Commission reversed',
  PAYOUT: 'Payout',
};

export default function EarningsPage() {
  const { data: balance, isLoading } = useSellerBalance();
  const { data: ledger } = useSellerLedger({ page: 1, limit: 8 });

  return (
    <div>
      <PageHeader
        title="Earnings"
        description="Your sales, platform commission, and balance breakdown."
        action={
          <Link href="/finance/payouts" className="text-sm font-medium text-primary hover:underline">
            Request a payout →
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isLoading || !balance ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)
        ) : (
          <>
            <StatCard label="Available" value={formatCurrency(balance.availableAmount)} icon={Wallet} tone="success" hint="Ready to withdraw" />
            <StatCard label="Pending" value={formatCurrency(balance.pendingAmount)} icon={Clock} tone="warning" hint="Awaiting delivery confirmation" />
            <StatCard label="Processing" value={formatCurrency(balance.processingAmount)} icon={Loader2} hint="Reserved by a payout request" />
            <StatCard label="Paid Out" value={formatCurrency(balance.paidOutAmount)} icon={Banknote} hint="All-time payouts received" />
          </>
        )}
      </div>

      {!isLoading && balance && balance.refundedAmount > 0 && (
        <div className="mb-6 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <RotateCcw className="h-4 w-4 flex-shrink-0" />
          {formatCurrency(balance.refundedAmount)} has been reversed from refunds all-time.
        </div>
      )}

      <div className="rounded-lg border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-medium">Recent Activity</h3>
          <Link href="/finance/transactions" className="text-sm text-primary hover:underline">
            View all transactions
          </Link>
        </div>
        {!ledger?.data?.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          <div className="divide-y">
            {ledger.data.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between py-2.5 text-sm first:pt-0 last:pb-0">
                <div>
                  <p className="font-medium">{TYPE_LABELS[entry.type] || entry.type}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.order ? `${entry.order.orderNumber} · ` : ''}
                    {format(new Date(entry.createdAt), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
