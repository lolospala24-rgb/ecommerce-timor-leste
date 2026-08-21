"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, MapPin, ChevronDown } from 'lucide-react';
import { useCreateAddress, useUpdateAddress, useShippingZones } from '@/hooks/useAddresses';
import {
  GOOGLE_MAPS_API_KEY,
  GOOGLE_MAPS_LIBRARIES,
  TIMOR_LESTE_BOUNDS,
  extractLocationParts,
} from '@/lib/googleMapsAddress';

const addressSchema = z.object({
  label: z.string().trim().optional(),
  municipalityId: z.preprocess((value) => {
    if (typeof value === 'string' && value.trim().length > 0) {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : undefined;
    }
    return value;
  }, z.number().optional()),
  municipality: z.string().trim().min(1, 'Please select a municipality'),
  postoAdmin: z.string().trim().min(2, 'Please enter a valid Posto Administrativo'),
  suco: z.string().trim().min(2, 'Please enter a valid Suco'),
  reference: z.string().trim().optional(),
  recipientName: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isPrimary: z.boolean().default(false),
});

type AddressFormData = z.infer<typeof addressSchema>;

interface AddressFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: any;
}

export function AddressForm({ onSuccess, onCancel, initialData }: AddressFormProps) {
  const { mutateAsync: createAddress, isPending: isCreating } = useCreateAddress();
  const { mutateAsync: updateAddress, isPending: isUpdating } = useUpdateAddress();
  const { municipalities } = useShippingZones();
  const isLoading = isCreating || isUpdating;
  const [error, setError] = useState('');

  const { control, register, handleSubmit, setValue, watch, formState: { errors } } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: initialData?.label ?? '',
      municipality: '',
      municipalityId: initialData?.municipalityId ? Number(initialData.municipalityId) : undefined,
      postoAdmin: initialData?.postoAdmin ?? '',
      suco: initialData?.suco ?? '',
      reference: initialData?.reference ?? initialData?.placeName ?? '',
      recipientName: initialData?.recipientName ?? '',
      phone: initialData?.phone ?? '',
      latitude: initialData?.latitude != null ? Number(initialData.latitude) : undefined,
      longitude: initialData?.longitude != null ? Number(initialData.longitude) : undefined,
      isPrimary: initialData?.isPrimary ?? false,
    },
  });

  const typedMunicipalities = useMemo(() => {
    return (municipalities as Array<{
      value: string;
      label: string;
      id?: number;
      name: string;
      provinceId: number | null;
      provinceName: string | null;
    }> ) ?? [];
  }, [municipalities]);

  const selectedMunicipalityValue = watch('municipality') as string | undefined;
  const selectedMunicipality = useMemo(
    () => typedMunicipalities.find((m) => m.value === selectedMunicipalityValue),
    [typedMunicipalities, selectedMunicipalityValue],
  );

  const currentMunicipalityId = watch('municipalityId');

  useEffect(() => {
    if (!initialData || !typedMunicipalities?.length || selectedMunicipalityValue) {
      return;
    }

    const initialValue = typedMunicipalities.find((m) => {
      if (initialData.municipalityId && m.id != null) {
        return m.id === Number(initialData.municipalityId);
      }

      return (
        m.name === initialData.municipality &&
        (initialData.province ? m.provinceName === initialData.province : true)
      );
    })?.value;

    if (initialValue && initialValue !== selectedMunicipalityValue) {
      setValue('municipality', initialValue);
    }
  }, [initialData, typedMunicipalities, selectedMunicipalityValue, setValue]);

  useEffect(() => {
    if (!selectedMunicipality) {
      return;
    }

    const nextMunicipalityId = selectedMunicipality.id ?? undefined;
    if (nextMunicipalityId !== currentMunicipalityId) {
      setValue('municipalityId', nextMunicipalityId);
    }
  }, [selectedMunicipality, currentMunicipalityId, setValue]);

  // Address search — the whole point of this box is to let most customers
  // skip typing Posto Administrativo/Suco by hand, which are official
  // Portuguese administrative terms many people don't know precisely. A
  // search hit fills every field below; the customer can still edit
  // anything (Google's Timor-Leste coverage isn't complete).
  const { isLoaded: isSearchLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const handlePlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace();
    const location = place?.geometry?.location;
    if (!location) return;

    const parts = extractLocationParts(place?.address_components, place?.formatted_address || place?.name || '');

    if (parts.suco) setValue('suco', parts.suco);
    if (parts.postoAdmin) setValue('postoAdmin', parts.postoAdmin);
    setValue('latitude', location.lat());
    setValue('longitude', location.lng());
    if (!watch('reference') && parts.placeName) setValue('reference', parts.placeName);

    // Municipality is a dropdown tied to the real Municipality table, not
    // free text — only auto-select it when the search result's name
    // actually matches one of the 13 official options; otherwise leave it
    // for the customer to pick (silently guessing wrong here would be
    // worse than leaving it blank).
    if (parts.municipality) {
      const match = typedMunicipalities.find(
        (m) => m.name.trim().toLowerCase() === parts.municipality!.trim().toLowerCase(),
      );
      if (match) setValue('municipality', match.value);
    }
  }, [setValue, typedMunicipalities, watch]);

  // The 3 administrative-geography fields (Municipality/Posto Administrativo/
  // Suco) are the actual source of past confusion — official terms, all
  // required, shown together as a wall of inputs. They're collapsed by
  // default: search fills them silently, and most customers never need to
  // look at them directly. Auto-expanded if there's nothing to summarize
  // yet (fresh form, no search done) or if validation actually
  // fails on one of the required ones — a hidden error would be worse than
  // the fields being visible.
  const [showDetails, setShowDetails] = useState(false);
  const watchedPostoAdmin = watch('postoAdmin');
  const watchedSuco = watch('suco');
  const hasAddressSummary = !!(watchedPostoAdmin && watchedSuco && selectedMunicipality);

  useEffect(() => {
    if (errors.municipality || errors.postoAdmin || errors.suco) {
      setShowDetails(true);
    }
  }, [errors.municipality, errors.postoAdmin, errors.suco]);

  const addressSummary = [watchedPostoAdmin, watchedSuco, selectedMunicipality?.name]
    .filter(Boolean)
    .join(', ');

  const onSubmit = async (data: AddressFormData) => {
    setError('');
    const municipality = selectedMunicipality?.name?.trim() ?? data.municipality?.trim();
    const province = selectedMunicipality?.provinceName?.trim() ?? undefined;
    const payload: any = {
      ...data,
      municipality,
      province,
      phone: data.phone?.trim() || undefined,
      label: data.label?.trim() || undefined,
      reference: data.reference?.trim() || undefined,
      recipientName: data.recipientName?.trim() || undefined,
    };

    if (selectedMunicipality?.id != null) {
      payload.municipalityId = selectedMunicipality.id;
    }
    if (selectedMunicipality?.provinceId != null) {
      payload.provinceId = selectedMunicipality.provinceId;
    }

    const normalizedPayload = Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== '' && value !== null && value !== undefined),
    );

    try {
      if (initialData?.id) {
        await updateAddress({ id: initialData.id, data: normalizedPayload });
      } else {
        await createAddress(normalizedPayload);
      }
      onSuccess?.();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save address');
    }
  };

  return (
    <div className="space-y-5">
      {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Search — the fast path. Most customers should never need to type
            Posto Administrativo/Suco by hand once they pick a result here. */}
        <div className="space-y-2">
          <Label htmlFor="address-search">Find your address</Label>
          {isSearchLoaded ? (
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
                  strictBounds: true,
                  fields: ['geometry', 'formatted_address', 'name', 'address_components'],
                }}
              >
                <input
                  id="address-search"
                  type="text"
                  placeholder="Start typing an address in Timor-Leste..."
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </Autocomplete>
            </div>
          ) : (
            <Input disabled placeholder="Loading address search..." />
          )}
          <p className="text-xs text-muted-foreground">
            Search and pick a result to fill in the fields below automatically — you can still edit anything after.
          </p>
        </div>

        {/* Collapsed by default — search already filled these in. Shown as
            a plain-language summary instead of raw field names, with an
            explicit way in for the two cases that need it: search missed
            something, or the customer wants to double-check/change it. */}
        {hasAddressSummary ? (
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="flex w-full items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-left"
          >
            <span className="flex min-w-0 items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-foreground">{addressSummary}</span>
                <span className="block text-xs text-muted-foreground">Address confirmed</span>
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary">
              {showDetails ? 'Hide' : 'Edit'}
              <ChevronDown className={`h-4 w-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="text-sm font-medium text-primary hover:underline"
          >
            Can&apos;t find your address above? Enter it manually
          </button>
        )}

        {showDetails && (
          <div className="space-y-4 rounded-lg border border-input p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="municipality">Municipality *</Label>
                <Controller
                  control={control}
                  name="municipality"
                  defaultValue={initialData?.municipality ?? (initialData?.municipalityId ? String(initialData.municipalityId) : '')}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ''}
                      onValueChange={(value) => field.onChange(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select municipality" />
                      </SelectTrigger>
                      <SelectContent>
                        {(typedMunicipalities || []).map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.municipality && <p className="text-sm text-destructive">{errors.municipality.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="postoAdmin">Posto Administrativo *</Label>
                <Input id="postoAdmin" placeholder="e.g., Cristo Rei" {...register('postoAdmin')} />
                <p className="text-xs text-muted-foreground">The sub-district your address is in</p>
                {errors.postoAdmin && <p className="text-sm text-destructive">{errors.postoAdmin.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="suco">Suco *</Label>
              <Input id="suco" placeholder="e.g., Bidau Lecidere" {...register('suco')} />
              <p className="text-xs text-muted-foreground">The suco (village cluster) your address is in</p>
              {errors.suco && <p className="text-sm text-destructive">{errors.suco.message}</p>}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="reference">Reference Point</Label>
          <Input id="reference" placeholder="Near church, behind market, etc." {...register('reference')} />
          <p className="text-xs text-muted-foreground">Helps the courier find you — a nearby landmark is enough</p>
        </div>

        {/* Label, contact, primary */}
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recipient &amp; contact</p>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="recipientName">Recipient Name</Label>
              <Input id="recipientName" placeholder="Who should the courier ask for?" {...register('recipientName')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" placeholder="+670 1234 5678" {...register('phone')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="label">Save this address as</Label>
            <Input id="label" placeholder="Home, Office, etc." {...register('label')} />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-input px-3 py-2.5">
            <Label htmlFor="isPrimary" className="cursor-pointer">Use as my default address</Label>
            <Switch id="isPrimary" checked={!!watch('isPrimary')} onCheckedChange={(c) => setValue('isPrimary', c)} />
          </div>
        </div>

        <div className="flex gap-3">
          {onCancel && (
            <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" className="flex-1" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : initialData ? 'Update Address' : 'Add Address'}
          </Button>
        </div>
      </form>
    </div>
  );
}
