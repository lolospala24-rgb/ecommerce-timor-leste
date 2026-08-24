'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { useOrders } from '@/hooks/useOrders';
import { getSocket } from '@/lib/socket';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Navigation, Truck, ExternalLink } from 'lucide-react';
import { distanceMeters, formatDistance } from '@/lib/geo';

// Stable reference across renders — this page's query never changes its
// own filters, so this can live outside the component instead of being
// re-created (and re-keying the query) on every render.
const ACTIVE_TRACKING_FILTERS = {
  shippingStatus: ['BOOKED', 'IN_TRANSIT'],
  hasDriver: true,
  limit: 100,
};

const mapContainerStyle = { width: '100%', height: '100%' };
const STALE_MINUTES = 10;

interface DriverGroup {
  driverId: number;
  name: string;
  phone: string | null;
  position: { lat: number; lng: number };
  updatedAt: string | null;
  orders: Array<{
    id: number;
    orderNumber: string;
    shippingStatus?: string;
    deliveryLatitude?: number | null;
    deliveryLongitude?: number | null;
    deliveryMunicipality?: string | null;
  }>;
}

function relativeTime(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes === 1) return '1 min ago';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
}

export default function LiveTrackingPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useOrders(ACTIVE_TRACKING_FILTERS);
  const orders = data?.data ?? [];

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded, loadError } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: apiKey });
  const mapRef = useRef<google.maps.Map | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);

  // Every courier-location ping reaches every connected admin globally (the
  // backend joins ADMIN sockets to the 'admins' room on connect and
  // broadcasts there — see NotificationsGateway.handleConnection /
  // OrdersService.updateCourierLocation) — no per-order room join needed,
  // unlike useOrderRealtime's page-scoped join. A pure location ping has no
  // `status`, so it's patched directly into the cache instead of triggering
  // a refetch of the whole active list on every ~8s tick.
  useEffect(() => {
    const socket = getSocket();
    const onOrderUpdated = (payload: any) => {
      if (payload?.courierLatitude == null || payload?.orderId == null) return;
      queryClient.setQueriesData({ queryKey: ['orders', ACTIVE_TRACKING_FILTERS] }, (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((o: any) =>
            o.id === payload.orderId
              ? {
                  ...o,
                  courierLatitude: payload.courierLatitude,
                  courierLongitude: payload.courierLongitude,
                  courierLocationUpdatedAt: payload.courierLocationUpdatedAt,
                }
              : o,
          ),
        };
      });
    };
    socket.on('order-updated', onOrderUpdated);
    return () => {
      socket.off('order-updated', onOrderUpdated);
    };
  }, [queryClient]);

  const driverGroups = useMemo<DriverGroup[]>(() => {
    const byDriver = new Map<number, DriverGroup>();
    for (const o of orders) {
      if (!o.assignedDriverId || !o.assignedDriver) continue;
      if (o.courierLatitude == null || o.courierLongitude == null) continue;

      const existing = byDriver.get(o.assignedDriverId);
      const thisUpdatedAt = o.courierLocationUpdatedAt ?? null;
      const orderEntry = {
        id: o.id,
        orderNumber: o.orderNumber,
        shippingStatus: o.shippingStatus,
        deliveryLatitude: o.deliveryLatitude,
        deliveryLongitude: o.deliveryLongitude,
        deliveryMunicipality: o.deliveryMunicipality,
      };

      if (!existing) {
        byDriver.set(o.assignedDriverId, {
          driverId: o.assignedDriverId,
          name: o.assignedDriver.name,
          phone: o.assignedDriver.phone,
          position: { lat: o.courierLatitude, lng: o.courierLongitude },
          updatedAt: thisUpdatedAt,
          orders: [orderEntry],
        });
      } else {
        existing.orders.push(orderEntry);
        // A driver can be juggling more than one active delivery — keep
        // whichever position is freshest as the marker's location.
        if (thisUpdatedAt && (!existing.updatedAt || thisUpdatedAt > existing.updatedAt)) {
          existing.position = { lat: o.courierLatitude, lng: o.courierLongitude };
          existing.updatedAt = thisUpdatedAt;
        }
      }
    }
    return Array.from(byDriver.values());
  }, [orders]);

  const selectedDriver = driverGroups.find((d) => d.driverId === selectedDriverId) ?? null;

  useEffect(() => {
    if (!mapRef.current || driverGroups.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    driverGroups.forEach((d) => bounds.extend(d.position));
    mapRef.current.fitBounds(bounds, 48);
  }, [driverGroups]);

  const noLocationCount = orders.filter(
    (o: any) => o.courierLatitude == null || o.courierLongitude == null,
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Navigation className="h-6 w-6" />
          Live Driver Tracking
        </h1>
        <p className="text-muted-foreground">
          Every courier currently out on a delivery, updating live as they move.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="h-[32rem] bg-slate-100">
              {!apiKey ? (
                <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
                  Google Maps API key not configured.
                </div>
              ) : loadError ? (
                <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
                  Failed to load Google Maps.
                </div>
              ) : !isLoaded || isLoading ? (
                <Skeleton className="h-full w-full rounded-none" />
              ) : driverGroups.length === 0 ? (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
                  <Truck className="h-8 w-8 text-slate-300" />
                  No couriers are currently out on a delivery.
                </div>
              ) : (
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={driverGroups[0].position}
                  zoom={12}
                  onLoad={(map) => {
                    mapRef.current = map;
                  }}
                  options={{
                    mapTypeId: 'hybrid',
                    streetViewControl: false,
                    fullscreenControl: false,
                    mapTypeControl: true,
                    mapTypeControlOptions: { position: google.maps.ControlPosition.TOP_RIGHT },
                  }}
                >
                  {driverGroups.map((d) => (
                    <Marker
                      key={d.driverId}
                      position={d.position}
                      title={d.name}
                      onClick={() => setSelectedDriverId(d.driverId)}
                      icon={{
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: d.driverId === selectedDriverId ? '#e11d48' : '#0f766e',
                        fillOpacity: 0.95,
                        strokeColor: '#ffffff',
                        strokeWeight: 2,
                        scale: 10,
                      }}
                    />
                  ))}
                </GoogleMap>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Couriers ({driverGroups.length})</CardTitle>
            <CardDescription>
              {noLocationCount > 0
                ? `${noLocationCount} assigned delivery${noLocationCount === 1 ? '' : 'ies'} without a location yet`
                : 'Tap a courier to focus the map'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[28rem] overflow-y-auto">
            {isLoading ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)
            ) : driverGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing to show right now.</p>
            ) : (
              driverGroups.map((d) => {
                const isStale = d.updatedAt
                  ? (Date.now() - new Date(d.updatedAt).getTime()) / 60000 > STALE_MINUTES
                  : false;
                return (
                  <button
                    key={d.driverId}
                    onClick={() => {
                      setSelectedDriverId(d.driverId);
                      mapRef.current?.panTo(d.position);
                      mapRef.current?.setZoom(14);
                    }}
                    className={`w-full rounded-2xl border p-3 text-left transition-colors ${
                      d.driverId === selectedDriverId ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm">{d.name}</p>
                      {isStale && <Badge variant="destructive">Stale</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {d.orders.length} active {d.orders.length === 1 ? 'delivery' : 'deliveries'}
                      {d.updatedAt && ` · ${relativeTime(d.updatedAt)}`}
                    </p>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {selectedDriver && (
        <Card>
          <CardHeader>
            <CardTitle>{selectedDriver.name}</CardTitle>
            <CardDescription>{selectedDriver.phone || 'No phone on file'}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedDriver.orders.map((o) => {
                const dist =
                  o.deliveryLatitude != null && o.deliveryLongitude != null
                    ? distanceMeters(
                        o.deliveryLatitude,
                        o.deliveryLongitude,
                        selectedDriver.position.lat,
                        selectedDriver.position.lng,
                      )
                    : null;
                return (
                  <div key={o.id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                    <div>
                      <p className="font-mono text-sm">{o.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {o.shippingStatus?.replace('_', ' ')}
                        {o.deliveryMunicipality && ` · ${o.deliveryMunicipality}`}
                        {dist != null && ` · ${formatDistance(dist)} from address`}
                      </p>
                    </div>
                    <Link
                      href={`/orders/${o.id}`}
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      View <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
