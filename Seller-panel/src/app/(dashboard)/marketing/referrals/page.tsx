'use client';

import { useState } from 'react';
import { Copy, Gift, Users, CheckCircle2, Clock, Wallet, MessageCircle, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useReferralSummary, useReferralHistory } from '@/hooks/useReferrals';

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function SellerReferralsPage() {
  const [page, setPage] = useState(1);
  const { data: summary, isLoading: isSummaryLoading } = useReferralSummary();
  const { data: history, isLoading: isHistoryLoading } = useReferralHistory(page, 10);

  const handleCopy = async (text: string, label: string) => {
    const ok = await copyToClipboard(text);
    toast[ok ? 'success' : 'error'](ok ? `${label} copied!` : `Could not copy ${label.toLowerCase()}`);
  };

  const shareText = summary?.referralLink
    ? `Join Lolospala and get a welcome wallet credit — use my referral link: ${summary.referralLink}`
    : '';

  const stats = [
    { label: 'Registered', value: summary?.totalReferred ?? 0, icon: Users },
    { label: 'Rewarded', value: summary?.totalRewarded ?? 0, icon: CheckCircle2 },
    { label: 'Pending', value: summary?.pendingCount ?? 0, icon: Clock },
  ];

  return (
    <div>
      <PageHeader
        title="Referrals"
        description="Invite other sellers or customers to Lolospala and earn wallet credit — the same referral program every account gets."
      />

      {isSummaryLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Your Referral Code</p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-primary">
                {summary?.referralCode ?? '—'}
              </p>
              <p className="mt-1 max-w-md break-all text-xs text-muted-foreground">{summary?.referralLink}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleCopy(summary?.referralCode ?? '', 'Code')}>
                <Copy className="h-3.5 w-3.5" />
                Copy Code
              </Button>
              <Button
                size="sm"
                className="gap-1.5 bg-[#25D366] text-white hover:bg-[#1fbd5a]"
                asChild
              >
                <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp
                </a>
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" asChild>
                <a href={`mailto:?subject=${encodeURIComponent('Join Lolospala')}&body=${encodeURIComponent(shareText)}`}>
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <stat.icon className="h-4.5 w-4.5" />
              </div>
              <div>
                {isSummaryLoading ? <Skeleton className="h-6 w-8" /> : <p className="text-xl font-bold">{stat.value}</p>}
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-4">
        <CardContent className="flex items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
              <Wallet className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Available Wallet Credit</p>
              {isSummaryLoading ? <Skeleton className="h-6 w-14" /> : <p className="text-lg font-bold">${(summary?.walletCredit ?? 0).toFixed(2)}</p>}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Spendable at checkout on the storefront, same as any customer.</p>
        </CardContent>
      </Card>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Referral History</h2>
        {isHistoryLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : !history?.items || history.items.length === 0 ? (
          <EmptyState icon={Gift} title="No referrals yet" description="Invite someone using your code or link above." />
        ) : (
          <div className="space-y-2">
            {history.items.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex items-center justify-between gap-4 p-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.referredUser.name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {item.status === 'REWARDED' && item.rewardAmount != null && (
                      <span className="text-sm font-semibold text-success">+${item.rewardAmount.toFixed(2)}</span>
                    )}
                    <Badge variant={item.status === 'REWARDED' ? 'default' : 'secondary'}>
                      {item.status === 'REWARDED' ? 'Rewarded' : 'Pending'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {history && history.totalPages > 1 && (
          <PaginationControls
            page={history.page}
            totalPages={history.totalPages}
            hasNext={history.page < history.totalPages}
            hasPrev={history.page > 1}
            onPageChange={setPage}
            total={history.total}
          />
        )}
      </div>
    </div>
  );
}
