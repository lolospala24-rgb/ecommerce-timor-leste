'use client';

import { useState } from 'react';
import { useOrders } from '@/hooks/useOrders';
import { useOrderRealtime } from '@/hooks/useOrderRealtime';
import { OrdersTable } from './components/OrdersTable';
import { OrderFilters } from './components/OrderFilters';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, RefreshCw, ShoppingCart } from 'lucide-react';
import { OrderDetailModal } from './components/OrderDetailModal';
import { ErrorState } from '@/components/shared/ErrorState';

export default function OrdersPage() {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: '',
    status: '',
    startDate: '',
    endDate: '',
    sellerId: undefined as number | undefined,
  });
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const { data, isLoading, isError, refetch } = useOrders(filters);
  useOrderRealtime();

  const handleViewOrder = (orderId: number) => {
    setSelectedOrderId(orderId);
    setShowDetailModal(true);
  };

  const handleExport = async () => {
    window.location.href = `/api/orders/export?${new URLSearchParams({
      status: filters.status,
      startDate: filters.startDate,
      endDate: filters.endDate,
    })}`;
  };

  const getStatusCounts = () => {
    if (!data?.data) return {};
    return data.data.reduce((acc: any, order: any) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders Management</h1>
          <p className="text-muted-foreground">
            Manage and track all customer orders
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <OrderFilters filters={filters} setFilters={setFilters} />

      <Tabs defaultValue="all" className="space-y-4" onValueChange={(value) => setFilters({ ...filters, status: value === 'all' ? '' : value, page: 1 })}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="all" className="flex gap-2">
            All
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
              {data?.pagination?.total || 0}
            </span>
          </TabsTrigger>
          <TabsTrigger value="PENDING" className="flex gap-2">
            Pending
            <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">
              {statusCounts.PENDING || 0}
            </span>
          </TabsTrigger>
          <TabsTrigger value="PAID" className="flex gap-2">
            Paid
            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
              {statusCounts.PAID || 0}
            </span>
          </TabsTrigger>
          <TabsTrigger value="PROCESSING" className="flex gap-2">
            Processing
            <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">
              {statusCounts.PROCESSING || 0}
            </span>
          </TabsTrigger>
          <TabsTrigger value="SHIPPING" className="flex gap-2">
            Shipping
            <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">
              {statusCounts.SHIPPING || 0}
            </span>
          </TabsTrigger>
          <TabsTrigger value="DELIVERED" className="flex gap-2">
            Delivered
            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
              {statusCounts.DELIVERED || 0}
            </span>
          </TabsTrigger>
          <TabsTrigger value="CANCELLED" className="flex gap-2">
            Cancelled
            <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
              {statusCounts.CANCELLED || 0}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filters.status || 'all'} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Orders</CardTitle>
              <CardDescription>
                Total {data?.pagination?.total || 0} orders found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : isError ? (
                <ErrorState description="Couldn't load orders. Check your connection and try again." onRetry={() => refetch()} />
              ) : (
                <OrdersTable
                  orders={data?.data || []}
                  onViewOrder={handleViewOrder}
                  onRefresh={refetch}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <OrderDetailModal
        orderId={selectedOrderId}
        open={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedOrderId(null);
        }}
        onRefresh={refetch}
      />
    </div>
  );
}