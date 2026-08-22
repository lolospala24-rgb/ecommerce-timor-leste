'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Package, MapPin, CheckCircle, Truck, User } from 'lucide-react';

interface TrackedOrder {
  id: number;
  orderNumber: string;
  status: string;
  shippingStatus: string;
  trackingNumber: string | null;
  deliveryMunicipality: string | null;
  courierLatitude: number | null;
  courierLongitude: number | null;
  courierLocationUpdatedAt: string | null;
  customer: { name: string };
  seller: { storeName: string };
  assignedDriver: { name: string } | null;
  items: Array<{ id: number; quantity: number; product: { name: string; thumbnail: string | null } }>;
  timeline: Array<{ status: string; date: string; description: string; completed: boolean }>;
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={null}>
      <TrackOrderContent />
    </Suspense>
  );
}

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const [trackingNumber, setTrackingNumber] = useState(searchParams.get('number') || '');
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = trackingNumber.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setError(null);
    setOrder(null);
    try {
      const response = await api.get(`/orders/tracking/${encodeURIComponent(trimmed)}`);
      const data = response.data?.data ?? response.data;
      setOrder(data);
    } catch (err: any) {
      setError(
        err.response?.status === 404
          ? "We couldn't find an order with that tracking number."
          : 'Something went wrong while looking up your order. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container-custom max-w-2xl py-8 md:py-12">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Track Your Order</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the tracking number from your shipping notification to see its current status.
        </p>
      </div>

      <form onSubmit={handleSearch} className="mt-6 flex gap-2">
        <Input
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          placeholder="e.g. ET-ORD1234-56789A"
          className="h-11"
        />
        <Button type="submit" size="lg" disabled={isLoading || !trackingNumber.trim()}>
          <Search className="mr-2 h-4 w-4" /> Track
        </Button>
      </form>

      {isLoading && (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {error && !isLoading && (
        <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {order && !isLoading && (
        <div className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Package className="h-4 w-4" /> {order.orderNumber}
                </span>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {order.status.replace('_', ' ')}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">Sold by {order.seller.storeName}</p>
              {order.deliveryMunicipality && (
                <p className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Delivering to {order.deliveryMunicipality}
                </p>
              )}
              {order.assignedDriver && (
                <p className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" /> Driver: {order.assignedDriver.name}
                </p>
              )}
            </CardContent>
          </Card>

          {order.courierLatitude != null && order.courierLongitude != null && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Truck className="h-4 w-4" /> Live Delivery Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {order.courierLocationUpdatedAt && (
                  <p className="text-xs text-muted-foreground">
                    Last updated {new Date(order.courierLocationUpdatedAt).toLocaleTimeString()}
                  </p>
                )}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${order.courierLatitude},${order.courierLongitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <MapPin className="h-3.5 w-3.5" /> View on Map
                </a>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Delivery Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                {order.timeline.map((step, index) => (
                  <li key={index} className="flex gap-3">
                    <div className="mt-0.5">
                      <CheckCircle
                        className={`h-4 w-4 ${step.completed ? 'text-green-600' : 'text-muted-foreground/40'}`}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{step.status}</p>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                      {step.date && (
                        <p className="text-xs text-muted-foreground/70">
                          {new Date(step.date).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
