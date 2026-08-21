'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOrder } from '@/hooks/useOrders';
import { UpdateOrderStatus } from './UpdateOrderStatus';
import {
  Package,
  Truck,
  MapPin,
  CreditCard,
  User,
  Store,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { RemoteImage } from '@/components/shared/RemoteImage';
import Image from 'next/image';
import Link from 'next/link';

interface OrderDetailModalProps {
  orderId: number | null;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function OrderDetailModal({ orderId, open, onClose, onRefresh }: OrderDetailModalProps) {
  const { data: order, isLoading } = useOrder(orderId);

  if (!orderId) return null;

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-500',
      PAID: 'bg-blue-500',
      PROCESSING: 'bg-purple-500',
      SHIPPING: 'bg-indigo-500',
      DELIVERED: 'bg-green-500',
      CANCELLED: 'bg-red-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: 'Pending',
      PAID: 'Paid',
      PROCESSING: 'Processing',
      SHIPPING: 'Shipping',
      DELIVERED: 'Delivered',
      CANCELLED: 'Cancelled',
    };
    return labels[status] || status;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Details</DialogTitle>
          <DialogDescription>
            View and manage order information
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !order ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Order not found</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Order Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">Order #{order.orderNumber ?? order.id ?? 'N/A'}</h2>
                  <Badge className={getStatusColor(order.status ?? 'UNKNOWN')}>
                    {getStatusLabel(order.status ?? 'UNKNOWN')}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Placed on {order.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A'}
                </p>
              </div>
                {order.id && order.status ? (
                  <UpdateOrderStatus
                    orderId={order.id}
                    currentStatus={order.status}
                    onUpdate={onRefresh}
                  />
                ) : null}
            </div>

            {/* Order Info Tabs */}
            <Tabs defaultValue="items" className="space-y-4">
              <TabsList>
                <TabsTrigger value="items">
                  <Package className="h-4 w-4 mr-2" />
                  Items
                </TabsTrigger>
                <TabsTrigger value="customer">
                  <User className="h-4 w-4 mr-2" />
                  Customer
                </TabsTrigger>
                <TabsTrigger value="shipping">
                  <Truck className="h-4 w-4 mr-2" />
                  Shipping
                </TabsTrigger>
                <TabsTrigger value="payment">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Payment
                </TabsTrigger>
              </TabsList>

              <TabsContent value="items" className="space-y-4">
                <div className="space-y-3">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item: any) => {
                      const itemKey = item.id || item.productId || `${item.product?.name || 'product'}-${item.quantity ?? 0}`;
                      return (
                        <div key={itemKey} className="flex items-center gap-4 py-3 border-b last:border-0">
                          <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                            <RemoteImage
                              src={item.product?.thumbnail}
                              alt={item.product?.name || 'Product image'}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{item.product?.name || 'N/A'}</p>
                            <p className="text-xs text-muted-foreground">SKU: {item.product?.sku || '-'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm">{item.quantity} x ${Number(item.price ?? 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                            <p className="font-medium">${Number(item.total ?? 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-6 text-sm text-muted-foreground">No items in this order</div>
                  )}
                </div>
                <div className="flex justify-end pt-4 border-t">
                  <div className="w-64 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span>${Number(order.subtotal ?? 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shipping:</span>
                      <span>${Number(order.shippingCost ?? 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-2 border-t">
                      <span>Total:</span>
                      <span>${Number(order.total ?? 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="customer" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Name</p>
                    <p>{order.customer?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p>{order.customer?.email || 'N/A'}</p>
                  </div>
                  {order.customer?.phone && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Phone</p>
                      <p>{order.customer.phone}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Seller</p>
                    <p>{order.seller?.storeName || 'N/A'}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="shipping" className="space-y-4">
                {order.address && (
                  <div className="space-y-3">
                    {(order.address as any).recipientName && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Recipient</p>
                        <p>{(order.address as any).recipientName}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Address</p>
                      <p>
                        {(() => {
                          const a = order.address as any;
                          const parts = [a.street, a.village, a.suco, a.postoAdmin, a.municipality].filter(Boolean);
                          return parts.length ? parts.join(', ') : 'N/A';
                        })()}
                      </p>
                    </div>
                    {order.address.reference && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Reference</p>
                        <p>{order.address.reference}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Phone</p>
                      <p>{order.address.phone ?? 'N/A'}</p>
                    </div>
                    {order.trackingNumber && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Tracking Number</p>
                        <p className="font-mono text-sm">{order.trackingNumber}</p>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="payment" className="space-y-4">
                {order.payment ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Method</p>
                      <p>{order.payment?.method ? (order.payment.method === 'COD' ? 'Cash on Delivery' : 'Bank Transfer') : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <Badge variant={order.payment?.status === 'PAID' ? 'default' : 'secondary'}>
                        {order.payment?.status ?? 'N/A'}
                      </Badge>
                    </div>
                    {order.payment.paidAt && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Paid At</p>
                        <p>{order.payment.paidAt ? new Date(order.payment.paidAt).toLocaleString() : 'N/A'}</p>
                      </div>
                    )}
                    {order.payment.transactionId && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Transaction ID</p>
                        <p className="font-mono text-sm">{order.payment.transactionId}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No payment information</div>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end">
              <Button asChild>
                <Link href={`/orders/${order.id}`}>
                  View Full Details
                </Link>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}