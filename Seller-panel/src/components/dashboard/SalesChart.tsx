'use client';

import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useSellerSales } from '@/hooks/useDashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const PERIODS: { value: 'day' | 'week' | 'month' | 'year'; label: string }[] = [
  { value: 'day', label: 'Today' },
  { value: 'week', label: '7 Days' },
  { value: 'month', label: '30 Days' },
  { value: 'year', label: '12 Months' },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

export function SalesChart() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const { data, isLoading } = useSellerSales(period);

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-medium">Sales Overview</h3>
          {data && (
            <p className="text-sm text-muted-foreground">
              {formatCurrency(data.totalRevenue)} from {data.totalOrders} delivered order{data.totalOrders === 1 ? '' : 's'}
            </p>
          )}
        </div>
        <div className="flex rounded-md border p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={cn(
                'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                period === p.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          No delivered orders in this period yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data.data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="sellerRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
            <XAxis dataKey="period" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => `$${v}`} />
            <Tooltip
              formatter={(value, name) => [name === 'revenue' ? formatCurrency(Number(value)) : value, name === 'revenue' ? 'Revenue' : 'Orders']}
              contentStyle={{ borderRadius: 8, border: '1px solid var(--color-border)', fontSize: 12 }}
            />
            <Area type="monotone" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={2} fill="url(#sellerRevenue)" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
