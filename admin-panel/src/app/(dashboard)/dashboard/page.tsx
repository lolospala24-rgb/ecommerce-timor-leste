'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useDashboard, useRevenueChart, useTopProducts } from '@/hooks/useDashboard';
import { useOrderRealtime } from '@/hooks/useOrderRealtime';
import { StatsCards } from './components/StatsCards';
import { TopProducts } from './components/TopProducts';
import { RecentOrders } from './components/RecentOrders';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

// Recharts and Google Maps pull in sizeable JS bundles that are only needed
// once the user views these tabs — code-split them out of the initial
// dashboard page load.
const RevenueChart = dynamic(
  () => import('./components/RevenueChart').then((mod) => mod.RevenueChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-96 w-full" />,
  }
);

const SalesMap = dynamic(
  () => import('./components/SalesMap').then((mod) => mod.SalesMap),
  {
    ssr: false,
    loading: () => <Skeleton className="h-96 w-full" />,
  }
);

export default function DashboardPage() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [mounted, setMounted] = useState(false);
  
  const { data, isLoading, refetch } = useDashboard(period);
  const { data: revenueData, isLoading: revenueLoading } = useRevenueChart(period);
  const { data: topProducts } = useTopProducts(5, period === 'day' ? undefined : period);

  useOrderRealtime();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render on server to avoid hydration issues
  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  // Handle loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  // Safe data access with fallbacks
  const safeData = data || {
    overview: {
      users: { total: 0, newToday: 0, newThisWeek: 0, newThisMonth: 0, active: 0 },
      sellers: { total: 0, verified: 0, pending: 0, newThisMonth: 0, verificationRate: 0 },
      products: { total: 0, active: 0, outOfStock: 0, lowStock: 0, activeRate: 0 },
      orders: { total: 0, pending: 0, processing: 0, shipping: 0, delivered: 0, cancelled: 0, revenue: 0 },
      payments: { pending: 0 },
      reviews: { total: 0, pending: 0, averageRating: 0 },
    },
    recentOrders: [],
    timestamp: new Date().toISOString(),
    adminName: 'Admin',
  };

  const safeRevenueData = revenueData || { period: period, totalRevenue: 0, totalOrders: 0, data: [] };
  const safeTopProducts = Array.isArray(topProducts) ? topProducts : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {safeData.adminName || 'Admin'}! Here's what's happening with your store.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <div className="flex gap-1">
            {['day', 'week', 'month', 'year'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p as any)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  period === p ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {p === 'day' ? 'Today' : 
                 p === 'week' ? 'This Week' : 
                 p === 'month' ? 'This Month' : 'This Year'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <StatsCards stats={safeData.overview} />

      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenue & Orders</TabsTrigger>
          <TabsTrigger value="products">Top Products</TabsTrigger>
          <TabsTrigger value="map">Sales by Region</TabsTrigger>
        </TabsList>
        <TabsContent value="revenue" className="space-y-4">
          <RevenueChart 
            data={safeRevenueData.data || []} 
            period={period} 
            isLoading={revenueLoading}
          />
        </TabsContent>
        <TabsContent value="products">
          <TopProducts products={safeTopProducts} />
        </TabsContent>
        <TabsContent value="map">
          <SalesMap data={[]} />
        </TabsContent>
      </Tabs>

      <RecentOrders orders={safeData.recentOrders || []} />
    </div>
  );
}