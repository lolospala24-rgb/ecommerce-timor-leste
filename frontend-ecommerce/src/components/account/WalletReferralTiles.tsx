'use client';

import Link from 'next/link';
import { Wallet, Gift } from 'lucide-react';
import { useReferralSummary } from '@/hooks/useReferral';

// The backend keeps a single pooled wallet balance (no separate
// "referral earnings" ledger) — the referral tile surfaces how many
// referrals have paid out instead of inventing a second dollar figure.
export function WalletReferralTiles() {
  const { data: summary, isLoading } = useReferralSummary();

  return (
    <div className="grid grid-cols-2 gap-3">
      <Link
        href="/account/wallet"
        className="rounded-2xl border bg-card p-4 transition-colors hover:border-primary/40"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Wallet className="h-[18px] w-[18px]" />
        </span>
        <p className="mt-2 text-xs font-medium text-muted-foreground">Saldu carteira</p>
        <p className="text-lg font-extrabold text-foreground">
          {isLoading ? '—' : `$${(summary?.walletCredit ?? 0).toFixed(2)}`}
        </p>
      </Link>
      <Link
        href="/account/referrals"
        className="rounded-2xl border bg-card p-4 transition-colors hover:border-primary/40"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-warning/15 text-warning-foreground">
          <Gift className="h-[18px] w-[18px]" />
        </span>
        <p className="mt-2 text-xs font-medium text-muted-foreground">Prémiu konvida</p>
        <p className="text-lg font-extrabold text-foreground">
          {isLoading ? '—' : `${summary?.totalRewarded ?? 0} belun`}
        </p>
      </Link>
    </div>
  );
}
