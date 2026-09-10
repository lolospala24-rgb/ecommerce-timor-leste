'use client';

import { useCallback, useRef } from 'react';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import { Search } from 'lucide-react';
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_LIBRARIES, TIMOR_LESTE_BOUNDS } from '@/lib/googleMapsAddress';

interface StoreAddressInputProps {
  id?: string;
  value: string;
  onChange: (address: string) => void;
  onCoordinates?: (lat: number, lng: number) => void;
  placeholder?: string;
}

// A seller's store address is independent of the Shipping Municipality
// system — this is plain descriptive text, optionally geocoded for lat/lng
// via Google Places, never matched against (or stored as a reference to)
// the Municipality table checkout's delivery Address form uses. Falls back
// to a plain text input if the Maps script isn't configured/loaded.
export function StoreAddressInput({ id, value, onChange, onCoordinates, placeholder }: StoreAddressInputProps) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const handlePlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace();
    if (!place) return;
    const address = place.formatted_address || place.name;
    if (address) onChange(address);
    const location = place.geometry?.location;
    if (location) onCoordinates?.(location.lat(), location.lng());
  }, [onChange, onCoordinates]);

  const inputClassName =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

  if (!GOOGLE_MAPS_API_KEY || !isLoaded) {
    return (
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'Enter store address...'}
          className={inputClassName}
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Autocomplete
        onLoad={(ac) => {
          autocompleteRef.current = ac;
        }}
        onPlaceChanged={handlePlaceChanged}
        options={{
          componentRestrictions: { country: 'tl' },
          bounds: TIMOR_LESTE_BOUNDS,
          fields: ['geometry', 'formatted_address', 'name'],
        }}
      >
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'Search or enter store address...'}
          className={inputClassName}
        />
      </Autocomplete>
    </div>
  );
}
