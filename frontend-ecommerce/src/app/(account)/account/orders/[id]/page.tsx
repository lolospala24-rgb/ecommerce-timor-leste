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
import { BankTransferProof } from '@/components/checkout/BankTransferProof';
import { RefundRequestPanel } from '@/components/orders/RefundRequestPanel';

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'bg-amber-500' },
  PAID: { label: 'Paid', color: 'bg-green-600' },
  PROCESSING: { label: 'Processing', color: 'bg-blue-600' },
  SHIPPING: { label: 'In Transit', color: 'bg-blue-600' },
  DELIVERED: { label: 'Delivered', color: 'bg-green-600' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-600' },
};

const paymentStatusColors: Record<string, string> = {
  PENDING: 'text-amber-600',
  PAID: 'text-green-600',
  FAILED: 'text-red-600',
  REFUNDED: 'text-slate-600',
  PARTIALLY_REFUNDED: 'text-slate-600',
};

const paymentStatusLabels: Record<string, string> = {
  PENDING: 'Pending',
  PAID: 'Paid',
  FAILED: 'Rejected',
  REFUNDED: 'Refunded',
  PARTIALLY_REFUNDED: 'Partially Refunded',
};

const formatMoney = (value: unknown) => {
  const numericValue = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(numericValue) ? numericValue.toFixed(2) : '0.00';
};

export default function AccountOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = parseInt(params.id as string);
  const { data: order, isLoading, refetch } = useOrder(orderId);
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

  const status = statusConfig[order.status] || { label: order.status, color: 'bg-slate-500' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">Order #{order.orderNumber}</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <Badge className={`${status.color} text-white px-4 py-2 self-start sm:self-auto ml-12 sm:ml-0`}>
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
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-slate-100">
                    <Image
                      src={item.product?.thumbnail || '/images/placeholder.png'}
                      alt={item.product?.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <Link href={`/products/${item.product?.slug || '#'}`} className="hover:text-primary">
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
                        <div className="h-2 w-2 mt-2 rounded-full bg-green-600" />
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
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>${formatMoney(order.taxAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Service Fee</span>
                <span>${formatMoney(order.serviceFee)}</span>
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
              {order.payment?.status && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payment Status</span>
                  <span className={`font-medium ${paymentStatusColors[order.payment.status] || ''}`}>
                    {paymentStatusLabels[order.payment.status] || order.payment.status}
                  </span>
                </div>
              )}
              {order.trackingNumber && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tracking</span>
                  <span className="font-mono text-xs">{order.trackingNumber}</span>
                </div>
              )}
              {order.assignedDriver && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Driver</span>
                  <span>
                    {order.assignedDriver.name}
                    {order.assignedDriver.phone ? ` · ${order.assignedDriver.phone}` : ''}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {order.paymentMethod === 'BANK_TRANSFER' && order.status !== 'CANCELLED' && (
            <BankTransferProof
              orderId={order.id}
              amount={Number(order.total ?? 0)}
              payment={order.payment}
              onUpdated={() => refetch()}
            />
          )}

          <RefundRequestPanel
            orderId={order.id}
            orderStatus={order.status}
            paymentStatus={order.payment?.status}
            deliveredAt={order.deliveredAt}
          />

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

          {/* Shipping Address — reads the order's delivery snapshot first
              (fixed at the moment this order was placed) and only falls
              back to the live Address relation for orders placed before
              the snapshot fields existed. Never re-derives from a since-edited
              Address once a snapshot is present. */}
          {(order.deliveryMunicipality || order.address) && (
            <Card>
              <CardHeader>
                <CardTitle>Shipping Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    {(order.deliveryRecipientName ?? order.address?.recipientName) && (
                      <p className="font-medium text-foreground">
                        Recipient: {order.deliveryRecipientName ?? order.address?.recipientName}
                      </p>
                    )}
                    <p>
                      {[
                        order.deliveryStreet ?? order.address?.street,
                        order.deliveryVillage ?? order.address?.village,
                        order.deliverySuco ?? order.address?.suco,
                        order.deliveryPostoAdmin ?? order.address?.postoAdmin,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                    <p>{order.deliveryMunicipality ?? order.address?.municipality}</p>
                    {(order.deliveryReference ?? order.address?.reference) && (
                      <p className="text-muted-foreground">
                        Ref: {order.deliveryReference ?? order.address?.reference}
                      </p>
                    )}
                    <p className="mt-1">Phone: {order.deliveryPhone ?? order.address?.phone}</p>
                    {order.deliveryLatitude != null && order.deliveryLongitude != null && (
                      <p className="mt-1 text-muted-foreground">
                        Exact pin: {order.deliveryLatitude.toFixed(5)}, {order.deliveryLongitude.toFixed(5)}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Live courier position — deliberately separate from the frozen
              delivery snapshot above: this is the courier's current,
              constantly-changing location, kept live via the same
              useOrderRealtime() socket subscription already active on this
              page (see order-updated events emitted from
              OrdersService.updateCourierLocation). */}
          {order.courierLatitude != null && order.courierLongitude != null && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Truck className="h-4 w-4" /> Live Delivery Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-mono text-xs text-muted-foreground">
                  {order.courierLatitude.toFixed(5)}, {order.courierLongitude.toFixed(5)}
                </p>
                {order.courierLocationUpdatedAt && (
                  <p className="text-xs text-muted-foreground">
                    Last updated {new Date(order.courierLocationUpdatedAt).toLocaleTimeString()}
                  </p>
                )}
                <div className="flex gap-3">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${order.courierLatitude},${order.courierLongitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <MapPin className="h-3.5 w-3.5" /> View on Map
                  </a>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}