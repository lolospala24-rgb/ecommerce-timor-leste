'use client';

import { use } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminReferralDetail } from '@/hooks/useReferrals';

export default function AdminReferralDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: referral, isLoading } = useAdminReferralDetail(Number(id));

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!referral) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/referrals"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link>
        </Button>
        <p className="text-muted-foreground">Referral not found.</p>
      </div>
    );
  }

  const timeline = [
    { label: 'Referral Captured', done: true, date: referral.createdAt },
    { label: 'Registration', done: true, date: referral.createdAt },
    { label: 'Welcome Credit', done: referral.welcomeCreditAmount > 0, date: referral.createdAt },
    { label: 'First Order', done: !!referral.qualifyingOrder },
    { label: 'Delivered', done: !!referral.qualifyingOrder?.deliveredAt, date: referral.qualifyingOrder?.deliveredAt ?? undefined },
    { label: 'Rewarded', done: referral.status === 'REWARDED', date: referral.rewardedAt ?? undefined },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="-ml-3" asChild>
          <Link href="/referrals"><ArrowLeft className="mr-2 h-4 w-4" />Back to Referrals</Link>
        </Button>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-2xl font-bold">Referral #{referral.id}</h1>
          <Badge variant={referral.status === 'REWARDED' ? 'default' : 'secondary'}>{referral.status}</Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Timeline</CardTitle></CardHeader>
          <CardContent>
            {timeline.map((step, index) => (
              <div key={step.label} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                      step.done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {step.done ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-2 w-2 fill-current" />}
                  </span>
                  {index < timeline.length - 1 && (
                    <span className={cn('h-8 w-0.5', step.done ? 'bg-primary/40' : 'bg-border')} />
                  )}
                </div>
                <div className="pb-6">
                  <p className={cn('text-sm font-medium', !step.done && 'text-muted-foreground')}>{step.label}</p>
                  {step.date && <p className="text-xs text-muted-foreground">{new Date(step.date).toLocaleString()}</p>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm text-muted-foreground">Referral</CardTitle></CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              <Row label="Referrer" value={`${referral.referrer.name} (${referral.referrer.email})`} />
              <Row label="Referred User" value={`${referral.referredUser.name} (${referral.referredUser.email})`} />
              <Row label="Referral Code" value={referral.referralCodeUsed} mono />
              <Row label="Welcome Credit" value={`$${referral.welcomeCreditAmount.toFixed(2)}`} />
              <Row label="Reward Amount" value={referral.rewardAmount != null ? `$${referral.rewardAmount.toFixed(2)}` : '—'} />
              <Row label="Created At" value={new Date(referral.createdAt).toLocaleString()} />
              <Row label="Rewarded At" value={referral.rewardedAt ? new Date(referral.rewardedAt).toLocaleString() : '—'} />
            </CardContent>
          </Card>

          {referral.qualifyingOrder && (
            <Card>
              <CardHeader><CardTitle className="text-sm text-muted-foreground">Qualifying Order</CardTitle></CardHeader>
              <CardContent className="space-y-2.5 text-sm">
                <Row label="Order ID" value={`#${referral.qualifyingOrder.orderNumber}`} />
                <Row label="Subtotal" value={`$${referral.qualifyingOrder.subtotal.toFixed(2)}`} />
                <Row label="Payment" value={referral.qualifyingOrder.paymentMethod ?? '—'} />
                <Row label="Order Status" value={referral.qualifyingOrder.status} />
                <Row
                  label="Delivered At"
                  value={referral.qualifyingOrder.deliveredAt ? new Date(referral.qualifyingOrder.deliveredAt).toLocaleString() : '—'}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn('text-right font-medium', mono && 'font-mono')}>{value}</dd>
    </div>
  );
}
