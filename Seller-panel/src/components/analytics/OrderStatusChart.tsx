'use client';

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useSellerDashboard } from '@/hooks/useDashboard';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS: Record<string, string> = {
  Pending: 'var(--color-chart-2)',
  Processing: 'var(--color-chart-3)',
  Shipping: 'var(--color-chart-4)',
  Delivered: 'var(--color-chart-1)',
  Cancelled: 'var(--color-destructive)',
};

export function OrderStatusChart() {
  const { data, isLoading } = useSellerDashboard();

  if (isLoading || !data) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <Skeleton className="mb-4 h-5 w-40" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  const { orders } = data.overview;
  const chartData = [
    { name: 'Pending', value: orders.pending },
    { name: 'Processing', value: orders.processing },
    { name: 'Shipping', value: orders.shipping },
    { name: 'Delivered', value: orders.delivered },
    { name: 'Cancelled', value: orders.cancelled },
  ];

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-4 font-medium">Orders by Status</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={30} />
          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--color-border)', fontSize: 12 }} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={COLORS[entry.name]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
