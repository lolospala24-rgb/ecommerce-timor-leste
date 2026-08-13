'use client';

import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BookOpen } from 'lucide-react';
import { useGlobalLedger } from '@/hooks/useFinance';

const LEDGER_TYPES = ['all', 'SALE', 'COMMISSION', 'RELEASE', 'PAYOUT', 'REFUND', 'ADJUSTMENT'];

const TYPE_COLORS: Record<string, string> = {
  SALE: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  COMMISSION: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  RELEASE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  PAYOUT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  REFUND: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  ADJUSTMENT: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

export default function LedgerPage() {
  const [sellerId, setSellerId] = useState('');
  const [type, setType] = useState('all');
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching } = useGlobalLedger(
    sellerId ? parseInt(sellerId) : undefined,
    type,
    page,
    25,
  );

  const entries = data?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Financial Ledger</h1>
        <p className="text-muted-foreground">
          Every balance-affecting event across every seller, append-only. This is the source of truth
          Reconciliation checks every other page against.
        </p>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Seller ID</Label>
              <Input
                placeholder="Any seller"
                value={sellerId}
                onChange={(e) => { setSellerId(e.target.value); setPage(1); }}
                className="h-9 w-40"
                type="number"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={type} onValueChange={(v) => { setType(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger>
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
                  { label: 'Pending', value: entry.pendingDelta },
                  { label: 'Available', value: entry.availableDelta },
                  { label: 'Processing', value: entry.processingDelta },
                  { label: 'Paid Out', value: entry.paidOutDelta },
                  { label: 'Refunded', value: entry.refundedDelta },
                ].filter((m) => Math.abs(m.value) > 0.001);

                return (
                  <div key={entry.id} className="flex items-start justify-between gap-4 py-3 text-sm">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={TYPE_COLORS[entry.type] || ''} variant="outline">{entry.type}</Badge>
                        <Link href={`/sellers/${entry.sellerId}`} className="font-medium hover:underline">
                          {entry.seller?.storeName || `Seller #${entry.sellerId}`}
                        </Link>
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
