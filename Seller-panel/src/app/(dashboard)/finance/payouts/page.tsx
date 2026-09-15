'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Loader2, Wallet, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { EmptyState } from '@/components/shared/EmptyState';
import { PayoutStatusBadge } from '@/components/shared/StatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useRequestPayout, useSellerBalance, useSellerPayouts } from '@/hooks/useFinance';
import { useMyStore } from '@/hooks/useSellerStore';
import { maskAccountNumber } from '@/lib/utils';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

export default function PayoutsPage() {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');

  const { data: balance } = useSellerBalance();
  const { data: store } = useMyStore();
  const { data: payouts, isLoading } = useSellerPayouts({ page, limit: 15 });
  const requestPayout = useRequestPayout();

  const hasBankDetails = !!(store?.bankName && store?.bankAccountName && store?.bankAccountNumber);
  const available = balance?.availableAmount ?? 0;

  const handleRequest = () => {
    const value = Number(amount);
    if (!value || value <= 0) return;
    requestPayout.mutate(value, {
      onSuccess: () => {
        setOpen(false);
        setAmount('');
      },
    });
  };

  return (
    <div>
      <PageHeader
        title="Payouts"
        description="Withdraw your available balance to your bank account."
        action={
          <Button onClick={() => setOpen(true)} disabled={!hasBankDetails || available <= 0}>
            <Wallet className="mr-2 h-4 w-4" /> Request Payout
          </Button>
        }
      />

      {!hasBankDetails && (
        <div className="mb-6 flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          Add your bank details in{' '}
          <Link href="/my-store/settings" className="font-medium underline">
            Store Settings
          </Link>{' '}
          before requesting a payout.
        </div>
      )}

      <div className="mb-6 rounded-lg border bg-card p-5">
        <p className="text-sm text-muted-foreground">Available to withdraw</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums">{formatCurrency(available)}</p>
      </div>

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !payouts?.data?.length ? (
          <EmptyState icon={Wallet} title="No payouts yet" description="Your payout requests and their status will appear here." />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requested</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Processed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.data.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(payout.requestedAt), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-sm font-medium tabular-nums">{formatCurrency(payout.amount)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {payout.bankName} · {maskAccountNumber(payout.bankAccountNumber)}
                    </TableCell>
                    <TableCell>
                      <PayoutStatusBadge status={payout.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {payout.processedAt ? format(new Date(payout.processedAt), 'MMM d, yyyy') : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="p-4">
              <PaginationControls
                page={payouts.pagination.page}
                totalPages={payouts.pagination.totalPages}
                hasNext={payouts.pagination.hasNext}
                hasPrev={payouts.pagination.hasPrev}
                total={payouts.pagination.total}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Request Payout</DialogTitle>
            <DialogDescription>
              Up to {formatCurrency(available)} available. Funds will be sent to {store?.bankName} ending in {store?.bankAccountNumber?.slice(-4)}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount (USD)</Label>
            <Input
              id="amount"
              type="number"
              min="0.01"
              max={available}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={requestPayout.isPending}>
              Cancel
            </Button>
            <Button onClick={handleRequest} disabled={requestPayout.isPending || !amount || Number(amount) > available}>
              {requestPayout.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
