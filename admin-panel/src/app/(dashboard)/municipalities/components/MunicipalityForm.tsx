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
import {
  useCreateMunicipality,
  useUpdateMunicipality,
  useProvinces,
  MunicipalityData,
} from '@/hooks/useMunicipalities';

const municipalitySchema = z.object({
  name: z.string().min(2, 'Municipality name must be at least 2 characters'),
  provinceId: z.number().min(1, 'Province is required'),
  code: z.string().max(10, 'Code must be 10 characters or fewer').optional().or(z.literal('')),
  isActive: z.enum(['true', 'false']),
});

type MunicipalityFormValues = z.infer<typeof municipalitySchema>;

interface MunicipalityFormProps {
  initialData?: MunicipalityData | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function MunicipalityForm({ initialData, onSuccess, onCancel }: MunicipalityFormProps) {
  const createMutation = useCreateMunicipality();
  const updateMutation = useUpdateMunicipality();
  const { data: provinces, isLoading: isLoadingProvinces } = useProvinces();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MunicipalityFormValues>({
    resolver: zodResolver(municipalitySchema),
    defaultValues: {
      name: '',
      provinceId: 0,
      code: '',
      isActive: 'true',
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name ?? '',
        provinceId: initialData.provinceId ?? 0,
        code: initialData.code ?? '',
        isActive: initialData.isActive === false ? 'false' : 'true',
      });
    } else {
      reset({ name: '', provinceId: 0, code: '', isActive: 'true' });
    }
  }, [initialData, reset]);

  const onSubmit = async (values: MunicipalityFormValues) => {
    const code = values.code ? values.code.trim() : undefined;

    if (initialData?.id) {
      await updateMutation.mutateAsync({
        id: initialData.id,
        payload: {
          name: values.name,
          provinceId: values.provinceId,
          code: code || undefined,
          isActive: values.isActive === 'true',
        },
      });
    } else {
      await createMutation.mutateAsync({
        name: values.name,
        provinceId: values.provinceId,
        code: code || undefined,
      });
    }

    onSuccess();
  };

  const isSaving = createMutation.status === 'pending' || updateMutation.status === 'pending';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <Label htmlFor="name">Municipality Name *</Label>
          <Input id="name" placeholder="e.g. Dili" {...register('name')} />
          {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
        </div>

        <div className="space-y-3">
          <Label htmlFor="provinceId">Province *</Label>
          <Controller
            control={control}
            name="provinceId"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : ''}
                onValueChange={(value) => field.onChange(Number(value))}
                disabled={isLoadingProvinces}
              >
                <SelectTrigger id="provinceId">
                  <SelectValue placeholder="Select province" />
                </SelectTrigger>
                <SelectContent>
                  {(provinces ?? []).map((province) => (
                    <SelectItem key={province.id} value={String(province.id)}>
                      {province.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.provinceId && <p className="text-sm text-red-500">{errors.provinceId.message}</p>}
        </div>

        <div className="space-y-3">
          <Label htmlFor="code">Code</Label>
          <Input id="code" placeholder="e.g. DIL" maxLength={10} {...register('code')} />
          {errors.code && <p className="text-sm text-red-500">{errors.code.message}</p>}
        </div>

        {initialData?.id && (
          <div className="space-y-3">
            <Label htmlFor="isActive">Status *</Label>
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="isActive">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.isActive && <p className="text-sm text-red-500">{errors.isActive.message}</p>}
          </div>
        )}
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
            'Update Municipality'
          ) : (
            'Create Municipality'
          )}
        </Button>
      </div>
    </form>
  );
}
