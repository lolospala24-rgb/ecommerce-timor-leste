"use client";

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useOrder } from '@/hooks/useOrders';
import { useOrderRealtime } from '@/hooks/useOrderRealtime';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Package, Truck, CheckCircle, Clock, MapPin, CreditCard, User, TicketPercent } from 'lucide-react';
import { BankTransferProof } from '@/components/checkout/BankTransferProof';
import { RefundRequestPanel } from '@/components/orders/RefundRequestPanel';

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-500',
  PAID: 'bg-green-600',
  PROCESSING: 'bg-blue-600',
  SHIPPING: 'bg-blue-600',
  DELIVERED: 'bg-green-600',
  CANCELLED: 'bg-red-600',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pending',
  PAID: 'Paid',
  PROCESSING: 'Processing',
  SHIPPING: 'In Transit',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
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

export default function OrderDetailPage() {
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
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Package className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold">Order Not Found</h2>
        <p className="text-muted-foreground mt-2">
          The order you're looking for doesn't exist or you don't have access to it.
        </p>
        <Button className="mt-6" asChild>
          <Link href="/orders">Back to Orders</Link>
        </Button>
      </div>
    );
  }

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
              Placed on {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <Badge className={`${statusColors[order.status]} text-white px-4 py-2`}>
          {statusLabels[order.status]}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Order Items */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
              <CardDescription>
                {order.items?.length || 0} items in this order
              </CardDescription>
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
                      Qty: {item.quantity} × ${item.price.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right font-medium">
                    ${item.total.toFixed(2)}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Order Timeline */}
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

        {/* Order Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${order.subtotal.toFixed(2)}</span>
              </div>
              {Number(order.discountAmount ?? 0) > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span className="flex items-center gap-1.5">
                    <TicketPercent className="h-3.5 w-3.5" />
                    Coupon{order.couponUsage?.coupon?.code ? ` (${order.couponUsage.coupon.code})` : ''}
                  </span>
                  <span>-${Number(order.discountAmount ?? 0).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span>${order.shippingCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>${(Number(order.taxAmount ?? 0) || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Service Fee</span>
                <span>${(Number(order.serviceFee ?? 0) || 0).toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="text-primary">${order.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment Method</span>
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
                  <span className="text-muted-foreground">Tracking Number</span>
                  <span className="font-mono text-xs">{order.trackingNumber}</span>
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
              <CardTitle>Customer Information</CardTitle>
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
              the snapshot fields existed. */}
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
        </div>
      </div>
    </div>
  );
}
