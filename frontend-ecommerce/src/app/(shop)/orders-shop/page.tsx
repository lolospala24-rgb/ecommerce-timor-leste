"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useUserOrders } from '@/hooks/useOrders';
import { useOrderRealtime } from '@/hooks/useOrderRealtime';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pagination } from '@/components/shared/Pagination';
import { ShoppingBag, Package, Truck, CheckCircle, XCircle, Clock, Eye } from 'lucide-react';

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-500',
  PAID: 'bg-green-600',
  PROCESSING: 'bg-blue-600',
  SHIPPING: 'bg-blue-600',
  DELIVERED: 'bg-green-600',
  CANCELLED: 'bg-red-600',
};

const statusIcons: Record<string, any> = {
  PENDING: Clock,
  PAID: ShoppingBag,
  PROCESSING: Package,
  SHIPPING: Truck,
  DELIVERED: CheckCircle,
  CANCELLED: XCircle,
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pending',
  PAID: 'Paid',
  PROCESSING: 'Processing',
  SHIPPING: 'In Transit',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

// A customer with a BANK_TRANSFER order looked identical here whether they
// still owed us a receipt or one was already rejected — both need the
// customer to go do something, which the order status alone doesn't convey
// (order.status stays PENDING either way).
function getActionNeeded(order: any): string | null {
  if (order.paymentMethod !== 'BANK_TRANSFER' || order.status === 'CANCELLED') return null;
  if (!order.payment) return 'Payment needed';
  if (order.payment.status === 'FAILED') return 'Receipt rejected — retry';
  if (order.payment.status === 'PENDING' && !order.payment.proofImage) return 'Upload receipt';
  return null;
}

export default function OrdersPage() {
  const { isAuthenticated } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  
  const { data, isLoading } = useUserOrders({
    page,
    limit: 10,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  useOrderRealtime();

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold">Sign in to view orders</h2>
        <p className="text-muted-foreground mt-2">
          Please sign in to see your order history
        </p>
        <Button className="mt-6" asChild>
          <Link href="/login?redirect=/orders">Sign In</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Orders</h1>
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
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))
          ) : data?.data?.length === 0 ? (
            <div className="text-center py-12 border rounded-lg">
              <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No Orders Yet</h3>
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
                const StatusIcon = statusIcons[order.status] || Package;
                const actionNeeded = getActionNeeded(order);
                return (
                  <Card key={order.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link href={`/orders/${order.id}`} className="hover:text-primary">
                              <h3 className="font-semibold">Order #{order.orderNumber}</h3>
                            </Link>
                            <Badge className={statusColors[order.status]}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusLabels[order.status]}
                            </Badge>
                            {actionNeeded && (
                              <Badge variant="outline" className="border-amber-500 text-slate-600">
                                {actionNeeded}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Placed on {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                          <div className="flex items-center gap-4 text-sm">
                            <span>{order.items?.length || 0} items</span>
                            <span className="text-muted-foreground">•</span>
                            <span>
                              {order.seller?.storeName || 'Unknown Seller'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold text-primary">
                              ${order.total.toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Bank Transfer'}
                            </p>
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/orders/${order.id}`}>
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

          {/* Pagination */}
          {data?.pagination && data.pagination.totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={data.pagination.totalPages}
              totalItems={data.pagination.total}
              pageSize={data.pagination.limit}
              onPageChange={setPage}
              showTotal={false}
              className="mt-6"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
