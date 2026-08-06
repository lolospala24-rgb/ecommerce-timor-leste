"use client";

import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useCreateAddress, useUpdateAddress, useShippingZones } from '@/hooks/useAddresses';

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
  village: z.string().trim().optional(),
  street: z.string().trim().optional(),
  reference: z.string().trim().optional(),
  phone: z.string().trim().optional(),
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
      municipality: '',
      municipalityId: initialData?.municipalityId ? Number(initialData.municipalityId) : undefined,
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
      village: data.village?.trim() || undefined,
      street: data.street?.trim() || undefined,
      reference: data.reference?.trim() || undefined,
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
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <h4 className="font-medium">{initialData ? 'Edit Address' : 'Add New Address'}</h4>

      {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="label">Address Label</Label>
          <Input id="label" placeholder="Home, Office, etc." {...register('label')} />
        </div>

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
            {errors.postoAdmin && <p className="text-sm text-destructive">{errors.postoAdmin.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="suco">Suco *</Label>
          <Input id="suco" placeholder="e.g., Bidau Lecidere" {...register('suco')} />
          {errors.suco && <p className="text-sm text-destructive">{errors.suco.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="village">Village (Aldeia)</Label>
          <Input id="village" placeholder="e.g., 12 de Novembro" {...register('village')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="street">Street</Label>
          <Input id="street" placeholder="Street name" {...register('street')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reference">Reference Point</Label>
          <Input id="reference" placeholder="Near church, behind market, etc." {...register('reference')} />
          <p className="text-xs text-muted-foreground">Helpful for delivery in Timor-Leste</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input id="phone" placeholder="+670 1234 5678" {...register('phone')} />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="isPrimary">Set as primary address</Label>
          <Switch id="isPrimary" checked={!!watch('isPrimary')} onCheckedChange={(c) => setValue('isPrimary', c)} />
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
