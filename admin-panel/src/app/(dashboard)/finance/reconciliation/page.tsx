'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, AlertTriangle, RefreshCw, Wrench, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useReconciliation, useResyncBalance } from '@/hooks/useFinance';

type MismatchBucket = 'pending' | 'available' | 'paidOut' | 'refunded';

export default function ReconciliationPage() {
  const { data, isLoading, isFetching, refetch } = useReconciliation();
  const resync = useResyncBalance();

  const [resyncTarget, setResyncTarget] = useState<{ sellerId: number; storeName: string; bucket: MismatchBucket } | null>(null);
  const [resyncReason, setResyncReason] = useState('');
  const [resyncConfirmed, setResyncConfirmed] = useState(false);

  const closeResyncDialog = () => {
    setResyncTarget(null);
    setResyncReason('');
    setResyncConfirmed(false);
  };

  const handleResync = async () => {
    if (!resyncTarget || !resyncReason.trim() || !resyncConfirmed) return;
    await resync.mutateAsync({
      sellerId: resyncTarget.sellerId,
      bucket: resyncTarget.bucket,
      reason: resyncReason.trim(),
      confirm: true,
    });
    closeResyncDialog();
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reconciliation</h1>
          <p className="text-muted-foreground">
            Cross-checks every seller&apos;s stored balance against what their own ledger actually sums to,
            plus a couple of known orphan patterns. This is what should catch a data integrity problem
            before it becomes a payout mistake.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Re-run
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data ? (
        <p className="text-center text-muted-foreground py-12">Unable to run reconciliation.</p>
      ) : (
        <>
          <Card className={data.status === 'CLEAN' ? 'border-green-300' : 'border-red-300'}>
            <CardContent className="p-6 flex items-center gap-4">
              {data.status === 'CLEAN' ? (
                <CheckCircle2 className="h-10 w-10 text-green-600 flex-shrink-0" />
              ) : (
                <AlertTriangle className="h-10 w-10 text-red-600 flex-shrink-0" />
              )}
              <div>
                <p className="text-xl font-bold">{data.status === 'CLEAN' ? 'All Clean' : 'Issues Found'}</p>
                <p className="text-sm text-muted-foreground">
                  {data.sellersChecked} sellers checked · {data.balanceMismatches.length} balance mismatch
                  {data.balanceMismatches.length === 1 ? '' : 'es'} · {data.missingSaleLedgerEntries.length} missing
                  sale entries · {data.missingRefundLedgerEntries.length} missing refund entries
                </p>
              </div>
            </CardContent>
          </Card>

          {data.balanceMismatches.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Balance Mismatches</CardTitle>
                <CardDescription>
                  Stored SellerBalance doesn&apos;t match what that seller&apos;s own ledger entries sum to.
                  Resolve via a Manual Adjustment with a clear reason, referencing this report.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.balanceMismatches.map((m) => (
                  <div key={m.sellerId} className="rounded-lg border border-red-200 p-4">
                    <div className="flex items-center justify-between">
                      <Link href={`/sellers/${m.sellerId}`} className="font-semibold hover:underline">
                        {m.storeName || `Seller #${m.sellerId}`}
                      </Link>
                      <Link href={`/finance/adjustments?sellerId=${m.sellerId}`}>
                        <Button size="sm" variant="outline">Create Adjustment</Button>
                      </Link>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-5 text-sm">
                      {Object.entries(m.diffs).map(([bucket, diff]) => {
                        if (Math.abs(diff) < 0.01) return null;
                        // 'processing' has no resync path — it's exclusively
                        // owned by the payout lifecycle, never manually set.
                        const resyncable = bucket !== 'processing';
                        return (
                          <div key={bucket} className="rounded border p-2">
                            <p className="text-xs text-muted-foreground capitalize">{bucket}</p>
                            <p className="font-mono">
                              stored: {m.storedBalance[bucket]?.toFixed(2)}
                            </p>
                            <p className="font-mono text-muted-foreground">
                              ledger sum: {m.ledgerSum[bucket]?.toFixed(2)}
                            </p>
                            <Badge variant="destructive" className="mt-1">
                              diff {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                            </Badge>
                            {resyncable && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="mt-1 h-7 w-full text-xs"
                                onClick={() => setResyncTarget({ sellerId: m.sellerId, storeName: m.storeName, bucket: bucket as MismatchBucket })}
                              >
                                <Wrench className="mr-1 h-3 w-3" />
                                Resync to ledger
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {data.missingSaleLedgerEntries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Orders Missing a SALE Ledger Entry</CardTitle>
                <CardDescription>Payment was confirmed (commission was snapshotted) but no SALE row exists.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.missingSaleLedgerEntries.map((o) => (
                  <div key={o.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                    <span>{o.orderNumber}</span>
                    <Link href={`/orders/${o.id}`} className="text-primary hover:underline">View order</Link>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {data.missingRefundLedgerEntries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Approved Refunds Missing a REFUND Ledger Entry</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.missingRefundLedgerEntries.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                    <span>Refund #{r.id} — ${r.amount.toFixed(2)}</span>
                    <Link href={`/orders/${r.orderId}`} className="text-primary hover:underline">View order</Link>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Dialog open={!!resyncTarget} onOpenChange={(open) => !open && closeResyncDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resync {resyncTarget?.bucket}</DialogTitle>
            <DialogDescription>
              Forces {resyncTarget?.storeName || `Seller #${resyncTarget?.sellerId}`}&apos;s stored{' '}
              <strong>{resyncTarget?.bucket}</strong> balance to match what their ledger already sums to.
              This is different from a normal Adjustment — it overrides the stored value directly rather
              than recording a new movement, specifically for closing a pre-existing gap like this one.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Reason (required, shown in the ledger and audit log)</Label>
              <Textarea
                value={resyncReason}
                onChange={(e) => setResyncReason(e.target.value)}
                rows={2}
                placeholder="e.g. Reconciliation flagged this — order behind the discrepancy was deleted outside the app"
              />
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="resync-confirm"
                checked={resyncConfirmed}
                onCheckedChange={(checked) => setResyncConfirmed(checked === true)}
              />
              <Label htmlFor="resync-confirm" className="text-sm font-normal leading-snug">
                I understand this overrides the stored balance directly and cannot be undone by a normal
                Adjustment.
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeResyncDialog}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!resyncReason.trim() || !resyncConfirmed || resync.isPending}
              onClick={handleResync}
            >
              {resync.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Resync Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
