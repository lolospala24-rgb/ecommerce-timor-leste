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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DollarSign,
  TrendingUp,
  Percent,
  Wallet,
  Clock,
  Loader2 as ProcessingIcon,
  BadgeCheck,
  RotateCcw,
  ArrowRight,
  AlertTriangle,
  Truck,
  Receipt,
} from 'lucide-react';
import { useFinanceOverview, useNegativeBalanceSellers } from '@/hooks/useFinance';

function MetricCard({
  icon: Icon,
  label,
  value,
  accent,
  href,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  accent?: string;
  href?: string;
  sub?: string;
}) {
  const content = (
    <div className="rounded-lg border p-4 h-full transition-shadow hover:shadow-sm">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className={`mt-1 text-2xl font-bold ${accent || ''}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export default function FinanceOverviewPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { data, isLoading, isFetching } = useFinanceOverview(startDate || undefined, endDate || undefined);
  const { data: negativeBalances } = useNegativeBalanceSellers();

  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Finance Overview</h1>
          <p className="text-muted-foreground">
            The marketplace&apos;s financial command center — every number here traces back to the same ledger
            that Payouts, Refunds, and each Seller&apos;s detail page read from.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9" />
          </div>
          {(startDate || endDate) && (
            <button
              className="h-9 px-3 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => { setStartDate(''); setEndDate(''); }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : !data ? (
        <p className="text-center text-muted-foreground py-12">Unable to load financial overview.</p>
      ) : (
        <div className={`space-y-6 transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
          {/* Sales & Revenue — the spec's most important distinction: gross
              sales is NOT platform revenue. */}
          <div>
            <h2 className="mb-3 text-lg font-semibold">Sales &amp; Platform Revenue</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard icon={DollarSign} label="Gross Sales" value={fmt(data.sales.grossSales)} sub={`${data.sales.orderCount} orders`} />
              <MetricCard icon={DollarSign} label="Net Sales" value={fmt(data.sales.netSales)} sub="Gross minus refunded portion" />
              <MetricCard
                icon={Percent}
                label="Platform Commission"
                value={fmt(data.commission.platformCommission)}
                href="/finance/commissions"
              />
              <MetricCard
                icon={TrendingUp}
                label="Platform Net Revenue"
                value={fmt(data.platformRevenue.net)}
                accent="text-primary"
                sub={data.platformRevenue.gross !== data.platformRevenue.net ? `${fmt(data.platformRevenue.gross)} gross − refunded portion` : undefined}
              />
            </div>
          </div>

          {/* Seller Earnings */}
          <div>
            <h2 className="mb-3 text-lg font-semibold">Seller Earnings (across all sellers)</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <MetricCard icon={DollarSign} label="Total Earnings" value={fmt(data.sellerEarnings.total)} />
              <MetricCard icon={Clock} label="Pending" value={fmt(data.sellerEarnings.pending)} href="/finance/ledger?type=SALE" />
              <MetricCard icon={Wallet} label="Available" value={fmt(data.sellerEarnings.available)} accent="text-green-600" />
              <MetricCard icon={ProcessingIcon} label="Processing" value={fmt(data.sellerEarnings.processing)} accent="text-blue-600" href="/payouts?status=APPROVED" />
              <MetricCard icon={BadgeCheck} label="Paid Out" value={fmt(data.sellerEarnings.paidOut)} href="/payouts?status=PAID" />
            </div>
          </div>

          {/* Shipping & Tax — collected from customers alongside the product
              price, but never seller or commission revenue. Before this
              section existed, this money had no tracked destination once
              payment was confirmed; it now lands in PlatformBalance the same
              way commission does, via FinanceService.creditPlatformOnSale. */}
          <div>
            <h2 className="mb-1 text-lg font-semibold">Shipping &amp; Tax</h2>
            <p className="mb-3 text-sm text-muted-foreground">
              Collected from customers alongside the product price. Not seller earnings, not commission —
              held separately until remitted (to a courier, or to the tax authority).
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                icon={Truck}
                label="Shipping Collected (period)"
                value={fmt(data.shippingTax.shippingCollected)}
              />
              <MetricCard
                icon={Receipt}
                label="Tax Collected (period)"
                value={fmt(data.shippingTax.taxCollected)}
              />
              <MetricCard
                icon={Wallet}
                label="Shipping Held"
                value={fmt(data.platformBalance.shippingHeld)}
                accent="text-amber-600"
                href="/finance/platform-ledger?type=SHIPPING_COLLECTED"
                sub={`${fmt(data.platformBalance.shippingRemitted)} remitted all-time`}
              />
              <MetricCard
                icon={Wallet}
                label="Tax Held"
                value={fmt(data.platformBalance.taxHeld)}
                accent="text-amber-600"
                href="/finance/platform-ledger?type=TAX_COLLECTED"
                sub={`${fmt(data.platformBalance.taxRemitted)} remitted all-time`}
              />
            </div>
          </div>

          {/* Refunds */}
          <div>
            <h2 className="mb-3 text-lg font-semibold">Refunds</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard icon={RotateCcw} label="Total Refunded" value={fmt(data.refunds.total)} accent="text-red-600" href="/refunds" />
              <MetricCard
                icon={Percent}
                label="Commission Reversed"
                value={fmt(data.commission.commissionRefundedPortion)}
                sub="Real, persisted per refund — no longer counted as revenue"
              />
              <MetricCard icon={DollarSign} label="Seller Refunded Amount" value={fmt(data.sellerEarnings.refunded)} />
            </div>
          </div>

          {negativeBalances && negativeBalances.length > 0 && (
            <Card className="border-red-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  {negativeBalances.length} seller{negativeBalances.length === 1 ? '' : 's'} with a negative available balance
                </CardTitle>
                <CardDescription>
                  Expected after a refund on an order that was already paid out (see SOP-08) — this self-heals
                  as new sales land, since a payout can&apos;t be requested again until it&apos;s back above
                  zero. Visibility only, not an active collection mechanism.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {negativeBalances.map((s) => (
                  <div key={s.sellerId} className="flex items-center justify-between text-sm">
                    <Link href={`/sellers/${s.sellerId}`} className="hover:underline">{s.storeName || `Seller #${s.sellerId}`}</Link>
                    <span className="font-mono text-red-600">${s.availableAmount.toFixed(2)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/finance/ledger" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              View full ledger <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link href="/finance/reconciliation" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              Run reconciliation <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link href="/finance/adjustments" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              Manual adjustments <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link href="/finance/platform-ledger" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              Platform ledger &amp; remittance <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="text-base">How these numbers relate</CardTitle>
              <CardDescription>
                Gross Sales → minus Platform Commission → Seller Earnings. Seller Earnings sits in Pending until
                delivery, then Available until paid out. Platform Net Revenue is Platform Commission minus the
                commission on refunded orders — a real, persisted figure (Refund.commissionReversed, set at
                approval time), not an estimate. Shipping and Tax are collected alongside the product price but
                are never seller or commission revenue — they sit in Platform Ledger as &quot;Held&quot; until an
                admin records a Remittance (money actually paid to a courier or tax authority), and are reversed
                proportionally if the order is refunded.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      )}
    </div>
  );
}
