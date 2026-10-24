'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useReferralSummary, useWalletTransactions, type WalletTransactionItem } from '@/hooks/useReferral';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/shared/Pagination';
import { Wallet, ArrowUpRight, ArrowDownRight, Gift, Eye, EyeOff } from 'lucide-react';
import { AccountAppBar } from '@/components/account/AccountAppBar';
import { cn } from '@/lib/utils';

const TRANSACTION_LABELS: Record<WalletTransactionItem['type'], string> = {
  REFERRAL_WELCOME: 'Prémiu Benvindu',
  REFERRAL_REWARD: 'Prémiu Konvida',
  REFERRAL_REWARD_REVERSED: 'Prémiu Kansela',
  CHECKOUT_REDEMPTION: 'Checkout',
  ADMIN_ADJUSTMENT: 'Ajustamentu',
};

const FILTERS = [
  { key: 'all', label: 'Hotu' },
  { key: 'in', label: 'Osan tama' },
  { key: 'out', label: 'Osan sai' },
] as const;

export default function WalletPage() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all');
  const [hideBalance, setHideBalance] = useState(false);
  const { data: summary, isLoading: isSummaryLoading } = useReferralSummary();
  const { data: transactions, isLoading: isTransactionsLoading } = useWalletTransactions(page, 20);

  const filteredItems = useMemo(() => {
    const items = transactions?.items ?? [];
    if (filter === 'in') return items.filter((tx) => tx.amount > 0);
    if (filter === 'out') return items.filter((tx) => tx.amount < 0);
    return items;
  }, [transactions, filter]);

  return (
    <div className="space-y-5">
      <AccountAppBar title="Carteira" backHref="/account" />

      <div className="relative overflow-hidden rounded-[20px] bg-primary p-6 text-primary-foreground">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-primary-foreground/80">Saldu disponivel</p>
            {isSummaryLoading ? (
              <Skeleton className="mt-2 h-9 w-32 bg-white/20" />
            ) : (
              <p className="mt-1 text-[34px] font-extrabold leading-none">
                {hideBalance ? '$ ••••' : `$${(summary?.walletCredit ?? 0).toFixed(2)}`}
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label={hideBalance ? 'Hatudu saldu' : 'Subar saldu'}
            onClick={() => setHideBalance((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-primary-foreground"
          >
            {hideBalance ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-primary/5 p-3 text-sm text-primary">
        Uza saldu carteira atu selu iha checkout, la presiza osan-mean.
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Transasaun</h2>
          <div className="flex gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                  filter === f.key ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {isTransactionsLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-2xl border py-12 text-center">
            <Gift className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">Seidauk iha movimentu</h3>
            <p className="mt-1 text-muted-foreground">Konvida belun ba Lolóspala atu hahu simu saldu carteira.</p>
            <Button className="mt-4" asChild>
              <Link href="/account/referrals">Konvida belun</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredItems.map((tx) => {
              const isCredit = tx.amount > 0;
              return (
                <div key={tx.id} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                        isCredit ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {isCredit ? <ArrowDownRight className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {TRANSACTION_LABELS[tx.type] ?? tx.type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tx.note || new Date(tx.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={cn('font-semibold', isCredit ? 'text-success' : 'text-foreground')}>
                      {isCredit ? '+' : ''}
                      ${tx.amount.toFixed(2)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {transactions && transactions.totalPages > 1 && (
          <Pagination
            currentPage={page}
            totalPages={transactions.totalPages}
            totalItems={transactions.total}
            pageSize={transactions.limit}
            onPageChange={setPage}
            showTotal={false}
            className="mt-6"
          />
        )}
      </div>
    </div>
  );
}
