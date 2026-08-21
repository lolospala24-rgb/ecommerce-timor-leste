// Shared between GoogleMapPicker (checkout's pin-drop map) and
// AddressAutocompleteInput (the address search box embedded directly in
// the Add/Edit Address form) — both ultimately turn a Google Places/
// Geocoder result into the same address-form fields, so the mapping lives
// in one place rather than being copied twice.

export type GoogleAddressParts = {
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
export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
export const MISSING_KEY_ERROR = 'Address search is not configured (missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY).';

// Module-level constant, not an inline array literal at each call site —
// useJsApiLoader compares `libraries` by reference on every render, so a
// new array each render re-triggers the (expensive) script load in a loop.
export const GOOGLE_MAPS_LIBRARIES: ('places')[] = ['places'];

// Loose bounding box around Timor-Leste (mainland + the Oecusse exclave +
// Atauro island) — keeps both the map view and the address search
// restricted to the country this store can actually deliver to.
export const TIMOR_LESTE_BOUNDS = { north: -8.0, south: -9.6, west: 123.9, east: 127.5 };

// Best-effort mapping from Google's address_components onto the address
// form's fields. Google's administrative levels don't line up perfectly
// with Timor-Leste's real Municipality > Posto Administrativo > Suco >
// Village structure, so postoAdmin/suco in particular may come back blank
// for the customer to fill in manually.
export function extractLocationParts(
  addressComponents: google.maps.GeocoderAddressComponent[] | undefined,
  placeName: string,
): GoogleAddressParts {
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
