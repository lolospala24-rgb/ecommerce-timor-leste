'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDriverDeliveries, useUpdateCourierLocation, useUpdateShippingStatus, DriverDelivery } from '@/hooks/useDriver';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Navigation, Phone, RadioTower, User } from 'lucide-react';
import toast from 'react-hot-toast';

const ACTIVE_SHIPPING_STATUSES = ['BOOKED', 'IN_TRANSIT'];

const NEXT_STATUS: Record<string, { label: string; next: DriverDelivery['shippingStatus'] } | null> = {
  PENDING: { label: 'Mark as Booked', next: 'BOOKED' },
  BOOKED: { label: 'Start Delivery (In Transit)', next: 'IN_TRANSIT' },
  IN_TRANSIT: { label: 'Mark as Delivered', next: 'DELIVERED' },
  DELIVERED: null,
  FAILED: null,
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-slate-100 text-slate-700',
  BOOKED: 'bg-blue-100 text-blue-700',
  IN_TRANSIT: 'bg-amber-100 text-amber-700',
  DELIVERED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
};

export default function DriverPortalPage() {
  const { data: deliveries, isLoading } = useDriverDeliveries();
  const updateLocation = useUpdateCourierLocation();
  const updateStatus = useUpdateShippingStatus();

  const [sharing, setSharing] = useState(false);
  const [lastSentAt, setLastSentAt] = useState<Date | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastSendTsRef = useRef<number>(0);
  const activeOrderIdsRef = useRef<number[]>([]);

  useEffect(() => {
    activeOrderIdsRef.current = (deliveries || [])
      .filter((d) => ACTIVE_SHIPPING_STATUSES.includes(d.shippingStatus))
      .map((d) => d.id);
  }, [deliveries]);

  const handlePosition = useCallback(
    (position: GeolocationPosition) => {
      const now = Date.now();
      // watchPosition can fire far more often than the backend needs —
      // once every ~8s is plenty for a customer watching a delivery map.
      if (now - lastSendTsRef.current < 8000) return;
      lastSendTsRef.current = now;

      const { latitude, longitude } = position.coords;
      const orderIds = activeOrderIdsRef.current;
      if (orderIds.length === 0) return;

      Promise.all(
        orderIds.map((orderId) => updateLocation.mutateAsync({ orderId, latitude, longitude })),
      )
        .then(() => setLastSentAt(new Date()))
        .catch(() => {
          // Silent — a single dropped ping isn't worth interrupting the
          // driver; the next watchPosition tick will retry.
        });
    },
    [updateLocation],
  );

  const stopSharing = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setSharing(false);
  }, []);

  const startSharing = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported on this device.');
      return;
    }
    setGeoError(null);
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      (err) => setGeoError(err.message || 'Could not get your location.'),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    setSharing(true);
  }, [handlePosition]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const handleStatusUpdate = (delivery: DriverDelivery) => {
    const step = NEXT_STATUS[delivery.shippingStatus];
    if (!step) return;
    updateStatus.mutate({ orderId: delivery.id, shippingStatus: step.next });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const activeCount = (deliveries || []).filter((d) => ACTIVE_SHIPPING_STATUSES.includes(d.shippingStatus)).length;

  return (
    <div className="space-y-5">
      {/* Location sharing is deliberately one switch for every active
          delivery at once — a driver only has one real position, and
          pretending otherwise per-order would just be more taps for the
          same GPS reading. */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <RadioTower className={`h-5 w-5 ${sharing ? 'text-green-600' : 'text-slate-400'}`} />
            <div>
              <p className="text-sm font-semibold">
                {sharing ? 'Sharing your location' : 'Location sharing is off'}
              </p>
              <p className="text-xs text-muted-foreground">
                {activeCount} active {activeCount === 1 ? 'delivery' : 'deliveries'}
                {lastSentAt && sharing ? ` · last sent ${lastSentAt.toLocaleTimeString()}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => (sharing ? stopSharing() : startSharing())}
            disabled={activeCount === 0}
            className={`rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
              sharing ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-primary text-primary-foreground hover:opacity-90'
            }`}
          >
            {sharing ? 'Stop Sharing' : 'Start Sharing'}
          </button>
        </div>
        {geoError && <p className="mt-2 text-xs text-red-600">{geoError}</p>}
        {activeCount === 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            No active deliveries right now — sharing turns on automatically once you have one.
          </p>
        )}
      </div>

      {!deliveries || deliveries.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No deliveries assigned to you yet.
        </div>
      ) : (
        deliveries.map((delivery) => {
          const step = NEXT_STATUS[delivery.shippingStatus];
          const addressLine = [
            delivery.deliveryStreet,
            delivery.deliveryVillage,
            delivery.deliverySuco,
            delivery.deliveryPostoAdmin,
            delivery.deliveryMunicipality,
          ]
            .filter(Boolean)
            .join(', ');

          return (
            <div key={delivery.id} className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">{delivery.orderNumber}</p>
                  {delivery.deliveryRecipientName && (
                    <p className="mt-0.5 flex items-center gap-1.5 font-semibold">
                      <User className="h-4 w-4 text-muted-foreground" /> {delivery.deliveryRecipientName}
                    </p>
                  )}
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[delivery.shippingStatus] || 'bg-slate-100 text-slate-700'}`}>
                  {delivery.shippingStatus.replace('_', ' ')}
                </span>
              </div>

              <p className="mt-2 text-sm text-slate-700">{addressLine || 'No address on file'}</p>
              {delivery.deliveryReference && (
                <p className="text-xs text-muted-foreground">Ref: {delivery.deliveryReference}</p>
              )}
              {delivery.deliveryPhone && (
                <a
                  href={`tel:${delivery.deliveryPhone}`}
                  className="mt-1 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <Phone className="h-3.5 w-3.5" /> {delivery.deliveryPhone}
                </a>
              )}

              {delivery.deliveryLatitude != null && delivery.deliveryLongitude != null && (
                <div className="mt-2 flex gap-3">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${delivery.deliveryLatitude},${delivery.deliveryLongitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <MapPin className="h-3.5 w-3.5" /> View on Map
                  </a>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${delivery.deliveryLatitude},${delivery.deliveryLongitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <Navigation className="h-3.5 w-3.5" /> Navigate
                  </a>
                </div>
              )}

              {step && (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate(delivery)}
                    disabled={updateStatus.isPending}
                    className="flex-1 rounded-full bg-primary py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                  >
                    {step.label}
                  </button>
                  {ACTIVE_SHIPPING_STATUSES.includes(delivery.shippingStatus) && (
                    <button
                      type="button"
                      onClick={() => updateStatus.mutate({ orderId: delivery.id, shippingStatus: 'FAILED' })}
                      disabled={updateStatus.isPending}
                      className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      Failed
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
