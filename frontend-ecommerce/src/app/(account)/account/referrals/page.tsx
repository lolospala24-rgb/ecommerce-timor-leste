'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useReferralSummary, useReferralHistory } from '@/hooks/useReferral';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/shared/Pagination';
import { ReferralShareModal } from '@/components/account/ReferralShareModal';
import { AccountAppBar } from '@/components/account/AccountAppBar';
import { StatusPill } from '@/components/account/StatusPill';
import { copyToClipboard } from '@/lib/utils';
import { trackReferralRewardEarned } from '@/lib/analytics';
import toast from 'react-hot-toast';
import { Gift, Copy, Share2, Users, CheckCircle2, Clock, Wallet, Check } from 'lucide-react';

// Reward-granting happens server-side on delivery, often while the
// referrer isn't even online — this page noticing a REWARDED referral it
// hasn't reported yet is the earliest client-side moment GA4 can learn
// about it. Tracked IDs are remembered in localStorage so revisiting this
// page (or the query refetching) never double-counts the same reward.
const TRACKED_REWARDS_KEY = 'lolospala_tracked_referral_rewards';

function trackNewlyRewarded(items: { id: number; status: string; rewardAmount: number | null }[]) {
  if (typeof window === 'undefined') return;
  let tracked: number[] = [];
  try {
    tracked = JSON.parse(window.localStorage.getItem(TRACKED_REWARDS_KEY) ?? '[]');
  } catch {
    tracked = [];
  }
  const trackedSet = new Set(tracked);
  const newlyRewarded = items.filter((item) => item.status === 'REWARDED' && !trackedSet.has(item.id));
  if (newlyRewarded.length === 0) return;

  for (const item of newlyRewarded) {
    trackReferralRewardEarned(item.rewardAmount ?? 0, item.id);
    trackedSet.add(item.id);
  }
  window.localStorage.setItem(TRACKED_REWARDS_KEY, JSON.stringify(Array.from(trackedSet)));
}

const STEPS = [
  'Fahe ita-nia kódigu husi WhatsApp ka midia sosial.',
  'Belun rejista no sosa uza kódigu neʼe molok sira halo order dahuluk.',
  'Ita rua simu prémiu — depois de order ida neʼe entrega ona.',
];

export default function ReferralsPage() {
  const [page, setPage] = useState(1);
  const [shareOpen, setShareOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const { data: summary, isLoading: isSummaryLoading } = useReferralSummary();
  const { data: history, isLoading: isHistoryLoading } = useReferralHistory(page, 10);

  useEffect(() => {
    if (history?.items) trackNewlyRewarded(history.items);
  }, [history]);

  const handleCopyCode = async () => {
    if (!summary?.referralCode) return;
    const ok = await copyToClipboard(summary.referralCode);
    if (ok) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
    toast[ok ? 'success' : 'error'](ok ? 'Kódigu kopia ona!' : 'La konsege kopia kódigu');
  };

  const stats = [
    { label: 'Rejista ona', value: summary?.totalReferred ?? 0, icon: Users },
    { label: 'Prémiu simu', value: summary?.totalRewarded ?? 0, icon: CheckCircle2 },
    { label: 'Hein hela', value: summary?.pendingCount ?? 0, icon: Clock },
  ];

  return (
    <div className="space-y-5">
      <AccountAppBar title="Konvida belun" backHref="/account" />

      {isSummaryLoading ? (
        <Skeleton className="h-48 w-full rounded-2xl" />
      ) : (
        <div className="space-y-4 rounded-2xl bg-warning/10 p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-warning/20 text-warning-foreground">
              <Gift className="h-5 w-5" />
            </span>
            <div>
              <p className="font-bold text-foreground">Konvida belun, simu prémiu ida-idak</p>
              <p className="text-sm text-muted-foreground">Ita-nia belun simu diskontu bainhira uza ita-nia kódigu.</p>
            </div>
          </div>

          <div className="rounded-xl border-2 border-dashed border-warning/40 bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ita-nia kódigu</p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <p className="font-mono text-2xl font-bold tracking-widest text-foreground">{summary?.referralCode ?? '—'}</p>
              <Button size="sm" className="gap-1.5" onClick={handleCopyCode}>
                {copiedCode ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedCode ? 'Kopia ona' : 'Kopia'}
              </Button>
            </div>
          </div>

          <Button className="w-full gap-2" variant="outline" onClick={() => setShareOpen(true)}>
            <Share2 className="h-4 w-4" />
            Fahe ba belun
          </Button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border bg-card p-3 text-center">
            <stat.icon className="mx-auto mb-1.5 h-5 w-5 text-primary" />
            {isSummaryLoading ? (
              <Skeleton className="mx-auto h-6 w-8" />
            ) : (
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
            )}
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <Link
        href="/account/wallet"
        className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-4 transition-colors hover:border-primary/40"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
            <Wallet className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">Saldu carteira</p>
            {isSummaryLoading ? (
              <Skeleton className="h-6 w-16" />
            ) : (
              <p className="text-lg font-bold text-foreground">${(summary?.walletCredit ?? 0).toFixed(2)}</p>
            )}
          </div>
        </div>
        <span className="text-sm font-semibold text-primary">Haree carteira</span>
      </Link>

      <div className="space-y-2 rounded-2xl border bg-card p-4">
        <p className="font-bold text-foreground">Oinsá ida-ne'e la'o</p>
        {STEPS.map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success text-xs font-bold text-success-foreground">
              {i + 1}
            </span>
            <p className="text-sm text-muted-foreground">{step}</p>
          </div>
        ))}
        <Link href="/terms" className="inline-block text-sm font-semibold text-primary hover:underline">
          Lee termu no kondisaun
        </Link>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold text-foreground">Istória konvida</h2>

        {isHistoryLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : !history?.items || history.items.length === 0 ? (
          <div className="rounded-2xl border py-12 text-center">
            <Gift className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">Seidauk iha konvida</h3>
            <p className="mt-1 text-muted-foreground">Konvida ita-nia belun dahuluk atu hahu simu prémiu.</p>
            <Button className="mt-4 gap-2" onClick={() => setShareOpen(true)}>
              <Share2 className="h-4 w-4" />
              Fahe ba belun
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {history.items.map((item) => (
              <Link
                key={item.id}
                href={`/account/referrals/${item.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-primary/40"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{item.referredUser.name}</p>
                  <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {item.status === 'REWARDED' && item.rewardAmount != null && (
                    <span className="font-semibold text-success">+${item.rewardAmount.toFixed(2)}</span>
                  )}
                  <StatusPill label={item.status === 'REWARDED' ? 'Prémiu simu' : 'Hein'} tone={item.status === 'REWARDED' ? 'success' : 'muted'} />
                </div>
              </Link>
            ))}
          </div>
        )}

        {history && history.totalPages > 1 && (
          <Pagination
            currentPage={page}
            totalPages={history.totalPages}
            totalItems={history.total}
            pageSize={history.limit}
            onPageChange={setPage}
            showTotal={false}
            className="mt-6"
          />
        )}
      </div>

      {summary?.referralCode && summary?.referralLink && (
        <ReferralShareModal
          open={shareOpen}
          onOpenChange={setShareOpen}
          referralCode={summary.referralCode}
          referralLink={summary.referralLink}
        />
      )}
    </div>
  );
}
