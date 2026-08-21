"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { GoogleMap, Marker, Autocomplete, useJsApiLoader } from "@react-google-maps/api";
import { LocateFixed, Loader2 } from "lucide-react";

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

// Module-level constant, not an inline array literal in the hook call —
// useJsApiLoader compares `libraries` by reference on every render, so a
// new array each render re-triggers the (expensive) script load in a loop.
const GOOGLE_MAPS_LIBRARIES: ('places')[] = ['places'];

const mapContainerStyle = { width: '100%', height: '100%' };
const defaultCenter = { lat: -8.5569, lng: 125.5603 };

// Loose bounding box around Timor-Leste (mainland + the Oecusse exclave +
// Atauro island) — keeps both the map view and the address search
// restricted to the country this store can actually deliver to.
const TIMOR_LESTE_BOUNDS = { north: -8.0, south: -9.6, west: 123.9, east: 127.5 };

// Shared by map clicks, "My Location", and search-box selection — all
// three ultimately just need to turn a set of Google address_components
// into the form fields. Google's administrative levels don't line up
// perfectly with Timor-Leste's real Municipality > Posto Administrativo >
// Suco > Village structure, so postoAdmin/suco in particular may come back
// blank for the customer to fill in manually.
function extractLocationParts(
  addressComponents: google.maps.GeocoderAddressComponent[] | undefined,
  placeName: string,
): Omit<Location, 'lat' | 'lng'> {
  const components = addressComponents || [];
  const find = (type: string) => components.find((c) => c.types.includes(type))?.long_name || '';

  const streetNumber = find('street_number');
  const route = find('route');
  const street = [streetNumber, route].filter(Boolean).join(' ');

  return {
    placeName,
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
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [picked, setPicked] = useState<Location | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const geocoder = useMemo(
    () => (isLoaded ? new google.maps.Geocoder() : null),
    [isLoaded],
  );

  // Reverse-geocodes a raw lat/lng into address fields — used by both map
  // clicks and "My Location" (which only ever gives raw GPS coordinates,
  // never a pre-resolved address the way search-box selection does).
  const selectCoordinates = useCallback(
    (lat: number, lng: number) => {
      if (!geocoder) {
        setPicked({ lat, lng });
        return;
      }
      setLoading(true);
      setStatusError(null);
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        setLoading(false);
        if (status !== 'OK' || !results?.[0]) {
          // The pin is still usable even if reverse geocoding fails — the
          // customer just has to fill in the address fields manually.
          setPicked({ lat, lng });
          setStatusError('Could not determine the address for this location — please fill in the details manually.');
          return;
        }
        setPicked({
          lat,
          lng,
          ...extractLocationParts(results[0].address_components, results[0].formatted_address || ''),
        });
      });
    },
    [geocoder],
  );

  const handleMapClick = useCallback(
    (event: google.maps.MapMouseEvent) => {
      const lat = event.latLng?.lat();
      const lng = event.latLng?.lng();
      if (lat == null || lng == null) return;
      selectCoordinates(lat, lng);
    },
    [selectCoordinates],
  );

  const handlePlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace();
    const location = place?.geometry?.location;
    if (!location) return;

    setStatusError(null);
    setPicked({
      lat: location.lat(),
      lng: location.lng(),
      ...extractLocationParts(place?.address_components, place?.formatted_address || place?.name || ''),
    });
  }, []);

  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatusError('Your browser does not support location detection.');
      return;
    }
    setLocating(true);
    setStatusError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        selectCoordinates(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        setLocating(false);
        setStatusError(
          error.code === error.PERMISSION_DENIED
            ? 'Location permission denied — please allow location access, or search/click on the map instead.'
            : 'Could not detect your location — please search or click on the map instead.',
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [selectCoordinates]);

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

        {isLoaded && (
          <div className="mb-2 flex items-center gap-2">
            <Autocomplete
              onLoad={(ac) => {
                autocompleteRef.current = ac;
              }}
              onPlaceChanged={handlePlaceChanged}
              options={{
                componentRestrictions: { country: 'tl' },
                bounds: TIMOR_LESTE_BOUNDS,
                strictBounds: true,
                fields: ['geometry', 'formatted_address', 'name', 'address_components'],
              }}
              className="flex-1"
            >
              <input
                type="text"
                placeholder="Search for an address in Timor-Leste..."
                className="w-full rounded border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </Autocomplete>
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={locating}
              className="flex shrink-0 items-center gap-1.5 rounded border px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
              title="Use my current location"
            >
              {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
              My Location
            </button>
          </div>
        )}

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
              zoom={picked ? 15 : 7}
              onClick={handleMapClick}
              options={{
                streetViewControl: false,
                fullscreenControl: false,
                minZoom: 6,
                restriction: {
                  latLngBounds: TIMOR_LESTE_BOUNDS,
                  strictBounds: false,
                },
              }}
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
            : 'Search an address, use your location, or click on the map to pick a point.'}
        </div>
        {statusError && <div className="mt-2 text-xs text-amber-700">{statusError}</div>}
      </div>
    </div>
  );
}
