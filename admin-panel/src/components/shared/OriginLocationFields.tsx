'use client';

import { useCallback, useRef } from 'react';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const LIBRARIES: 'places'[] = ['places'];
// Loose bounding box around Timor-Leste (mainland + Oecusse + Atauro).
const TIMOR_LESTE_BOUNDS = { north: -8.0, south: -9.6, west: 123.9, east: 127.5 };

export interface OriginLocationValue {
  municipality: string;
  postoAdmin: string;
  suco: string;
  aldeia: string;
}

interface OriginLocationFieldsProps {
  idPrefix: string;
  value: OriginLocationValue;
  onChange: (next: OriginLocationValue) => void;
  municipalityError?: string;
  municipalityRequired?: boolean;
}

function getComponent(
  components: google.maps.GeocoderAddressComponent[] | undefined,
  types: string[],
): string | undefined {
  if (!components) return undefined;
  for (const type of types) {
    const match = components.find((c) => c.types.includes(type));
    if (match) return match.long_name;
  }
  return undefined;
}

// Seller/Product Origin location — deliberately NOT backed by Shipping's
// Municipality/Posto/Suco/Aldeia tables (that dataset is Shipping-only, see
// LocationsModule). Every field here is plain free text the seller/admin
// can type directly, so a location that doesn't already exist anywhere is
// simply typed and saved — there's no fixed list to be "missing" from.
// The search box is a pure convenience layered on top via Google Places
// (a wholly separate, external dataset with zero coupling to Shipping):
// picking a suggestion best-effort-fills the four fields from Google's
// address components, but Timor-Leste's aldeia/suco-level coverage in
// Google's data is sparse and the component-type mapping is approximate,
// so every field stays directly editable before and after a selection.
export function OriginLocationFields({
  idPrefix,
  value,
  onChange,
  municipalityError,
  municipalityRequired,
}: OriginLocationFieldsProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: apiKey, libraries: LIBRARIES });
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const set = (field: keyof OriginLocationValue) => (v: string) => onChange({ ...value, [field]: v });

  const handlePlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace();
    const components = place?.address_components;
    if (!components) return;
    onChange({
      municipality: getComponent(components, ['administrative_area_level_1']) ?? value.municipality,
      postoAdmin: getComponent(components, ['administrative_area_level_2', 'locality']) ?? value.postoAdmin,
      suco: getComponent(components, ['sublocality_level_1', 'sublocality']) ?? value.suco,
      aldeia: getComponent(components, ['sublocality_level_2', 'neighborhood']) ?? value.aldeia,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onChange]);

  const searchInputClassName =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        {apiKey && isLoaded ? (
          <Autocomplete
            onLoad={(ac) => {
              autocompleteRef.current = ac;
            }}
            onPlaceChanged={handlePlaceChanged}
            options={{
              componentRestrictions: { country: 'tl' },
              bounds: TIMOR_LESTE_BOUNDS,
              fields: ['address_components'],
            }}
          >
            <input
              type="text"
              placeholder="Search a location to help fill the fields below (e.g. Comoro)..."
              className={searchInputClassName}
              onKeyDown={(e) => {
                // Autocomplete hijacks Enter to select the highlighted
                // suggestion — without this, Enter here submits the form.
                if (e.key === 'Enter') e.preventDefault();
              }}
            />
          </Autocomplete>
        ) : (
          <input
            type="text"
            disabled
            placeholder="Location search unavailable — fill the fields below directly"
            className={`${searchInputClassName} cursor-not-allowed opacity-60`}
          />
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={`${idPrefix}-municipality`} className="text-xs">
            Municipality{municipalityRequired ? ' *' : ''}
          </Label>
          <Input
            id={`${idPrefix}-municipality`}
            value={value.municipality}
            onChange={(e) => set('municipality')(e.target.value)}
            placeholder="e.g. Ermera"
          />
          {municipalityError && <p className="mt-1 text-xs text-red-500">{municipalityError}</p>}
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-posto`} className="text-xs">
            Administrative Post
          </Label>
          <Input
            id={`${idPrefix}-posto`}
            value={value.postoAdmin}
            onChange={(e) => set('postoAdmin')(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-suco`} className="text-xs">
            Suco
          </Label>
          <Input id={`${idPrefix}-suco`} value={value.suco} onChange={(e) => set('suco')(e.target.value)} />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-aldeia`} className="text-xs">
            Aldeia
          </Label>
          <Input id={`${idPrefix}-aldeia`} value={value.aldeia} onChange={(e) => set('aldeia')(e.target.value)} />
        </div>
      </div>
    </div>
  );
}
