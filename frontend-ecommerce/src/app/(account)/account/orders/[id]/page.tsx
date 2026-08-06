'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useOrder } from '@/hooks/useOrders';
import { useOrderRealtime } from '@/hooks/useOrderRealtime';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Package, Truck, CheckCircle, Clock, MapPin, CreditCard, User } from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'bg-yellow-500' },
  PAID: { label: 'Paid', color: 'bg-blue-500' },
  PROCESSING: { label: 'Processing', color: 'bg-purple-500' },
  SHIPPING: { label: 'In Transit', color: 'bg-indigo-500' },
  DELIVERED: { label: 'Delivered', color: 'bg-green-500' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-500' },
};

const formatMoney = (value: unknown) => {
  const numericValue = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(numericValue) ? numericValue.toFixed(2) : '0.00';
};

export default function AccountOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = parseInt(params.id as string);
  const { data: order, isLoading } = useOrder(orderId);
  useOrderRealtime(orderId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold">Order Not Found</h2>
        <Button className="mt-4" asChild>
          <Link href="/account/orders">Back to Orders</Link>
        </Button>
      </div>
    );
  }

  const status = statusConfig[order.status] || { label: order.status, color: 'bg-gray-500' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Order #{order.orderNumber}</h1>
            <p className="text-muted-foreground">
              {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <Badge className={`${status.color} text-white px-4 py-2`}>
          {status.label}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Order Items */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.items?.map((item: any, index: number) => (
                <div key={index} className="flex gap-4 border-b pb-4 last:border-0 last:pb-0">
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                    <Image
                      src={item.product?.thumbnail || '/images/placeholder.png'}
                      alt={item.product?.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <Link href={`/products/${item.product?.slug}`} className="hover:text-primary">
                      <p className="font-medium">{item.product?.name}</p>
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      Qty: {item.quantity} × ${formatMoney(item.price)}
                    </p>
                  </div>
                  <div className="text-right font-medium">
                    ${formatMoney(item.total)}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Timeline */}
          {order.timeline && order.timeline.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Order Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.timeline.map((event: any, index: number) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="h-2 w-2 mt-2 rounded-full bg-green-500" />
                        {index < order.timeline.length - 1 && (
                          <div className="h-full w-0.5 bg-muted ml-[3px]" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{event.status}</p>
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(event.date).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${formatMoney(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span>${formatMoney(order.shippingCost)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="text-primary">${formatMoney(order.total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment</span>
                <span>{order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Bank Transfer'}</span>
              </div>
              {order.trackingNumber && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tracking</span>
                  <span className="font-mono text-xs">{order.trackingNumber}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{order.customer?.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span>{order.customer?.email}</span>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          {order.address && (
            <Card>
              <CardHeader>
                <CardTitle>Shipping Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p>{order.address.street && `${order.address.street}, `}</p>
                    <p>{order.address.village && `${order.address.village}, `}</p>
                    <p>{order.address.suco}, {order.address.postoAdmin}</p>
                    <p>{order.address.municipality}</p>
                    {order.address.reference && (
                      <p className="text-muted-foreground">Ref: {order.address.reference}</p>
                    )}
                    <p className="mt-1">Phone: {order.address.phone}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}