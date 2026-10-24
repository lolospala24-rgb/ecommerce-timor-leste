'use client';

import { use } from 'react';
import Link from 'next/link';
import { useReferralDetail, type ReferralStatus } from '@/hooks/useReferral';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { useAuthStore } from '@/stores/authStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, Circle, Gift, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AccountAppBar } from '@/components/account/AccountAppBar';
import { StatusPill } from '@/components/account/StatusPill';
import { getReferralStatusDisplay } from '@/lib/referralStatus';

interface ReferralDetail {
  id: number;
  status: ReferralStatus;
  referralCodeUsed: string;
  welcomeCreditAmount: number;
  rewardAmount: number | null;
  rewardedAt: string | null;
  reversedAt: string | null;
  createdAt: string;
  referrer: { id: number; name: string };
  referredUser: { id: number; name: string; phoneVerifiedAt: string | null };
  qualifyingOrder: {
    id: number;
    orderNumber: string;
    total: number | null;
    status: string;
    deliveredAt: string | null;
  } | null;
}

export default function ReferralDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useReferralDetail(Number(id));
  const { data: settings } = usePublicSettings();
  const { user } = useAuthStore();
  const referral = data as ReferralDetail | null;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!referral) {
    return (
      <div className="py-12 text-center">
        <Gift className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-medium">Referral not found</h3>
        <Button className="mt-4" asChild>
          <Link href="/account/referrals">Back to Referrals</Link>
        </Button>
      </div>
    );
  }

  const isPendingStatus = referral.status !== 'REWARDED' && referral.status !== 'REVERSED';
  const phoneVerificationNeeded = Boolean(settings?.referralRequirePhoneVerification) && isPendingStatus && !referral.referredUser.phoneVerifiedAt;
  const viewerIsReferrer = user?.id === referral.referrer.id;
  const viewerIsReferredUser = user?.id === referral.referredUser.id;

  const timeline = [
    { label: 'Referral Captured', done: true, date: referral.createdAt },
    { label: 'Account Created', done: true, date: referral.createdAt },
    {
      label: 'Welcome Reward',
      done: referral.welcomeCreditAmount > 0,
      date: referral.createdAt,
    },
    {
      label: 'First Order',
      done: !!referral.qualifyingOrder,
      date: referral.qualifyingOrder ? undefined : undefined,
    },
    {
      label: 'Order Delivered',
      done: !!referral.qualifyingOrder?.deliveredAt,
      date: referral.qualifyingOrder?.deliveredAt ?? undefined,
    },
    {
      label: 'Referral Reward',
      done: referral.status === 'REWARDED',
      date: referral.rewardedAt ?? undefined,
    },
  ];

  return (
    <div className="space-y-6">
      <AccountAppBar
        title={referral.referredUser.name}
        backHref="/account/referrals"
        rightAction={<StatusPill {...getReferralStatusDisplay(referral.status)} />}
      />

      {phoneVerificationNeeded && viewerIsReferredUser && (
        <Link
          href="/account/phone-verification"
          className="flex items-center gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 transition-colors hover:border-warning/60"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/20 text-warning-foreground">
            <Smartphone className="h-5 w-5" />
          </span>
          <p className="text-sm font-medium text-foreground">Verifika ita-nia numeru telefone atu simu prémiu</p>
        </Link>
      )}
      {phoneVerificationNeeded && viewerIsReferrer && (
        <div className="flex items-center gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/20 text-warning-foreground">
            <Smartphone className="h-5 w-5" />
          </span>
          <p className="text-sm font-medium text-foreground">Hein belun verifika telefone</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-6">
          <h2 className="mb-4 text-sm font-semibold text-muted-foreground">Timeline</h2>
          <div className="space-y-0">
            {timeline.map((step, index) => (
              <div key={step.label} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                      step.done ? 'bg-success text-white' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {step.done ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-2 w-2 fill-current" />}
                  </span>
                  {index < timeline.length - 1 && (
                    <span className={cn('h-8 w-0.5', step.done ? 'bg-success/40' : 'bg-border')} />
                  )}
                </div>
                <div className="pb-6">
                  <p className={cn('text-sm font-medium', !step.done && 'text-muted-foreground')}>{step.label}</p>
                  {step.date && (
                    <p className="text-xs text-muted-foreground">{new Date(step.date).toLocaleString()}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Details</h2>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Referrer</dt>
                <dd className="font-medium">{referral.referrer.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Referred Customer</dt>
                <dd className="font-medium">{referral.referredUser.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Referral Code</dt>
                <dd className="font-mono font-medium">{referral.referralCodeUsed}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Welcome Credit</dt>
                <dd className="font-medium">${referral.welcomeCreditAmount.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Reward Amount</dt>
                <dd className="font-medium">
                  {referral.rewardAmount != null ? `$${referral.rewardAmount.toFixed(2)}` : '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Created</dt>
                <dd className="font-medium">{new Date(referral.createdAt).toLocaleDateString()}</dd>
              </div>
              {referral.rewardedAt && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Rewarded</dt>
                  <dd className="font-medium">{new Date(referral.rewardedAt).toLocaleDateString()}</dd>
                </div>
              )}
              {referral.reversedAt && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Kansela</dt>
                  <dd className="font-medium text-destructive">{new Date(referral.reversedAt).toLocaleDateString()}</dd>
                </div>
              )}
            </dl>
          </Card>

          {referral.qualifyingOrder && (
            <Card className="p-5">
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Qualifying Order</h2>
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Order</dt>
                  <dd className="font-medium">#{referral.qualifyingOrder.orderNumber}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Total</dt>
                  <dd className="font-medium">
                    {referral.qualifyingOrder.total != null ? `$${referral.qualifyingOrder.total.toFixed(2)}` : '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="font-medium">{referral.qualifyingOrder.status}</dd>
                </div>
              </dl>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
