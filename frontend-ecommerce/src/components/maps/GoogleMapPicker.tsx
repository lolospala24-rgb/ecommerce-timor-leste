"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { GoogleMap, Marker, Autocomplete, useJsApiLoader } from "@react-google-maps/api";
import { LocateFixed, Loader2 } from "lucide-react";
import {
  GOOGLE_MAPS_API_KEY,
  GOOGLE_MAPS_LIBRARIES,
  TIMOR_LESTE_BOUNDS,
  extractLocationParts,
} from "@/lib/googleMapsAddress";

const MISSING_KEY_ERROR = 'Map is not configured (missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY).';

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

const mapContainerStyle = { width: '100%', height: '100%' };
const defaultCenter = { lat: -8.5569, lng: 125.5603 };

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
