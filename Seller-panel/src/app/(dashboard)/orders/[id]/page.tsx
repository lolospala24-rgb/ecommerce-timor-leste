'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { OrderStatusBadge, ShippingStatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useSellerOrder, useUpdateOrderStatus } from '@/hooks/useSellerOrders';
import { ORDER_STATUS_LABELS, ORDER_STATUS_TRANSITIONS, type OrderStatus } from '@/types/order.types';

export default function OrderDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const { data: order, isLoading } = useSellerOrder(id);
  const updateStatus = useUpdateOrderStatus();
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Order not found.{' '}
        <Link href="/orders" className="text-primary hover:underline">
          Back to orders
        </Link>
      </div>
    );
  }

  const transitions = ORDER_STATUS_TRANSITIONS[order.status];

  return (
    <div>
      <Link href="/orders" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to orders
      </Link>
      <PageHeader
        title={order.orderNumber}
        description={`Placed ${format(new Date(order.createdAt), 'MMM d, yyyy · h:mm a')}`}
        action={
          <div className="flex items-center gap-2">
            <OrderStatusBadge status={order.status} />
            <ShippingStatusBadge status={order.shippingStatus} />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-lg border bg-card p-5">
            <h3 className="mb-4 font-medium">Items</h3>
            <div className="divide-y">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border bg-muted">
                    {item.product.thumbnail && (
                      <Image src={item.product.thumbnail} alt={item.product.name} width={48} height={48} unoptimized className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} × ${item.price.toFixed(2)}
                    </p>
                  </div>
                  <p className="text-sm font-medium tabular-nums">${item.total.toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-1.5 border-t pt-4 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums">${order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span>
                <span className="tabular-nums">${order.shippingCost.toFixed(2)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount</span>
                  <span className="tabular-nums">-${order.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-1.5 font-medium">
                <span>Total</span>
                <span className="tabular-nums">${order.total.toFixed(2)}</span>
              </div>
              {order.sellerNetAmount != null && (
                <div className="flex justify-between text-success">
                  <span>Your net earnings</span>
                  <span className="tabular-nums">${order.sellerNetAmount.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {order.timeline?.length > 0 && (
            <div className="rounded-lg border bg-card p-5">
              <h3 className="mb-4 font-medium">Timeline</h3>
              <div className="space-y-4">
                {order.timeline.map((step, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full',
                          step.completed ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {step.completed && <Check className="h-3.5 w-3.5" />}
                      </div>
                      {idx < order.timeline.length - 1 && <div className="h-full w-px flex-1 bg-border" />}
                    </div>
                    <div className="pb-4">
                      <p className={cn('text-sm font-medium', !step.completed && 'text-muted-foreground')}>{step.description}</p>
                      {step.date && <p className="text-xs text-muted-foreground">{format(new Date(step.date), 'MMM d, yyyy · h:mm a')}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-5">
            <h3 className="mb-3 font-medium">Customer</h3>
            <p className="text-sm font-medium">{order.customer.name}</p>
            <p className="text-sm text-muted-foreground">{order.customer.email}</p>
            <p className="text-sm text-muted-foreground">{order.customer.phone}</p>
          </div>

          <div className="rounded-lg border bg-card p-5">
            <h3 className="mb-3 font-medium">Delivery</h3>
            <p className="text-sm">{order.deliveryRecipientName}</p>
            <p className="text-sm text-muted-foreground">{order.deliveryPhone}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {[order.deliveryStreet, order.deliverySuco, order.deliveryPostoAdmin, order.deliveryMunicipality].filter(Boolean).join(', ')}
            </p>
            {order.deliveryReference && <p className="text-xs text-muted-foreground">Ref: {order.deliveryReference}</p>}
            {order.trackingNumber && (
              <p className="mt-2 text-xs text-muted-foreground">
                Tracking: <span className="font-medium text-foreground">{order.trackingNumber}</span>
              </p>
            )}
          </div>

          {transitions.length > 0 && (
            <div className="rounded-lg border bg-card p-5">
              <h3 className="mb-3 font-medium">Update Status</h3>
              {transitions.includes('SHIPPING') && (
                <div className="mb-3 space-y-1.5">
                  <Label htmlFor="tracking" className="text-xs text-muted-foreground">
                    Tracking number (optional — auto-generated if left blank)
                  </Label>
                  <Input id="tracking" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="ET-…" />
                </div>
              )}
              <div className="space-y-2">
                {transitions.map((next) => (
                  <Button
                    key={next}
                    variant={next === 'CANCELLED' ? 'outline' : 'default'}
                    className={cn('w-full justify-center', next === 'CANCELLED' && 'text-destructive hover:text-destructive')}
                    onClick={() => setPendingStatus(next)}
                  >
                    Mark as {ORDER_STATUS_LABELS[next]}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingStatus}
        onOpenChange={(open) => !open && setPendingStatus(null)}
        title={`Mark order as ${pendingStatus ? ORDER_STATUS_LABELS[pendingStatus] : ''}?`}
        description={
          pendingStatus === 'DELIVERED'
            ? 'This confirms the order was delivered and releases your earnings from this order into your available balance.'
            : pendingStatus === 'CANCELLED'
              ? 'This will cancel the order and restore stock. If payment was already received, a refund will be created automatically.'
              : `The order status will change to ${pendingStatus ? ORDER_STATUS_LABELS[pendingStatus] : ''}.`
        }
        destructive={pendingStatus === 'CANCELLED'}
        isLoading={updateStatus.isPending}
        confirmText={updateStatus.isPending ? 'Updating…' : 'Confirm'}
        onConfirm={() => {
          if (!pendingStatus) return;
          updateStatus.mutate(
            { id: order.id, status: pendingStatus, trackingNumber: trackingNumber || undefined },
            { onSuccess: () => setPendingStatus(null) },
          );
        }}
      />
    </div>
  );
}
