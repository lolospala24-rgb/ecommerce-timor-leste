'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useReferralSummary, useWalletTransactions, type WalletTransactionItem } from '@/hooks/useReferral';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/shared/Pagination';
import { Wallet, ArrowUpRight, ArrowDownRight, Gift } from 'lucide-react';

const TRANSACTION_LABELS: Record<WalletTransactionItem['type'], string> = {
  REFERRAL_WELCOME: 'Welcome Reward',
  REFERRAL_REWARD: 'Referral Reward',
  CHECKOUT_REDEMPTION: 'Checkout',
  ADMIN_ADJUSTMENT: 'Adjustment',
};

export default function WalletPage() {
  const [page, setPage] = useState(1);
  const { data: summary, isLoading: isSummaryLoading } = useReferralSummary();
  const { data: transactions, isLoading: isTransactionsLoading } = useWalletTransactions(page, 20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Wallet</h1>
        <p className="text-muted-foreground">Your Lolospala wallet credit balance and history</p>
      </div>

      <Card className="border-primary/20 bg-primary/5 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Wallet className="h-7 w-7" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Available Credit</p>
            {isSummaryLoading ? (
              <Skeleton className="mt-1 h-9 w-28" />
            ) : (
              <p className="text-3xl font-bold text-primary">${(summary?.walletCredit ?? 0).toFixed(2)}</p>
            )}
          </div>
        </div>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Transaction History</h2>

        {isTransactionsLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : !transactions?.items || transactions.items.length === 0 ? (
          <div className="rounded-lg border py-12 text-center">
            <Gift className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">No wallet activity yet</h3>
            <p className="mt-1 text-muted-foreground">
              Invite friends to Lolospala to start earning wallet credit.
            </p>
            <Button className="mt-4" asChild>
              <Link href="/account/referrals">Invite Friends</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.items.map((tx) => {
              const isCredit = tx.amount > 0;
              return (
                <Card key={tx.id}>
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={
                          isCredit
                            ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/10 text-success'
                            : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground'
                        }
                      >
                        {isCredit ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="font-medium">{TRANSACTION_LABELS[tx.type] ?? tx.type}</p>
                        <p className="text-xs text-muted-foreground">
                          {tx.note || new Date(tx.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={isCredit ? 'font-semibold text-success' : 'font-semibold text-foreground'}>
                        {isCredit ? '+' : ''}
                        ${tx.amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">Balance: ${tx.balanceAfter.toFixed(2)}</p>
                    </div>
                  </CardContent>
                </Card>
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
