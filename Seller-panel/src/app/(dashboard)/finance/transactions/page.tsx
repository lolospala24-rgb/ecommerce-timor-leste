'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { PageHeader } from '@/components/shared/PageHeader';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { EmptyState } from '@/components/shared/EmptyState';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSellerLedger } from '@/hooks/useFinance';

const TYPE_LABELS: Record<string, string> = {
  SALE: 'Sale',
  COMMISSION: 'Commission',
  RELEASE: 'Release',
  REFUND: 'Refund',
  COMMISSION_REVERSAL: 'Commission reversal',
  PAYOUT: 'Payout',
};

function DeltaCell({ label, value }: { label: string; value: number }) {
  if (value === 0) return <TableCell className="text-center text-muted-foreground/40">—</TableCell>;
  return (
    <TableCell className={cn('text-right tabular-nums', value > 0 ? 'text-success' : 'text-destructive')}>
      {value > 0 ? '+' : ''}
      {value.toFixed(2)}
    </TableCell>
  );
}

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useSellerLedger({ page, limit: 20 });

  return (
    <div>
      <PageHeader title="Transactions" description="Full ledger of every balance movement on your account." />

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !data?.data?.length ? (
          <EmptyState icon={Receipt} title="No transactions yet" description="Every sale, commission, and payout will be recorded here." />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Processing</TableHead>
                  <TableHead className="text-right">Paid Out</TableHead>
                  <TableHead className="text-right">Refunded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(entry.createdAt), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-sm font-medium">{TYPE_LABELS[entry.type] || entry.type}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{entry.order?.orderNumber || '—'}</TableCell>
                    <DeltaCell label="pending" value={entry.pendingDelta} />
                    <DeltaCell label="available" value={entry.availableDelta} />
                    <DeltaCell label="processing" value={entry.processingDelta} />
                    <DeltaCell label="paidOut" value={entry.paidOutDelta} />
                    <DeltaCell label="refunded" value={entry.refundedDelta} />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
          </>
        )}
      </div>
    </div>
  );
}
