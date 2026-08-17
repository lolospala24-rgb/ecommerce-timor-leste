'use client';

import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useCouriers } from '@/hooks/useCouriers';
import { useMunicipalities } from '@/hooks/useMunicipalities';
import {
  useCreateShippingRate,
  useUpdateShippingRate,
  ShippingRateData,
} from '@/hooks/useShippingRates';

const shippingRateSchema = z.object({
  courierId: z.number().min(1, 'Courier is required'),
  municipalityId: z.number().min(1, 'Municipality is required'),
  shippingMethod: z.string().max(50, 'Keep it under 50 characters').optional().or(z.literal('')),
  shippingCost: z.number().min(0, 'Price must be 0 or greater'),
  estimatedDeliveryDays: z.string().optional(),
  priority: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

type ShippingRateFormValues = z.infer<typeof shippingRateSchema>;

interface ShippingRateFormProps {
  initialData?: ShippingRateData | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ShippingRateForm({ initialData, onSuccess, onCancel }: ShippingRateFormProps) {
  const createMutation = useCreateShippingRate();
  const updateMutation = useUpdateShippingRate();
  const { data: couriers, isLoading: isLoadingCouriers } = useCouriers();
  const { data: municipalities, isLoading: isLoadingMunicipalities } = useMunicipalities();
  const activeMunicipalities = (municipalities ?? []).filter((m) => m.isActive);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ShippingRateFormValues>({
    resolver: zodResolver(shippingRateSchema),
    defaultValues: {
      courierId: 0,
      municipalityId: 0,
      shippingMethod: '',
      shippingCost: 0,
      estimatedDeliveryDays: '',
      priority: '0',
      status: 'ACTIVE',
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        courierId: initialData.courierId ?? 0,
        municipalityId: initialData.municipalityId ?? 0,
        shippingMethod: initialData.shippingMethod ?? '',
        shippingCost: Number(initialData.shippingCost ?? 0),
        estimatedDeliveryDays:
          initialData.estimatedDeliveryDays !== null && initialData.estimatedDeliveryDays !== undefined
            ? String(initialData.estimatedDeliveryDays)
            : '',
        priority: initialData.priority !== undefined && initialData.priority !== null ? String(initialData.priority) : '0',
        status: initialData.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      });
    } else {
      reset({
        courierId: 0,
        municipalityId: 0,
        shippingMethod: '',
        shippingCost: 0,
        estimatedDeliveryDays: '',
        priority: '0',
        status: 'ACTIVE',
      });
    }
  }, [initialData, reset]);

  const onSubmit = async (values: ShippingRateFormValues) => {
    const courier = (couriers ?? []).find((c) => c.id === values.courierId);
    const municipality = (municipalities ?? []).find((m) => m.id === values.municipalityId);
    const method = values.shippingMethod?.trim();
    const zoneName = `${municipality?.name ?? 'Municipality'} - ${courier?.name ?? 'Courier'}${method ? ` (${method})` : ''}`;

    const estimatedDeliveryDays = values.estimatedDeliveryDays?.trim()
      ? Number(values.estimatedDeliveryDays)
      : undefined;
    const priority = values.priority?.trim() ? Number(values.priority) : undefined;

    const payload = {
      zoneName,
      courierId: values.courierId,
      municipalityId: values.municipalityId,
      shippingMethod: method || undefined,
      shippingCost: values.shippingCost,
      estimatedDeliveryDays,
      priority,
      status: values.status,
    };

    if (initialData?.id) {
      await updateMutation.mutateAsync({ id: initialData.id, payload });
    } else {
      await createMutation.mutateAsync(payload);
    }

    onSuccess();
  };

  const isSaving = createMutation.status === 'pending' || updateMutation.status === 'pending';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <Label htmlFor="courierId">Courier *</Label>
          <Controller
            control={control}
            name="courierId"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : ''}
                onValueChange={(value) => field.onChange(Number(value))}
                disabled={isLoadingCouriers}
              >
                <SelectTrigger id="courierId">
                  <SelectValue placeholder="Select courier" />
                </SelectTrigger>
                <SelectContent>
                  {(couriers ?? []).map((courier) => (
                    <SelectItem key={courier.id} value={String(courier.id)}>
                      {courier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.courierId && <p className="text-sm text-red-500">{errors.courierId.message}</p>}
        </div>

        <div className="space-y-3">
          <Label htmlFor="municipalityId">Municipality *</Label>
          <Controller
            control={control}
            name="municipalityId"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : ''}
                onValueChange={(value) => field.onChange(Number(value))}
                disabled={isLoadingMunicipalities}
              >
                <SelectTrigger id="municipalityId">
                  <SelectValue placeholder="Select municipality" />
                </SelectTrigger>
                <SelectContent>
                  {activeMunicipalities.map((municipality) => (
                    <SelectItem key={municipality.id} value={String(municipality.id)}>
                      {municipality.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.municipalityId && <p className="text-sm text-red-500">{errors.municipalityId.message}</p>}
        </div>

        <div className="space-y-3">
          <Label htmlFor="shippingMethod">Shipping Method / Service</Label>
          <Input id="shippingMethod" placeholder="e.g. STANDARD, EXPRESS" {...register('shippingMethod')} />
          {errors.shippingMethod && <p className="text-sm text-red-500">{errors.shippingMethod.message}</p>}
        </div>

        <div className="space-y-3">
          <Label htmlFor="status">Status *</Label>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.status && <p className="text-sm text-red-500">{errors.status.message}</p>}
        </div>

        <div className="space-y-3">
          <Label htmlFor="shippingCost">Price ($) *</Label>
          <Input
            id="shippingCost"
            type="number"
            step="0.01"
            min="0"
            {...register('shippingCost', { valueAsNumber: true })}
          />
          {errors.shippingCost && <p className="text-sm text-red-500">{errors.shippingCost.message}</p>}
        </div>

        <div className="space-y-3">
          <Label htmlFor="estimatedDeliveryDays">Estimated Delivery (days)</Label>
          <Input id="estimatedDeliveryDays" type="number" min="0" {...register('estimatedDeliveryDays')} />
          {errors.estimatedDeliveryDays && <p className="text-sm text-red-500">{errors.estimatedDeliveryDays.message}</p>}
        </div>

        <div className="space-y-3">
          <Label htmlFor="priority">Priority</Label>
          <Input id="priority" type="number" {...register('priority')} />
          <p className="text-xs text-muted-foreground">
            Controls display order at checkout, and which rate wins when this courier also has a
            broader province-wide fallback rate for the same method. Different shipping methods
            for the same courier (e.g. Standard vs Express) all show at checkout regardless of priority.
          </p>
          {errors.priority && <p className="text-sm text-red-500">{errors.priority.message}</p>}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" type="button" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : initialData?.id ? (
            'Update Shipping Rate'
          ) : (
            'Create Shipping Rate'
          )}
        </Button>
      </div>
    </form>
  );
}
