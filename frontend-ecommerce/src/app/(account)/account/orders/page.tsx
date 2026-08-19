'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useUserOrders } from '@/hooks/useOrders';
import { useOrderRealtime } from '@/hooks/useOrderRealtime';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Truck, CheckCircle, Clock, XCircle, Eye } from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: 'Pending', color: 'bg-amber-500', icon: Clock },
  PAID: { label: 'Paid', color: 'bg-green-600', icon: Package },
  PROCESSING: { label: 'Processing', color: 'bg-blue-600', icon: Package },
  SHIPPING: { label: 'In Transit', color: 'bg-blue-600', icon: Truck },
  DELIVERED: { label: 'Delivered', color: 'bg-green-600', icon: CheckCircle },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-600', icon: XCircle },
};

// See the mirrored helper in (shop)/orders-shop/page.tsx — same reasoning:
// order.status alone doesn't tell a customer their bank-transfer receipt
// still needs uploading or was rejected.
function getActionNeeded(order: any): string | null {
  if (order.paymentMethod !== 'BANK_TRANSFER' || order.status === 'CANCELLED') return null;
  if (!order.payment) return 'Payment needed';
  if (order.payment.status === 'FAILED') return 'Receipt rejected — retry';
  if (order.payment.status === 'PENDING' && !order.payment.proofImage) return 'Upload receipt';
  return null;
}

export default function AccountOrdersPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  
  const { data, isLoading } = useUserOrders({
    page,
    limit: 10,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  useOrderRealtime();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-48" />
        </div>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Orders</h1>
        <p className="text-muted-foreground">Track and manage your orders</p>
      </div>

      <Tabs defaultValue="all" onValueChange={setStatusFilter}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="PENDING">Pending</TabsTrigger>
          <TabsTrigger value="PROCESSING">Processing</TabsTrigger>
          <TabsTrigger value="SHIPPING">In Transit</TabsTrigger>
          <TabsTrigger value="DELIVERED">Delivered</TabsTrigger>
          <TabsTrigger value="CANCELLED">Cancelled</TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="space-y-4 mt-4">
          {data?.data?.length === 0 ? (
            <div className="text-center py-12 border rounded-lg">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No Orders</h3>
              <p className="text-muted-foreground">
                {statusFilter === 'all' 
                  ? 'You haven\'t placed any orders yet.'
                  : `No ${statusFilter.toLowerCase()} orders`}
              </p>
              <Button className="mt-4" asChild>
                <Link href="/products">Start Shopping</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {data?.data.map((order: any) => {
                const status = statusConfig[order.status] || { label: order.status, color: 'bg-slate-500', icon: Package };
                const StatusIcon = status.icon;
                const actionNeeded = getActionNeeded(order);
                return (
                  <Card key={order.id} className="rounded-xl hover:shadow-md transition-shadow">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link href={`/account/orders/${order.id}`} className="hover:text-primary">
                              <h3 className="font-semibold">Order #{order.orderNumber}</h3>
                            </Link>
                            <Badge className={status.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {status.label}
                            </Badge>
                            {actionNeeded && (
                              <Badge variant="outline" className="border-amber-500 text-slate-600">
                                {actionNeeded}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {order.items?.length || 0} items • {order.seller?.storeName || 'Unknown Seller'}
                          </p>
                        </div>
                        <div className="flex w-full items-center justify-between gap-4 sm:w-auto sm:justify-end">
                          <div className="text-right">
                            <p className="font-bold">${order.total.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">
                              {order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Bank Transfer'}
                            </p>
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/account/orders/${order.id}`}>
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 overflow-x-auto pb-1">
              <Button
                variant="outline"
                className="shrink-0"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1 shrink-0">
                {[...Array(data.pagination.totalPages)].map((_, i) => (
                  <Button
                    key={i}
                    variant={page === i + 1 ? 'default' : 'outline'}
                    className="h-9 w-9 shrink-0"
                    onClick={() => setPage(i + 1)}
                  >
                    {i + 1}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                className="shrink-0"
                onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                disabled={page === data.pagination.totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}