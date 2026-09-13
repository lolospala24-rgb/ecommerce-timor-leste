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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2,
  Search,
  MapPin,
  Landmark,
  Home,
  Briefcase,
  Tag,
  User,
  Phone,
  Plus,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCreateAddress, useUpdateAddress, useShippingZones, usePostos, useSucos } from '@/hooks/useAddresses';
import {
  GOOGLE_MAPS_API_KEY,
  GOOGLE_MAPS_LIBRARIES,
  TIMOR_LESTE_BOUNDS,
  extractLocationParts,
} from '@/lib/googleMapsAddress';

const SAVE_AS_OPTIONS = [
  { value: 'Home', label: 'Home', icon: Home },
  { value: 'Office', label: 'Office', icon: Briefcase },
  { value: 'Other', label: 'Other', icon: Tag },
] as const;

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
  postoAdmin: z.string().trim().min(1, 'Please select a Posto Administrativo'),
  suco: z.string().trim().min(1, 'Please select or enter a Suco'),
  village: z.string().trim().optional(),
  street: z.string().trim().optional(),
  reference: z.string().trim().optional(),
  recipientName: z.string().trim().min(2, 'Please enter the recipient name'),
  phone: z.string().trim().min(7, 'Please enter a valid phone number'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isPrimary: z.boolean().default(false),
});

type AddressFormData = z.infer<typeof addressSchema>;

// Shared, case/whitespace-insensitive municipality name comparator — used
// both to prefill from an existing address and to auto-match a Places
// search result, so the two code paths can't silently disagree on what
// counts as a match.
function namesMatch(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

interface AddressFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: any;
}

export function AddressForm({ onSuccess, onCancel, initialData }: AddressFormProps) {
  const isEditing = !!initialData?.id;
  const { mutateAsync: createAddress, isPending: isCreating } = useCreateAddress();
  const { mutateAsync: updateAddress, isPending: isUpdating } = useUpdateAddress();
  const { municipalities, municipalitiesLoading } = useShippingZones();
  const isLoading = isCreating || isUpdating;
  const [error, setError] = useState('');

  const { control, register, handleSubmit, setValue, watch, formState: { errors } } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: initialData?.label ?? 'Home',
      municipality: '',
      municipalityId: initialData?.municipalityId ? Number(initialData.municipalityId) : undefined,
      postoAdmin: initialData?.postoAdmin ?? '',
      suco: initialData?.suco ?? '',
      village: initialData?.village ?? '',
      street: initialData?.street ?? '',
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
    }>) ?? [];
  }, [municipalities]);

  const selectedMunicipalityValue = watch('municipality') as string | undefined;
  const selectedMunicipality = useMemo(
    () => typedMunicipalities.find((m) => m.value === selectedMunicipalityValue),
    [typedMunicipalities, selectedMunicipalityValue],
  );
  const currentMunicipalityId = watch('municipalityId');
  const watchedPostoAdmin = watch('postoAdmin');
  const watchedSuco = watch('suco');
  const watchedLabel = watch('label');

  useEffect(() => {
    if (!initialData || !typedMunicipalities?.length || selectedMunicipalityValue) {
      return;
    }

    const initialValue = typedMunicipalities.find((m) => {
      if (initialData.municipalityId && m.id != null) {
        return m.id === Number(initialData.municipalityId);
      }
      return (
        namesMatch(m.name, initialData.municipality) &&
        (initialData.province ? m.provinceName === initialData.province : true)
      );
    })?.value;

    if (initialValue && initialValue !== selectedMunicipalityValue) {
      setValue('municipality', initialValue);
    }
  }, [initialData, typedMunicipalities, selectedMunicipalityValue, setValue]);

  useEffect(() => {
    if (!selectedMunicipality) return;
    const nextMunicipalityId = selectedMunicipality.id ?? undefined;
    if (nextMunicipalityId !== currentMunicipalityId) {
      setValue('municipalityId', nextMunicipalityId);
    }
  }, [selectedMunicipality, currentMunicipalityId, setValue]);

  // Posto Administrativo — always a real dependent dropdown: POSTOS_DATA has
  // full coverage for all 13 municipalities, so there's no case where this
  // needs a manual-entry fallback the way Suco does below.
  const {
    postos,
    isLoading: postosLoading,
    isError: postosError,
  } = usePostos(selectedMunicipality?.name ?? '');
  const postoOptions = useMemo(
    () => (Array.isArray(postos) ? (postos as Array<{ name: string }>) : []),
    [postos],
  );

  // Posto/Suco are cleared only from the Selects' own onValueChange below —
  // never from a value-watching effect. A watcher can't tell "the customer
  // just changed municipality" apart from "the initial-data prefill effect
  // above just resolved the municipality asynchronously", and would wipe
  // out a freshly-prefilled Posto/Suco on the edit form the moment the
  // municipality match effect ran. onValueChange only ever fires for a real
  // user interaction, so it can't be confused by that prefill.

  // Suco — a real dependent dropdown only where the official list actually
  // has data (today: a handful of postos in Dili/Baucau/Bobonaro). Most of
  // the country has no curated Suco list yet, so this degrades to a plain
  // text field rather than blocking address entry outside those areas.
  const {
    sucos,
    isLoading: sucosLoading,
  } = useSucos(selectedMunicipality?.name ?? '', watchedPostoAdmin ?? '');
  const sucoOptions = useMemo(
    () => (Array.isArray(sucos) ? (sucos as Array<{ name: string }>) : []),
    [sucos],
  );
  const sucoHasCuratedList = !sucosLoading && sucoOptions.length > 0;
  const sucoValueInList = sucoOptions.some((s) => namesMatch(s.name, watchedSuco));
  const useSucoDropdown = sucoHasCuratedList && (!watchedSuco || sucoValueInList);

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

    if (parts.postoAdmin) setValue('postoAdmin', parts.postoAdmin);
    if (parts.suco) setValue('suco', parts.suco);
    if (parts.village) setValue('village', parts.village);
    if (parts.street) setValue('street', parts.street);
    setValue('latitude', location.lat());
    setValue('longitude', location.lng());
    if (!watch('reference') && parts.placeName) setValue('reference', parts.placeName);

    // Municipality is a dropdown tied to the real Municipality table, not
    // free text — only auto-select it when the search result's name
    // actually matches one of the 13 official options; otherwise leave it
    // for the customer to pick (silently guessing wrong here would be
    // worse than leaving it blank).
    if (parts.municipality) {
      const match = typedMunicipalities.find((m) => namesMatch(m.name, parts.municipality));
      if (match) setValue('municipality', match.value);
    }
  }, [setValue, typedMunicipalities, watch]);

  const onSubmit = async (data: AddressFormData) => {
    setError('');
    const municipality = selectedMunicipality?.name?.trim() ?? data.municipality?.trim();
    const province = selectedMunicipality?.provinceName?.trim() ?? undefined;
    const payload: any = {
      ...data,
      municipality,
      province,
      phone: data.phone?.trim(),
      label: data.label?.trim() || undefined,
      reference: data.reference?.trim() || undefined,
      recipientName: data.recipientName?.trim(),
      village: data.village?.trim() || undefined,
      street: data.street?.trim() || undefined,
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
    <Dialog open onOpenChange={(open) => { if (!open) onCancel?.(); }}>
      <DialogContent className="flex max-h-[92vh] w-[95vw] max-w-[860px] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 space-y-2 border-b px-5 py-5 text-left sm:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MapPin className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-lg">
                {isEditing ? 'Edit Address' : 'Add New Address'}
              </DialogTitle>
              <DialogDescription>
                {isEditing
                  ? 'Update your delivery address details.'
                  : 'Save an address for faster checkout and delivery.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-7 overflow-y-auto px-5 py-6 sm:px-8">
            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Address Search */}
            <div className="space-y-1.5">
              {isSearchLoaded ? (
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                      placeholder="Start typing your address..."
                      className="flex h-12 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </Autocomplete>
                </div>
              ) : (
                <div className="relative">
                  <Loader2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                  <Input disabled className="h-12 pl-10" placeholder="Loading address search..." />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                e.g. Dili, Timor-Leste, or a specific location
              </p>
            </div>

            {/* Location */}
            <FormSection title="Location" subtitle="Select your address location in Timor-Leste.">
              <div className="grid gap-4 sm:grid-cols-2">
                <FieldWrap label="Municipality" htmlFor="municipality" required error={errors.municipality?.message}>
                  <Controller
                    control={control}
                    name="municipality"
                    render={({ field }) => (
                      <Select
                        value={field.value ?? ''}
                        onValueChange={(value) => {
                          field.onChange(value);
                          // A real municipality change (not the initial-data
                          // prefill, which sets this via setValue and never
                          // touches onValueChange) invalidates whatever
                          // Posto/Suco was picked for the old municipality.
                          setValue('postoAdmin', '');
                          setValue('suco', '');
                        }}
                      >
                        <SelectTrigger id="municipality" className="h-11">
                          <span className="flex min-w-0 items-center gap-2">
                            <Landmark className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <SelectValue placeholder={municipalitiesLoading ? 'Loading…' : 'Select municipality'} />
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {typedMunicipalities.map((m) => (
                            <SelectItem key={m.value} value={m.value}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FieldWrap>

                <FieldWrap label="Posto Administrativo" htmlFor="postoAdmin" required error={errors.postoAdmin?.message}>
                  <Controller
                    control={control}
                    name="postoAdmin"
                    render={({ field }) => (
                      <Select
                        value={field.value ?? ''}
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Same reasoning as Municipality above — only a
                          // genuine user pick lands here.
                          setValue('suco', '');
                        }}
                        disabled={!selectedMunicipality || postosLoading}
                      >
                        <SelectTrigger id="postoAdmin" className="h-11">
                          <span className="flex min-w-0 items-center gap-2">
                            {postosLoading ? (
                              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                            ) : (
                              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                            )}
                            <SelectValue
                              placeholder={!selectedMunicipality ? 'Select municipality first' : 'Select posto'}
                            />
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {postoOptions.map((p) => (
                            <SelectItem key={p.name} value={p.name}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {postosError && (
                    <FieldHint error>Couldn&apos;t load Posto options — you can still type Suco/Aldeia manually below.</FieldHint>
                  )}
                </FieldWrap>

                <FieldWrap label="Suco" htmlFor="suco" required error={errors.suco?.message}>
                  {useSucoDropdown ? (
                    <Controller
                      control={control}
                      name="suco"
                      render={({ field }) => (
                        <Select value={field.value ?? ''} onValueChange={field.onChange}>
                          <SelectTrigger id="suco" className="h-11">
                            <span className="flex min-w-0 items-center gap-2">
                              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <SelectValue placeholder="Select suco" />
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            {sucoOptions.map((s) => (
                              <SelectItem key={s.name} value={s.name}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  ) : (
                    <div className="relative">
                      {sucosLoading && !!watchedPostoAdmin && (
                        <Loader2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                      )}
                      <Input
                        id="suco"
                        className={cn('h-11', sucosLoading && !!watchedPostoAdmin && 'pl-9')}
                        placeholder={watchedPostoAdmin ? 'e.g., Bidau Lecidere' : 'Select posto first'}
                        disabled={!watchedPostoAdmin}
                        {...register('suco')}
                      />
                    </div>
                  )}
                  {!useSucoDropdown && !!watchedPostoAdmin && (
                    <FieldHint>No official list yet for this posto — type the suco name.</FieldHint>
                  )}
                </FieldWrap>

                <FieldWrap label="Aldeia" htmlFor="village" hint="Optional">
                  <Input id="village" placeholder="e.g., Same aldeia name" {...register('village')} className="h-11" />
                </FieldWrap>
              </div>

              <FieldWrap label="Street" htmlFor="street" hint="Optional">
                <Input id="street" placeholder="Street name, house number, etc." {...register('street')} className="h-11" />
              </FieldWrap>
            </FormSection>

            {/* Delivery Reference */}
            <FormSection title="Delivery Reference" subtitle="Help the courier find your location easily.">
              <FieldWrap label="Reference Point" htmlFor="reference">
                <Input
                  id="reference"
                  placeholder="e.g. Near the church, market, building, etc."
                  className="h-11"
                  {...register('reference')}
                />
              </FieldWrap>
            </FormSection>

            {/* Recipient */}
            <FormSection title="Recipient" subtitle="Who should the courier ask for?">
              <div className="grid gap-4 sm:grid-cols-2">
                <FieldWrap label="Recipient Name" htmlFor="recipientName" required error={errors.recipientName?.message}>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="recipientName" className="h-11 pl-9" placeholder="Full name" {...register('recipientName')} />
                  </div>
                </FieldWrap>
                <FieldWrap label="Phone Number" htmlFor="phone" required error={errors.phone?.message}>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="phone" className="h-11 pl-9" placeholder="+670 7123 4567" {...register('phone')} />
                  </div>
                </FieldWrap>
              </div>
            </FormSection>

            {/* Save As */}
            <FormSection title="Save as" subtitle="Choose a label for this address.">
              <div className="grid grid-cols-3 gap-3">
                {SAVE_AS_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isActive = namesMatch(watchedLabel, option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setValue('label', option.value)}
                      aria-pressed={isActive}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-input text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {option.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-4 rounded-lg border border-input px-4 py-3">
                <div className="min-w-0">
                  <Label htmlFor="isPrimary" className="cursor-pointer">Set as primary address</Label>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    This will be your default address for checkout.
                  </p>
                </div>
                <Switch
                  id="isPrimary"
                  checked={!!watch('isPrimary')}
                  onCheckedChange={(c) => setValue('isPrimary', c)}
                />
              </div>
            </FormSection>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t px-5 py-4 sm:px-8">
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1 sm:flex-none"
              onClick={() => onCancel?.()}
            >
              Cancel
            </Button>
            <Button type="submit" className="h-11 flex-1 gap-1.5 sm:flex-none sm:min-w-[160px]" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                'Update Address'
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add Address
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FormSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3.5">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function FieldWrap({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label htmlFor={htmlFor}>
          {label}
          {required && <span className="text-destructive"> *</span>}
        </Label>
        {hint && !error && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
      {error && <FieldHint error>{error}</FieldHint>}
    </div>
  );
}

function FieldHint({ children, error }: { children: React.ReactNode; error?: boolean }) {
  return (
    <p className={cn('flex items-center gap-1 text-xs', error ? 'text-destructive' : 'text-muted-foreground')}>
      {error && <AlertCircle className="h-3 w-3 shrink-0" />}
      {children}
    </p>
  );
}
