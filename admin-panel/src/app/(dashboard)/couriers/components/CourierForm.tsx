'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateCourier, useUpdateCourier, CourierData } from '@/hooks/useCouriers';
import { Loader2 } from 'lucide-react';

const courierSchema = z.object({
  name: z.string().min(2, 'Courier name is required'),
  code: z.string().min(2, 'Courier code is required'),
  phone: z.string().optional().or(z.literal('')),
  website: z.string().url('Enter a valid website URL').optional().or(z.literal('')),
  trackingUrl: z.string().url('Enter a valid tracking URL').optional().or(z.literal('')),
  status: z.string().min(1, 'Status is required'),
});

type CourierFormValues = z.infer<typeof courierSchema>;

interface CourierFormProps {
  initialData?: CourierData | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CourierForm({ initialData, onSuccess, onCancel }: CourierFormProps) {
  const createMutation = useCreateCourier();
  const updateMutation = useUpdateCourier();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CourierFormValues>({
    resolver: zodResolver(courierSchema),
    defaultValues: {
      name: '',
      code: '',
      phone: '',
      website: '',
      trackingUrl: '',
      status: 'ACTIVE',
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name ?? '',
        code: initialData.code ?? '',
        phone: initialData.phone ?? '',
        website: initialData.website ?? '',
        trackingUrl: initialData.trackingUrl ?? '',
        status: initialData.status ?? 'ACTIVE',
      });
    }
  }, [initialData, reset]);

  const onSubmit = async (values: CourierFormValues) => {
    if (initialData?.id) {
      await updateMutation.mutateAsync({ id: initialData.id, payload: values });
    } else {
      await createMutation.mutateAsync(values);
    }

    onSuccess();
  };

  const isSaving = createMutation.status === 'pending' || updateMutation.status === 'pending';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <Label htmlFor="name">Courier Name *</Label>
          <Input id="name" placeholder="e.g. JNE" {...register('name')} />
          {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
        </div>

        <div className="space-y-3">
          <Label htmlFor="code">Courier Code *</Label>
          <Input id="code" placeholder="e.g. JNE" {...register('code')} />
          {errors.code && <p className="text-sm text-red-500">{errors.code.message}</p>}
        </div>

        <div className="space-y-3">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" placeholder="+670 77 123 456" {...register('phone')} />
          {errors.phone && <p className="text-sm text-red-500">{errors.phone.message}</p>}
        </div>

        <div className="space-y-3">
          <Label htmlFor="status">Status *</Label>
          <Input id="status" placeholder="ACTIVE" {...register('status')} />
          {errors.status && <p className="text-sm text-red-500">{errors.status.message}</p>}
        </div>

        <div className="space-y-3 md:col-span-2">
          <Label htmlFor="website">Website</Label>
          <Input id="website" placeholder="https://courier.example.com" {...register('website')} />
          {errors.website && <p className="text-sm text-red-500">{errors.website.message}</p>}
        </div>

        <div className="space-y-3 md:col-span-2">
          <Label htmlFor="trackingUrl">Tracking URL</Label>
          <Input id="trackingUrl" placeholder="https://tracking.example.com/" {...register('trackingUrl')} />
          {errors.trackingUrl && <p className="text-sm text-red-500">{errors.trackingUrl.message}</p>}
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
            'Update Courier'
          ) : (
            'Create Courier'
          )}
        </Button>
      </div>
    </form>
  );
}
