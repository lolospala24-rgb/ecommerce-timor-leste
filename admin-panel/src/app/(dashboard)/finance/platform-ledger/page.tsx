'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BookOpen, Loader2, Send, Percent, Truck, Receipt } from 'lucide-react';
import {
  usePlatformBalance,
  usePlatformLedger,
  useRecordRemittance,
} from '@/hooks/useFinance';

const LEDGER_TYPES = [
  'all',
  'COMMISSION',
  'SHIPPING_COLLECTED',
  'TAX_COLLECTED',
  'COMMISSION_REVERSAL',
  'SHIPPING_REVERSAL',
  'TAX_REVERSAL',
  'REMITTANCE',
  'ADJUSTMENT',
  'RESYNC',
];

const TYPE_COLORS: Record<string, string> = {
  COMMISSION: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  SHIPPING_COLLECTED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  TAX_COLLECTED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  COMMISSION_REVERSAL: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  SHIPPING_REVERSAL: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  TAX_REVERSAL: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  REMITTANCE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  ADJUSTMENT: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  RESYNC: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

function BalanceCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className={`mt-1 text-2xl font-bold ${accent || ''}`}>
        ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
    </div>
  );
}

export default function PlatformLedgerPage() {
  const searchParams = useSearchParams();
  const [type, setType] = useState(searchParams.get('type') || 'all');
  const [page, setPage] = useState(1);

  const [bucket, setBucket] = useState<'shipping' | 'tax'>('shipping');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const { data: balance, isLoading: balanceLoading } = usePlatformBalance();
  const { data, isLoading, isFetching } = usePlatformLedger(type, page, 25);
  const recordRemittance = useRecordRemittance();

  const entries = data?.data || [];
  const amountNumber = parseFloat(amount);
  const heldAvailable = bucket === 'shipping' ? balance?.shippingHeld ?? 0 : balance?.taxHeld ?? 0;
  const canSubmit =
    Number.isFinite(amountNumber) && amountNumber > 0 && amountNumber <= heldAvailable + 0.001 && reason.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await recordRemittance.mutateAsync({ bucket, amount: amountNumber, reason: reason.trim() });
    setAmount('');
    setReason('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Ledger</h1>
        <p className="text-muted-foreground">
          Where commission, shipping, and tax collected from customers actually sit — held until an admin
          records a remittance (money actually paid to a courier or tax authority). Append-only, same pattern
          as the Seller Ledger.
        </p>
      </div>

      {balanceLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : balance ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <BalanceCard icon={Percent} label="Commission Revenue" value={balance.commissionRevenue} accent="text-primary" />
          <BalanceCard icon={Truck} label="Shipping Held" value={balance.shippingHeld} accent="text-amber-600" />
          <BalanceCard icon={Truck} label="Shipping Remitted" value={balance.shippingRemitted} />
          <BalanceCard icon={Receipt} label="Tax Held" value={balance.taxHeld} accent="text-amber-600" />
          <BalanceCard icon={Receipt} label="Tax Remitted" value={balance.taxRemitted} />
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Record Remittance
          </CardTitle>
          <CardDescription>
            Record money you&apos;ve already paid out — to a courier for shipping, or to the tax authority.
            This app has no courier-invoicing or tax-filing integration, so this is a manual record of a
            real-world payment, the same way a bank transfer payout is recorded after it&apos;s actually sent.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Bucket</Label>
              <Select value={bucket} onValueChange={(v) => setBucket(v as 'shipping' | 'tax')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="shipping">Shipping (${(balance?.shippingHeld ?? 0).toFixed(2)} held)</SelectItem>
                  <SelectItem value="tax">Tax (${(balance?.taxHeld ?? 0).toFixed(2)} held)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 150.00"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Reason (required, shown in the ledger and audit log)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="e.g. Paid DHL Express Timor-Leste invoice #INV-2026-08, bank transfer ref TL9928"
            />
          </div>
          {amount && amountNumber > heldAvailable && (
            <Alert variant="destructive">
              <AlertDescription>
                Amount exceeds the ${heldAvailable.toFixed(2)} currently held in this bucket.
              </AlertDescription>
            </Alert>
          )}
          <Button disabled={!canSubmit || recordRemittance.isPending} onClick={handleSubmit}>
            {recordRemittance.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Record Remittance
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Ledger
              </CardTitle>
              <CardDescription>Every platform-balance-affecting event, append-only.</CardDescription>
            </div>
            <div className="ml-auto space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={type} onValueChange={(v) => { setType(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEDGER_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t === 'all' ? 'All types' : t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground pb-2">
              {data?.pagination?.total ?? 0} entr{(data?.pagination?.total ?? 0) === 1 ? 'y' : 'ies'}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No entries match this filter</h3>
            </div>
          ) : (
            <div className={`divide-y transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
              {entries.map((entry) => {
                const movements = [
                  { label: 'Commission', value: entry.commissionDelta },
                  { label: 'Shipping Held', value: entry.shippingHeldDelta },
                  { label: 'Shipping Remitted', value: entry.shippingRemittedDelta },
                  { label: 'Tax Held', value: entry.taxHeldDelta },
                  { label: 'Tax Remitted', value: entry.taxRemittedDelta },
                ].filter((m) => Math.abs(m.value) > 0.001);

                return (
                  <div key={entry.id} className="flex items-start justify-between gap-4 py-3 text-sm">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={TYPE_COLORS[entry.type] || ''} variant="outline">{entry.type}</Badge>
                        {entry.order?.orderNumber && (
                          <span className="text-muted-foreground font-mono text-xs">{entry.order.orderNumber}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{entry.note}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {movements.length === 0 ? (
                        <span className="text-muted-foreground">$0.00</span>
                      ) : (
                        movements.map((m) => (
                          <div key={m.label} className={m.value >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {m.label} {m.value >= 0 ? '+' : ''}{m.value.toFixed(2)}
                          </div>
                        ))
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">{new Date(entry.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm text-muted-foreground">
                Page {page} of {data.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                disabled={page === data.pagination.totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
