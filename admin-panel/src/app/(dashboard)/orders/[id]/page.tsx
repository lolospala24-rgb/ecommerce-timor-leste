'use client';

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
import { UpdateOrderStatus } from '../components/UpdateOrderStatus';
import { AssignDriver } from '../components/AssignDriver';
import { UpdateShippingStatus } from '../components/UpdateShippingStatus';
import { DeliveryTrackingMap } from '../components/DeliveryTrackingMap';
import {
  ArrowLeft,
  Package,
  Truck,
  MapPin,
  CreditCard,
  User,
  Store,
  FileText,
  Navigation,
  Clock,
} from 'lucide-react';

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-500',
  PAID: 'bg-blue-500',
  PROCESSING: 'bg-purple-500',
  SHIPPING: 'bg-indigo-500',
  DELIVERED: 'bg-green-500',
  CANCELLED: 'bg-red-500',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pending',
  PAID: 'Paid',
  PROCESSING: 'Processing',
  SHIPPING: 'Shipping',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
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
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Package className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Order Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The order you're looking for doesn't exist.
        </p>
        <Button onClick={() => router.push('/orders')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Orders
        </Button>
      </div>
    );
  }

  // Safe value extraction with fallbacks - using the actual order data
  const orderNumber = order.orderNumber || 'N/A';
  const status = order.status || 'PENDING';
  const createdAt = order.createdAt || new Date().toISOString();
  const subtotal = order.subtotal || 0;
  const shippingCost = order.shippingCost || 0;
  const taxAmount = order.taxAmount || 0;
  const serviceFee = order.serviceFee || 0;
  const discountAmount = order.discountAmount || 0;
  const couponCode = order.couponUsage?.coupon?.code || null;
  const total = order.total || 0;
  const items = order.items || [];
  const customer = order.customer || { name: 'N/A', email: 'N/A', phone: null };
  const seller = order.seller || { storeName: 'N/A', storePhone: null, storeEmail: null };
  // Delivery snapshot (fixed at order creation) takes priority over the live
  // Address relation, which may have since been edited or deleted — see
  // OrdersService.create's deliverySnapshot in the backend.
  const address = {
    street: order.deliveryStreet ?? order.address?.street ?? null,
    village: order.deliveryVillage ?? order.address?.village ?? null,
    suco: order.deliverySuco ?? order.address?.suco ?? 'N/A',
    postoAdmin: order.deliveryPostoAdmin ?? order.address?.postoAdmin ?? 'N/A',
    municipality: order.deliveryMunicipality ?? order.address?.municipality ?? 'N/A',
    reference: order.deliveryReference ?? order.address?.reference ?? null,
    recipientName: order.deliveryRecipientName ?? order.address?.recipientName ?? null,
    phone: order.deliveryPhone ?? order.address?.phone ?? 'N/A',
  };
  const deliveryLatitude = order.deliveryLatitude ?? null;
  const deliveryLongitude = order.deliveryLongitude ?? null;
  const shortDeliveryAddress =
    [address.street ?? address.village, address.municipality !== 'N/A' ? address.municipality : null]
      .filter(Boolean)
      .join(', ') || null;
  const payment = order.payment || { 
    method: 'N/A', 
    status: 'N/A', 
    paidAt: null, 
    transactionId: null 
  };
  const timeline = order.timeline || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Order #{orderNumber}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge className={statusColors[status] || 'bg-gray-500'}>
                {statusLabels[status] || status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Placed on {new Date(createdAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/orders/${orderId}/invoice`}>
              <FileText className="mr-2 h-4 w-4" />
              Invoice
            </Link>
          </Button>
          <UpdateOrderStatus
            orderId={order.id}
            currentStatus={status}
            onUpdate={refetch}
          />
        </div>
      </div>

      {/* Informational only — admin already has a way to force this via
          "Update Status" -> DELIVERED if needed. This just surfaces that
          the courier already dropped it off and the customer's grace
          period is running (see DeliveryAutoConfirmJob). */}
      {status === 'SHIPPING' && order.shippingStatus === 'DELIVERED' && (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-900">Awaiting customer confirmation</p>
            <p className="text-xs text-amber-700">
              Courier marked this delivered{order.driverDeliveredAt ? ` on ${new Date(order.driverDeliveredAt).toLocaleString()}` : ''}.
              It will auto-confirm in a few days if the customer doesn't respond.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Name</p>
              <p className="font-medium">{customer.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p>{customer.email || 'N/A'}</p>
            </div>
            {customer.phone && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Phone</p>
                <p>{customer.phone}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seller Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Seller Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Store</p>
              <p className="font-medium">{seller.storeName || 'N/A'}</p>
            </div>
            {seller.storePhone && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Phone</p>
                <p>{seller.storePhone}</p>
              </div>
            )}
            {seller.storeEmail && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p>{seller.storeEmail}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shipping Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Shipping Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {address.recipientName && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Recipient</p>
                <p>{address.recipientName}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">Address</p>
              <p>
                {address.street && `${address.street}, `}
                {address.village && `${address.village}, `}
                {address.suco || 'N/A'}, {address.postoAdmin || 'N/A'}, {address.municipality || 'N/A'}
              </p>
            </div>
            {address.reference && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Reference</p>
                <p>{address.reference}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">Phone</p>
              <p>{address.phone || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Exact Delivery Location</p>
              {deliveryLatitude != null && deliveryLongitude != null ? (
                <>
                  <p className="font-mono text-sm">{deliveryLatitude.toFixed(5)}, {deliveryLongitude.toFixed(5)}</p>
                  <div className="mt-1 flex gap-3">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${deliveryLatitude},${deliveryLongitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <MapPin className="h-3.5 w-3.5" /> View on Map
                    </a>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${deliveryLatitude},${deliveryLongitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <Navigation className="h-3.5 w-3.5" /> Open Navigation
                    </a>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Exact delivery location was not provided.</p>
              )}
            </div>
            {order.trackingNumber && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tracking Number</p>
                <p className="font-mono text-sm">{order.trackingNumber}</p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-muted-foreground">Driver</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="text-sm">
                  {order.assignedDriver ? `${order.assignedDriver.name}${order.assignedDriver.phone ? ` · ${order.assignedDriver.phone}` : ''}` : 'Not assigned'}
                </p>
                <AssignDriver
                  orderId={order.id}
                  orderNumber={order.orderNumber}
                  deliveryAddress={shortDeliveryAddress}
                  currentDriverId={order.assignedDriverId}
                  currentDriverName={order.assignedDriver?.name}
                />
              </div>
            </div>

            {order.shippingStatus && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Delivery Status</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="text-sm">{order.shippingStatus.replace('_', ' ')}</p>
                  <UpdateShippingStatus orderId={order.id} currentShippingStatus={order.shippingStatus} />
                </div>
              </div>
            )}

            {order.courierLatitude != null && order.courierLongitude != null && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Live Delivery Location</p>
                <p className="font-mono text-sm">{order.courierLatitude.toFixed(5)}, {order.courierLongitude.toFixed(5)}</p>
                {order.courierLocationUpdatedAt && (
                  <p className="text-xs text-muted-foreground">
                    Last updated {new Date(order.courierLocationUpdatedAt).toLocaleTimeString()}
                  </p>
                )}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${order.courierLatitude},${order.courierLongitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <MapPin className="h-3.5 w-3.5" /> View on Map
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {(deliveryLatitude != null && deliveryLongitude != null) || (order.courierLatitude != null && order.courierLongitude != null) ? (
        <DeliveryTrackingMap
          destination={deliveryLatitude != null && deliveryLongitude != null ? { lat: deliveryLatitude, lng: deliveryLongitude } : null}
          courier={
            order.courierLatitude != null && order.courierLongitude != null
              ? { lat: order.courierLatitude, lng: order.courierLongitude, updatedAt: order.courierLocationUpdatedAt ?? null }
              : null
          }
          shippingStatus={order.shippingStatus ?? null}
          driverDeliveredAt={order.driverDeliveredAt ?? null}
        />
      ) : null}

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
          <CardDescription>
            {items.length || 0} item(s) in this order
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No items found in this order.
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground pb-2 border-b">
                  <div className="col-span-6">Product</div>
                  <div className="col-span-2 text-center">Quantity</div>
                  <div className="col-span-2 text-right">Unit Price</div>
                  <div className="col-span-2 text-right">Total</div>
                </div>
                {items.map((item: any) => {
                  const productName = item.product?.name || 'Unknown Product';
                  const productThumbnail = item.product?.thumbnail || null;
                  const productSlug = item.product?.slug || '#';
                  const quantity = item.quantity || 0;
                  const price = item.price || 0;
                  const itemTotal = item.total || 0;
                  const itemKey = item.id || item.productId || `${productName}-${quantity}-${price}`;

                  return (
                    <div key={itemKey} className="grid grid-cols-12 gap-4 items-center py-3 border-b last:border-0">
                      <div className="col-span-6 flex items-center gap-3">
                        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                          {productThumbnail ? (
                            <Image
                              src={productThumbnail}
                              alt={productName}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Package className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div>
                          <Link 
                            href={`/products/${productSlug}`} 
                            className="font-medium hover:text-primary transition-colors"
                            target="_blank"
                          >
                            {productName}
                          </Link>
                          <p className="text-xs text-muted-foreground">SKU: {item.product?.sku || '-'}</p>
                        </div>
                      </div>
                      <div className="col-span-2 text-center">{quantity}</div>
                      <div className="col-span-2 text-right">${typeof price === 'number' ? price.toFixed(2) : '0.00'}</div>
                      <div className="col-span-2 text-right font-medium">
                        ${typeof itemTotal === 'number' ? itemTotal.toFixed(2) : '0.00'}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex justify-end">
                <div className="w-80 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${typeof subtotal === 'number' ? subtotal.toFixed(2) : '0.00'}</span>
                  </div>
                  {discountAmount > 0 && (
                    <>
                      <Separator />
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Coupon Discount{couponCode ? ` (${couponCode})` : ''}</span>
                        <span>-${discountAmount.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping Cost</span>
                    <span>${typeof shippingCost === 'number' ? shippingCost.toFixed(2) : '0.00'}</span>
                  </div>
                  {taxAmount > 0 && (
                    <>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax</span>
                        <span>${taxAmount.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  {serviceFee > 0 && (
                    <>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Service Fee</span>
                        <span>${serviceFee.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">${typeof total === 'number' ? total.toFixed(2) : '0.00'}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment Information */}
      {payment && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Method</p>
                <p className="font-medium">{payment.method === 'COD' ? 'Cash on Delivery' : payment.method || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge variant={payment.status === 'PAID' ? 'default' : 'secondary'}>
                  {payment.status || 'N/A'}
                </Badge>
              </div>
              {payment.paidAt && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Paid At</p>
                  <p>{new Date(payment.paidAt).toLocaleString()}</p>
                </div>
              )}
              {payment.transactionId && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Transaction ID</p>
                  <p className="font-mono text-sm">{payment.transactionId}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Timeline */}
      {timeline && timeline.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Order Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {timeline.map((event: any, index: number) => (
                <div key={`${event.status || 'event'}-${event.date || index}`} className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="h-2 w-2 mt-2 rounded-full bg-green-500" />
                    {index < timeline.length - 1 && (
                      <div className="h-full w-0.5 bg-muted ml-[3px]" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{event.status || 'Update'}</p>
                    <p className="text-sm text-muted-foreground">{event.description || ''}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {event.date ? new Date(event.date).toLocaleString() : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}