'use client';

import { useCallback, useRef } from 'react';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import { Search } from 'lucide-react';

const LIBRARIES: 'places'[] = ['places'];
// Loose bounding box around Timor-Leste (mainland + Oecusse + Atauro).
const TIMOR_LESTE_BOUNDS = { north: -8.0, south: -9.6, west: 123.9, east: 127.5 };

interface StoreAddressInputProps {
  id?: string;
  value: string;
  onChange: (address: string) => void;
  onCoordinates?: (lat: number, lng: number) => void;
  placeholder?: string;
}

// A store's own address is independent of the Shipping Municipality system
// — this is plain descriptive text, optionally geocoded for lat/lng via
// Google Places, never tied to (or matched against) the Municipality table
// Shipping/delivery uses. See Seller.storeAddress's doc-comment in
// schema.prisma. Falls back to a plain text input if the Maps script
// isn't configured/loaded, so typing an address always works either way.
export function StoreAddressInput({ id, value, onChange, onCoordinates, placeholder }: StoreAddressInputProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: apiKey, libraries: LIBRARIES });
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

  if (!apiKey || !isLoaded) {
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
