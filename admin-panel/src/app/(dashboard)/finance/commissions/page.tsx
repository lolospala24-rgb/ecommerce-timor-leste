'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Percent, Settings as SettingsIcon, Info } from 'lucide-react';
import { useFinanceOverview } from '@/hooks/useFinance';
import { useSettings } from '@/hooks/useSettings';

export default function CommissionsPage() {
  const { settings, isLoading: settingsLoading } = useSettings();
  const { data: overview, isLoading: overviewLoading } = useFinanceOverview();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Commissions</h1>
        <p className="text-muted-foreground">
          The platform&apos;s single global commission rate, and what it has earned. Every order snapshots the
          rate active when its payment was confirmed — changing it here never rewrites past orders.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Current Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          {settingsLoading ? (
            <Skeleton className="h-10 w-32" />
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-4xl font-bold">{settings?.defaultCommissionRate ?? 0}%</p>
              <Link href="/settings">
                <Button variant="outline">
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  Change in Settings
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Commission Collected (all-time)</CardTitle>
          <CardDescription>Sum of `Order.commissionAmount` across every order that has ever had a payment confirmed.</CardDescription>
        </CardHeader>
        <CardContent>
          {overviewLoading ? (
            <Skeleton className="h-10 w-48" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Gross Commission</p>
                <p className="mt-1 text-2xl font-bold">${(overview?.commission.platformCommission ?? 0).toFixed(2)}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Riding On Refunds</p>
                <p className="mt-1 text-2xl font-bold text-red-600">${(overview?.commission.commissionRefundedPortion ?? 0).toFixed(2)}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Net Platform Revenue</p>
                <p className="mt-1 text-2xl font-bold text-primary">${(overview?.platformRevenue.net ?? 0).toFixed(2)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-muted/30 p-4 flex gap-3">
        <Info className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Only a single global rate exists today (no per-seller or per-category override) — this was a
          deliberate scope decision to avoid over-engineering a tier system with no current business
          requirement for it. The rate is snapshotted per-order (<code>Order.commissionRate</code>), so adding
          per-seller/per-category rates later would extend this cleanly without touching historical orders.
        </p>
      </div>
    </div>
  );
}
