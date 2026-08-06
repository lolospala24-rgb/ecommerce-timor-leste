"use client";

import React, { useEffect, useRef, useState } from "react";
import mapboxgl from 'mapbox-gl';

type Location = {
  lat: number;
  lng: number;
  placeName?: string;
  street?: string;
  village?: string;
  suco?: string;
  postoAdmin?: string;
  municipality?: string;
};

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

export default function MapboxPicker({
  onSelect,
  onClose,
}: {
  onSelect: (loc: Location) => void;
  onClose: () => void;
}) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const leafletMapRef = useRef<any>(null);
  const leafletMarkerRef = useRef<any>(null);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<Location | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    // Debug token presence
    // eslint-disable-next-line no-console
    console.log('Mapbox access token (client):', mapboxgl.accessToken);

    if (mapRef.current) return;

    // Quick WebGL/support check
    try {
      const supported = typeof (mapboxgl as any).supported === 'function' ? (mapboxgl as any).supported() : true;
      if (!supported) {
        setInitError('Mapbox GL not supported in this browser (WebGL missing).');
        // eslint-disable-next-line no-console
        console.warn('Mapbox GL not supported');
        return;
      }
    } catch (e) {
      // ignore
    }

    let attempts = 0;
    const maxAttempts = 10;

    const tryInit = () => {
      attempts += 1;
      // eslint-disable-next-line no-console
      console.log(`Mapbox init attempt ${attempts}, container present: ${!!mapContainer.current}`);
      if (!mapContainer.current) {
        if (attempts >= maxAttempts) {
          setInitError('Map container element not attached to DOM.');
          return;
        }
        setTimeout(tryInit, 100);
        return;
      }

      try {
        mapRef.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v11',
          center: [125.5603, -8.5569],
          zoom: 6,
        });

        mapRef.current.addControl(new mapboxgl.NavigationControl());

        mapRef.current.on('load', () => {
          try {
            mapRef.current?.resize();
          } catch (e) {
            // ignore
          }
          setTimeout(() => mapRef.current?.resize(), 250);
        });

        mapRef.current.on('click', (e: any) => {
          const { lng, lat } = e.lngLat as { lng: number; lat: number };
          if (markerRef.current) markerRef.current.remove();
          markerRef.current = new mapboxgl.Marker({ color: '#ff7a00' })
            .setLngLat([lng, lat])
            .addTo(mapRef.current as mapboxgl.Map);

          setLoading(true);
          void (async () => {
            try {
              const token = mapboxgl.accessToken;
              const res = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&types=address,place,locality,neighborhood&limit=1`
              );
              const data = await res.json();
              const feat = data?.features?.[0];
              const placeName = feat?.place_name || '';

              const context: Record<string, string> = {};
              if (feat?.context) {
                feat.context.forEach((c: any) => {
                  const id: string = c.id || '';
                  const key = id.split('.')[0];
                  context[key] = c.text;
                });
              }

              const loc: Location = {
                lat,
                lng,
                placeName,
                street: feat?.text || '',
                village: context.place || context.locality || '',
                suco: context.neighborhood || '',
                postoAdmin: context.region || '',
                municipality: context.country || '',
              };

              setPicked(loc);
            } catch (err) {
              // eslint-disable-next-line no-console
              console.error('Geocode failed', err);
            } finally {
              setLoading(false);
            }
          })();
        });

        // created
        // eslint-disable-next-line no-console
        console.log('Mapbox map created');
      } catch (err: any) {
        const msg = err?.message || String(err);
        setInitError(`Map initialization failed: ${msg}`);
        // eslint-disable-next-line no-console
        console.error('Map init error', err);
        // Try Leaflet fallback
        try {
          // dynamic import Leaflet and initialize a fallback map
          (async function initLeafletFallback() {
            try {
              const L = await (new Function("return import('leaflet')"))();
              // inject CDN CSS if leaflet CSS not present
              if (!document.querySelector('link[href*="leaflet.css"]')) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                document.head.appendChild(link);
              }
              if (!mapContainer.current) return;
              leafletMapRef.current = L.map(mapContainer.current as any).setView([-8.5569, 125.5603], 6);
              L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap contributors',
              }).addTo(leafletMapRef.current);

              leafletMapRef.current.on('click', (e: any) => {
                const { lat, lng } = e.latlng;
                if (leafletMarkerRef.current) leafletMapRef.current.removeLayer(leafletMarkerRef.current);
                leafletMarkerRef.current = L.marker([lat, lng]).addTo(leafletMapRef.current);
                const loc: Location = { lat, lng, placeName: `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
                setPicked(loc);
              });
              // mark as initialized
              setInitError(null);
              // eslint-disable-next-line no-console
              console.log('Leaflet fallback initialized');
            } catch (leafErr) {
              // eslint-disable-next-line no-console
              console.error('Leaflet fallback failed', leafErr);
            }
          })();
        } catch (e) {
          // ignore
        }
      }
    };

    tryInit();

    return () => mapRef.current?.remove();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="z-50 w-[95%] max-w-4xl rounded-lg bg-white p-4 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Pick location on map</h3>
          <div className="flex items-center gap-2">
            <button
              className="rounded px-3 py-1 text-sm border"
              onClick={() => {
                if (picked) onSelect(picked);
              }}
              disabled={!picked}
            >
              Use location
            </button>
            <button className="rounded px-3 py-1 text-sm border" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
        <div className="h-[60vh] w-full" ref={mapContainer} />
        <div className="mt-2 text-sm text-slate-600">
          {loading
            ? 'Reverse geocoding...'
            : picked
            ? `Selected: ${picked.placeName || `${picked.lat.toFixed(5)}, ${picked.lng.toFixed(5)}`}`
            : 'Click on the map to pick a location.'}
        </div>
        <div className="mt-2 text-xs text-red-600">
          <div>Debug: token present: {mapboxgl.accessToken ? 'yes' : 'no'}</div>
          <div>Debug: map initialized: {mapRef.current ? 'yes' : 'no'}</div>
          {initError && <div className="mt-1 text-xs text-red-700">Error: {initError}</div>}
        </div>
      </div>
    </div>
  );
}
