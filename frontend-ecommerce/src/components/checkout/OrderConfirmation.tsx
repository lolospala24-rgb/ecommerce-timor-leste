'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Package, Truck, Clock, Download, Printer, ShoppingBag } from 'lucide-react';

interface OrderConfirmationProps {
  orderId: number;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  estimatedDelivery?: string;
  onContinueShopping?: () => void;
}

export function OrderConfirmation({
  orderId,
  orderNumber,
  total,
  status,
  createdAt,
  estimatedDelivery,
  onContinueShopping,
}: OrderConfirmationProps) {
  const router = useRouter();

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Download invoice functionality
    window.open(`/orders/${orderId}/invoice`, '_blank');
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Success Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center rounded-full bg-green-100 p-4">
          <CheckCircle className="h-16 w-16 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold">Order Confirmed!</h1>
        <p className="text-muted-foreground">
          Thank you for your order. We'll send you a confirmation email shortly.
        </p>
      </div>

      {/* Order Details */}
      <Card>
        <CardHeader>
          <CardTitle>Order Details</CardTitle>
          <CardDescription>
            Order #{orderNumber} placed on {new Date(createdAt).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="text-center p-4 border rounded-lg">
              <Package className="h-6 w-6 mx-auto text-primary mb-2" />
              <p className="text-sm font-medium">Order Status</p>
              <p className="text-sm text-muted-foreground capitalize">{status.toLowerCase()}</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Truck className="h-6 w-6 mx-auto text-primary mb-2" />
              <p className="text-sm font-medium">Total</p>
              <p className="text-sm font-bold text-primary">${total.toFixed(2)}</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Clock className="h-6 w-6 mx-auto text-primary mb-2" />
              <p className="text-sm font-medium">Estimated Delivery</p>
              <p className="text-sm text-muted-foreground">
                {estimatedDelivery || '3-5 business days'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-4 border-t">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download Invoice
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>What's Next?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 text-sm">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
              1
            </div>
            <div>
              <p className="font-medium">Order Processing</p>
              <p className="text-muted-foreground">
                We're preparing your order for shipment
              </p>
            </div>
          </div>
          <div className="flex gap-3 text-sm">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
              2
            </div>
            <div>
              <p className="font-medium">Shipment & Tracking</p>
              <p className="text-muted-foreground">
                You'll receive a tracking number once your order ships
              </p>
            </div>
          </div>
          <div className="flex gap-3 text-sm">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
              3
            </div>
            <div>
              <p className="font-medium">Delivery</p>
              <p className="text-muted-foreground">
                Your order will be delivered to your doorstep
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-4">
        <Button asChild>
          <Link href={`/orders/${orderId}`}>
            <Package className="mr-2 h-4 w-4" />
            View Order Details
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/products" onClick={onContinueShopping}>
            <ShoppingBag className="mr-2 h-4 w-4" />
            Continue Shopping
          </Link>
        </Button>
      </div>
    </div>
  );
}