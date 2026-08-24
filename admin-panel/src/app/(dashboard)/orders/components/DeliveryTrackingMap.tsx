'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, Marker, DirectionsRenderer, useJsApiLoader } from '@react-google-maps/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Truck, AlertTriangle } from 'lucide-react';
import { distanceMeters, distanceToPolylineMeters, formatDistance } from '@/lib/geo';

interface DeliveryTrackingMapProps {
  destination: { lat: number; lng: number } | null;
  courier: { lat: number; lng: number; updatedAt: string | null } | null;
  shippingStatus: string | null;
  driverDeliveredAt: string | null;
}

const mapContainerStyle = { width: '100%', height: '100%' };

// Below this, the courier's last ping is close enough to the pin to call it
// "arrived" rather than reporting a jittery few-meters GPS distance.
const ARRIVED_THRESHOLD_METERS = 150;
// A courier still BOOKED/IN_TRANSIT is expected to ping every ~8s (see the
// driver portal/app); no update in this long means they likely backgrounded
// the tab or lost signal, not that they're standing still.
const STALE_MINUTES = 10;
// Beyond this, "different equally-valid street" stops being a plausible
// explanation and it's worth a dispatcher's attention. Generous on purpose
// — GPS drift plus this being a single Directions-API suggestion (not
// necessarily the only sane route) both push toward false positives at a
// tighter number.
const OFF_ROUTE_THRESHOLD_METERS = 350;

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
}

export function DeliveryTrackingMap({
  destination,
  courier,
  shippingStatus,
  driverDeliveredAt,
}: DeliveryTrackingMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
  });
  const mapRef = useRef<google.maps.Map | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [directionsError, setDirectionsError] = useState(false);
  // The *planned* path, frozen the first time a route is computed for this
  // destination — deliberately never overwritten by a later reroute, or
  // "off route" would be meaningless (a fresh route from wherever the
  // courier currently is is *always* on-route by construction). This is an
  // honest approximation of "the route from dispatch," not the true thing:
  // it locks onto whichever position this map component happens to first
  // observe, which may already be partway into the trip if a dispatcher
  // opens the page after the courier has been moving a while.
  const plannedPathRef = useRef<{ lat: number; lng: number }[] | null>(null);
  const plannedForDestRef = useRef<string | null>(null);

  const distance = useMemo(() => {
    if (!destination || !courier) return null;
    return distanceMeters(destination.lat, destination.lng, courier.lat, courier.lng);
  }, [destination, courier]);

  const isStale = useMemo(() => {
    if (!courier?.updatedAt) return false;
    const minutesSince = (Date.now() - new Date(courier.updatedAt).getTime()) / 60000;
    return minutesSince > STALE_MINUTES;
  }, [courier?.updatedAt]);

  const isActivelyTracking = shippingStatus === 'BOOKED' || shippingStatus === 'IN_TRANSIT';

  // Re-fit bounds whenever either point moves, not just on first mount —
  // this is the whole point of it being a *live* tracking map.
  useEffect(() => {
    if (!mapRef.current) return;
    if (destination && courier) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(destination);
      bounds.extend(courier);
      mapRef.current.fitBounds(bounds, 64);
    } else if (destination) {
      mapRef.current.panTo(destination);
    } else if (courier) {
      mapRef.current.panTo(courier);
    }
  }, [destination?.lat, destination?.lng, courier?.lat, courier?.lng]);

  // Computed exactly once per destination — from wherever the courier is
  // when this first runs — and then left alone. Recomputing on every
  // position ping (the previous behavior) always draws a route *from where
  // they currently are*, which by construction can never show as
  // off-route; freezing it is what makes "did they leave the planned road"
  // a meaningful question instead of a tautology.
  useEffect(() => {
    if (!isLoaded || !destination || !courier) return;
    const destKey = `${destination.lat},${destination.lng}`;
    if (plannedForDestRef.current === destKey) return;

    setDirectionsError(false);
    const service = new google.maps.DirectionsService();
    service.route(
      { origin: courier, destination, travelMode: google.maps.TravelMode.DRIVING },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirections(result);
          plannedPathRef.current = result.routes[0].overview_path.map((p) => ({ lat: p.lat(), lng: p.lng() }));
          plannedForDestRef.current = destKey;
        } else {
          // No road route (e.g. a GPS ping that landed off-network, or the
          // Directions API isn't enabled for this key) — the two markers
          // and straight-line distance badge above still tell the story.
          // Deliberately not marking destKey as "done" here — if the very
          // first ping was an outlier, the next one gets a real attempt.
          setDirections(null);
          setDirectionsError(true);
        }
      },
    );
  }, [isLoaded, destination?.lat, destination?.lng, courier?.lat, courier?.lng]);

  const offRouteMeters = useMemo(() => {
    if (!courier || !plannedPathRef.current) return null;
    return distanceToPolylineMeters(courier, plannedPathRef.current);
  }, [courier, directions]);

  const isOffRoute = offRouteMeters != null && offRouteMeters > OFF_ROUTE_THRESHOLD_METERS;

  const center = destination || courier || { lat: -8.5569, lng: 125.5603 };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Navigation className="h-4 w-4" />
          Delivery Tracking
        </CardTitle>
        <CardDescription>
          Compare the courier&apos;s last-known position against the delivery address to verify progress.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {!courier ? (
            <Badge variant="secondary">Courier hasn&apos;t shared a location yet</Badge>
          ) : distance != null ? (
            distance <= ARRIVED_THRESHOLD_METERS ? (
              <Badge variant="success">
                {shippingStatus === 'DELIVERED' ? 'Delivered near address' : 'Arrived'} · {formatDistance(distance)} from pin
              </Badge>
            ) : (
              <Badge variant="warning">{formatDistance(distance)} from delivery address</Badge>
            )
          ) : null}

          {isStale && isActivelyTracking && (
            <Badge variant="destructive">No location update in {relativeTime(courier!.updatedAt!)}</Badge>
          )}

          {isOffRoute && isActivelyTracking && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" /> {formatDistance(offRouteMeters!)} off the planned route
            </Badge>
          )}

          {shippingStatus === 'DELIVERED' && driverDeliveredAt && (
            <Badge variant="secondary">Marked delivered {new Date(driverDeliveredAt).toLocaleString()}</Badge>
          )}
        </div>

        <div className="h-80 rounded-2xl border overflow-hidden bg-slate-100">
          {!apiKey ? (
            <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
              Google Maps API key not configured.
            </div>
          ) : loadError ? (
            <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
              Failed to load Google Maps.
            </div>
          ) : !isLoaded ? (
            <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
              Loading map...
            </div>
          ) : !destination && !courier ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
              <MapPin className="h-6 w-6 text-slate-300" />
              No delivery pin or courier location available for this order.
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={center}
              zoom={destination && courier ? 12 : 15}
              onLoad={(map) => {
                mapRef.current = map;
              }}
              options={{
                // @react-google-maps/api's top-level `mapTypeId` prop is
                // dead code in this version (never read past destructuring)
                // — it has to go through `options` (-> map.setOptions) to
                // actually take effect. Hybrid = satellite imagery + road
                // labels, which is what "satellite view" means in Google
                // Maps' own consumer UI (plain `satellite` has no labels).
                mapTypeId: 'hybrid',
                streetViewControl: false,
                fullscreenControl: false,
                mapTypeControl: true,
                mapTypeControlOptions: {
                  position: google.maps.ControlPosition.TOP_RIGHT,
                },
              }}
            >
              {directions && (
                <DirectionsRenderer
                  directions={directions}
                  options={{
                    suppressMarkers: true,
                    polylineOptions: {
                      strokeColor: isOffRoute ? '#d97706' : '#0f766e',
                      strokeWeight: 4,
                      strokeOpacity: 0.85,
                    },
                  }}
                />
              )}
              {destination && (
                <Marker
                  position={destination}
                  title="Delivery address"
                  icon={{
                    path: 'M0,-32C-12.15,-32 -22,-22.15 -22,-10.5C-22,1.15 -12.15,11 -0,11C12.15,11 22,1.15 22,-10.5C22,-22.15 12.15,-32 0,-32Z',
                    fillColor: '#e11d48',
                    fillOpacity: 0.95,
                    strokeWeight: 0,
                    scale: 1,
                  }}
                />
              )}
              {courier && (
                <Marker
                  position={courier}
                  title={isOffRoute ? 'Courier — off the planned route' : 'Courier — last known position'}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: isOffRoute ? '#d97706' : '#0f766e',
                    fillOpacity: 0.95,
                    strokeColor: '#ffffff',
                    strokeWeight: 2,
                    scale: 9,
                  }}
                />
              )}
            </GoogleMap>
          )}
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-600" /> Delivery address
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5 text-teal-700" /> Courier last seen
            {courier?.updatedAt && ` · ${relativeTime(courier.updatedAt)}`}
          </span>
          {directions && (
            <span className="inline-flex items-center gap-1.5">
              <span className={`inline-block h-0.5 w-4 rounded-full ${isOffRoute ? 'bg-amber-600' : 'bg-teal-700'}`} />
              Planned route
            </span>
          )}
          {directionsError && destination && courier && (
            <span>Couldn&apos;t compute a driving route between these points.</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
