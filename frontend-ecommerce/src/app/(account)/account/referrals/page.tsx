'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useReferralSummary, useReferralHistory } from '@/hooks/useReferral';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/shared/Pagination';
import { ReferralShareModal } from '@/components/account/ReferralShareModal';
import { copyToClipboard } from '@/lib/utils';
import { trackReferralRewardEarned } from '@/lib/analytics';
import toast from 'react-hot-toast';
import { Gift, Copy, Share2, Users, CheckCircle2, Clock, Wallet } from 'lucide-react';

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

export default function ReferralsPage() {
  const [page, setPage] = useState(1);
  const [shareOpen, setShareOpen] = useState(false);
  const { data: summary, isLoading: isSummaryLoading } = useReferralSummary();
  const { data: history, isLoading: isHistoryLoading } = useReferralHistory(page, 10);

  useEffect(() => {
    if (history?.items) trackNewlyRewarded(history.items);
  }, [history]);

  const handleCopyCode = async () => {
    if (!summary?.referralCode) return;
    const ok = await copyToClipboard(summary.referralCode);
    toast[ok ? 'success' : 'error'](ok ? 'Referral code copied!' : 'Could not copy code');
  };

  const handleCopyLink = async () => {
    if (!summary?.referralLink) return;
    const ok = await copyToClipboard(summary.referralLink);
    toast[ok ? 'success' : 'error'](ok ? 'Referral link copied!' : 'Could not copy link');
  };

  const stats = [
    { label: 'Registered', value: summary?.totalReferred ?? 0, icon: Users },
    { label: 'Rewarded', value: summary?.totalRewarded ?? 0, icon: CheckCircle2 },
    { label: 'Pending', value: summary?.pendingCount ?? 0, icon: Clock },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Referrals</h1>
        <p className="text-muted-foreground">Invite friends and earn rewards together.</p>
      </div>

      {/* Referral code + link */}
      {isSummaryLoading ? (
        <Skeleton className="h-44 w-full" />
      ) : (
        <Card className="border-primary/20 bg-primary/5 p-6">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Your Referral Code
              </p>
              <p className="mt-1 font-mono text-3xl font-bold tracking-widest text-primary">
                {summary?.referralCode ?? '—'}
              </p>
              <p className="mt-2 max-w-md text-sm text-muted-foreground break-all">
                {summary?.referralLink}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <Button variant="outline" className="gap-2" onClick={handleCopyCode}>
                <Copy className="h-4 w-4" />
                Copy Code
              </Button>
              <Button className="gap-2" onClick={() => setShareOpen(true)}>
                <Share2 className="h-4 w-4" />
                Invite Friends
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                {isSummaryLoading ? (
                  <Skeleton className="h-7 w-10" />
                ) : (
                  <p className="text-2xl font-bold">{stat.value}</p>
                )}
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Wallet summary */}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Available Credit</p>
              {isSummaryLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <p className="text-xl font-bold">${(summary?.walletCredit ?? 0).toFixed(2)}</p>
              )}
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link href="/account/wallet">View Wallet</Link>
          </Button>
        </div>
      </Card>

      {/* Referral history */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Referral History</h2>

        {isHistoryLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : !history?.items || history.items.length === 0 ? (
          <div className="rounded-lg border py-12 text-center">
            <Gift className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">No referrals yet</h3>
            <p className="mt-1 text-muted-foreground">
              Invite your first friend and start earning rewards.
            </p>
            <Button className="mt-4 gap-2" onClick={() => setShareOpen(true)}>
              <Share2 className="h-4 w-4" />
              Invite Friends
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {history.items.map((item) => (
              <Link key={item.id} href={`/account/referrals/${item.id}`}>
                <Card className="transition-colors hover:border-primary/40">
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.referredUser.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {item.status === 'REWARDED' && item.rewardAmount != null && (
                        <span className="font-semibold text-success">+${item.rewardAmount.toFixed(2)}</span>
                      )}
                      <Badge variant={item.status === 'REWARDED' ? 'default' : 'secondary'}>
                        {item.status === 'REWARDED' ? 'Rewarded' : 'Pending'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
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
