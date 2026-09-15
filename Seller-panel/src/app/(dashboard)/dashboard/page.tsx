'use client';

import Link from 'next/link';
import { DollarSign, ShoppingBag, Box, Wallet, Clock, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { RecentOrdersCard } from '@/components/dashboard/RecentOrdersCard';
import { RecentProductsCard } from '@/components/dashboard/RecentProductsCard';
import { RecentTransactionsCard } from '@/components/dashboard/RecentTransactionsCard';
import { StorePerformanceCard } from '@/components/dashboard/StorePerformanceCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useSellerDashboard } from '@/hooks/useDashboard';
import { useSellerBalance } from '@/hooks/useFinance';
import { useAuthStore } from '@/stores/authStore';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data, isLoading } = useSellerDashboard();
  const { data: balance } = useSellerBalance();

  return (
    <div>
      <PageHeader
        title={`Welcome back${user?.name ? `, ${user.name.split(' ')[0]}` : ''}`}
        description="Here's how your store is doing."
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {isLoading || !data ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)
        ) : (
          <>
            <StatCard label="Total Sales" value={formatCurrency(data.overview.revenue.total)} icon={DollarSign} />
            <StatCard label="Total Orders" value={data.overview.orders.total} icon={ShoppingBag} />
            <StatCard label="Total Products" value={data.overview.products.total} icon={Box} />
            <StatCard
              label="Available Earnings"
              value={formatCurrency(balance?.availableAmount ?? 0)}
              icon={Wallet}
              tone="success"
            />
            <StatCard
              label="Pending Orders"
              value={data.overview.orders.pending}
              icon={Clock}
              tone={data.overview.orders.pending > 0 ? 'warning' : 'default'}
              hint={data.overview.orders.pending > 0 ? 'Needs your attention' : undefined}
            />
            <Link href="/products/low-stock" className="contents">
              <StatCard
                label="Low Stock"
                value={data.overview.products.lowStock}
                icon={AlertTriangle}
                tone={data.overview.products.lowStock > 0 ? 'warning' : 'default'}
                className="cursor-pointer transition-shadow hover:shadow-sm"
              />
            </Link>
          </>
        )}
      </div>

      <div className="mb-6">
        <SalesChart />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <RecentOrdersCard />
          <RecentTransactionsCard />
        </div>
        <div className="space-y-6">
          <StorePerformanceCard />
          <RecentProductsCard />
        </div>
      </div>
    </div>
  );
}
