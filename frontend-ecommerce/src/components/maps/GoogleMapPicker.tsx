"use client";

import React, { useCallback, useMemo, useState } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";

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

// No hardcoded fallback key — a leaked/committed key can't be rotated
// without a code change. Missing config must fail visibly, not silently
// fall back to a baked-in key. (This key is meant to be public — it ships
// in the browser bundle either way — but should still be restricted to
// this site's domain via HTTP referrer restrictions in Google Cloud
// Console, not committed as a fallback here.)
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
const MISSING_KEY_ERROR = 'Map is not configured (missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY).';

const mapContainerStyle = { width: '100%', height: '100%' };
const defaultCenter = { lat: -8.5569, lng: 125.5603 };

// Best-effort mapping from Google's address_components onto the address
// form's fields. Google's administrative levels don't line up perfectly
// with Timor-Leste's real Municipality > Posto Administrativo > Suco
// > Village structure, so postoAdmin/suco in particular may come back
// blank for the customer to fill in manually — same caveat as before.
function extractLocationParts(result: google.maps.GeocoderResult): Omit<Location, 'lat' | 'lng'> {
  const components = result.address_components || [];
  const find = (type: string) => components.find((c) => c.types.includes(type))?.long_name || '';

  const streetNumber = find('street_number');
  const route = find('route');
  const street = [streetNumber, route].filter(Boolean).join(' ');

  return {
    placeName: result.formatted_address || '',
    street,
    village: find('locality') || find('sublocality_level_1') || '',
    suco: find('sublocality_level_2') || find('neighborhood') || '',
    postoAdmin: find('administrative_area_level_2') || '',
    municipality: find('administrative_area_level_1') || '',
  };
}

export default function GoogleMapPicker({
  onSelect,
  onClose,
}: {
  onSelect: (loc: Location) => void;
  onClose: () => void;
}) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<Location | null>(null);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  const geocoder = useMemo(
    () => (isLoaded ? new google.maps.Geocoder() : null),
    [isLoaded],
  );

  const handleMapClick = useCallback(
    (event: google.maps.MapMouseEvent) => {
      const lat = event.latLng?.lat();
      const lng = event.latLng?.lng();
      if (lat == null || lng == null || !geocoder) return;

      setLoading(true);
      setGeocodeError(null);
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        setLoading(false);
        if (status !== 'OK' || !results?.[0]) {
          // The pin is still usable even if reverse geocoding fails — the
          // customer just has to fill in the address fields manually.
          setPicked({ lat, lng });
          setGeocodeError('Could not determine the address for this location — please fill in the details manually.');
          return;
        }
        setPicked({ lat, lng, ...extractLocationParts(results[0]) });
      });
    },
    [geocoder],
  );

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
        <div className="h-[60vh] w-full">
          {!GOOGLE_MAPS_API_KEY ? (
            <div className="flex h-full w-full items-center justify-center bg-slate-100 p-6 text-center text-sm text-red-700">
              {MISSING_KEY_ERROR}
            </div>
          ) : loadError ? (
            <div className="flex h-full w-full items-center justify-center bg-slate-100 p-6 text-center text-sm text-red-700">
              Failed to load Google Maps. Check the API key and network connection.
            </div>
          ) : !isLoaded ? (
            <div className="flex h-full w-full items-center justify-center bg-slate-100 p-6 text-center text-sm text-slate-600">
              Loading map...
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={picked ? { lat: picked.lat, lng: picked.lng } : defaultCenter}
              zoom={7}
              onClick={handleMapClick}
              options={{ streetViewControl: false, fullscreenControl: false }}
            >
              {picked && <Marker position={{ lat: picked.lat, lng: picked.lng }} />}
            </GoogleMap>
          )}
        </div>
        <div className="mt-2 text-sm text-slate-600">
          {loading
            ? 'Reverse geocoding...'
            : picked
            ? `Selected: ${picked.placeName || `${picked.lat.toFixed(5)}, ${picked.lng.toFixed(5)}`}`
            : 'Click on the map to pick a location.'}
        </div>
        {geocodeError && <div className="mt-2 text-xs text-amber-700">{geocodeError}</div>}
      </div>
    </div>
  );
}
