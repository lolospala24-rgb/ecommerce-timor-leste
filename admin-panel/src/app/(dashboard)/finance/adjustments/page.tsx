'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, SlidersHorizontal, AlertCircle } from 'lucide-react';
import { useCreateAdjustment, useGlobalLedger } from '@/hooks/useFinance';

const BUCKETS = [
  { value: 'pending', label: 'Pending' },
  { value: 'available', label: 'Available' },
  { value: 'paidOut', label: 'Paid Out' },
  { value: 'refunded', label: 'Refunded' },
];

export default function AdjustmentsPage() {
  const searchParams = useSearchParams();
  const [sellerId, setSellerId] = useState('');
  const [bucket, setBucket] = useState<'pending' | 'available' | 'paidOut' | 'refunded'>('available');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    const fromUrl = searchParams.get('sellerId');
    if (fromUrl) setSellerId(fromUrl);
  }, [searchParams]);

  const createAdjustment = useCreateAdjustment();
  const { data: history, isLoading } = useGlobalLedger(undefined, 'ADJUSTMENT', 1, 20);

  const amountNumber = parseFloat(amount);
  const canSubmit = sellerId && Number.isFinite(amountNumber) && amountNumber !== 0 && reason.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await createAdjustment.mutateAsync({
      sellerId: parseInt(sellerId),
      bucket,
      amount: amountNumber,
      reason: reason.trim(),
    });
    setAmount('');
    setReason('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manual Adjustments</h1>
        <p className="text-muted-foreground">
          A correction to a seller&apos;s balance, always backed by a ledger entry with a mandatory reason.
          Never edits history — it appends a new, auditable entry.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5" />
            Create Adjustment
          </CardTitle>
          <CardDescription>
            Use a positive amount to add to the bucket, negative to subtract. &quot;Processing&quot; can&apos;t be
            adjusted here — it&apos;s exclusively controlled by the payout lifecycle.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Seller ID</Label>
              <Input type="number" value={sellerId} onChange={(e) => setSellerId(e.target.value)} placeholder="e.g. 13" />
            </div>
            <div className="space-y-1.5">
              <Label>Bucket</Label>
              <Select value={bucket} onValueChange={(v) => setBucket(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BUCKETS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Amount (signed)</Label>
              <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. -75.87" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Reason (required, shown in the ledger and audit log)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="e.g. Reconciliation #42 — order deleted outside the app, writing off orphaned pending balance" />
          </div>
          <Button disabled={!canSubmit || createAdjustment.isPending} onClick={handleSubmit}>
            {createAdjustment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Adjustment
          </Button>
        </CardContent>
      </Card>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Adjustments are for correcting genuine bookkeeping errors (e.g. a mismatch surfaced by
          Reconciliation) — not a way to grant a seller money outside the normal sale/commission/payout flow.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Recent Adjustments</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : !history?.data || history.data.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No manual adjustments have been made yet.</p>
          ) : (
            <div className="divide-y">
              {history.data.map((entry) => {
                const movements = [
                  { label: 'Pending', value: entry.pendingDelta },
                  { label: 'Available', value: entry.availableDelta },
                  { label: 'Paid Out', value: entry.paidOutDelta },
                  { label: 'Refunded', value: entry.refundedDelta },
                ].filter((m) => Math.abs(m.value) > 0.001);
                return (
                  <div key={entry.id} className="flex items-start justify-between gap-4 py-3 text-sm">
                    <div>
                      <Link href={`/sellers/${entry.sellerId}`} className="font-medium hover:underline">
                        {entry.seller?.storeName || `Seller #${entry.sellerId}`}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-0.5">{entry.note}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {movements.map((m) => (
                        <div key={m.label} className={m.value >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {m.label} {m.value >= 0 ? '+' : ''}{m.value.toFixed(2)}
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground mt-0.5">{new Date(entry.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
