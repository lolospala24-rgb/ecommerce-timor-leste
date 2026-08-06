'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useAddresses, useUpdateAddress, useShippingZones } from '@/hooks/useAddresses';
import { AddressForm } from '@/components/checkout/AddressForm';

const addressSchema = z.object({
  label: z.string().optional(),
  province: z.string().optional(),
  municipality: z.string().min(1, 'Please select a municipality'),
  postoAdmin: z.string().min(1, 'Please enter Posto Administrativo'),
  suco: z.string().min(1, 'Please enter Suco'),
  village: z.string().optional(),
  street: z.string().optional(),
  reference: z.string().optional(),
  phone: z.string().optional(),
  isPrimary: z.boolean().default(false),
});

type AddressForm = z.infer<typeof addressSchema>;

export default function EditAddressPage() {
  const params = useParams();
  const router = useRouter();
  const addressId = parseInt(params.id as string);
  const { addresses, isLoading } = useAddresses();
  const { mutateAsync: updateAddress, isPending: isUpdating } = useUpdateAddress();
  const { zones, municipalities } = useShippingZones();
  const [error, setError] = useState('');

  const address = addresses?.find((a: any) => a.id === addressId);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: '',
      municipality: '',
      postoAdmin: '',
      suco: '',
      village: '',
      street: '',
      reference: '',
      phone: '',
      isPrimary: false,
    },
  });

  const municipalityValue = watch('municipality') ?? '';
  const isPrimaryValue = watch('isPrimary') ?? false;

  useEffect(() => {
    if (address) {
      const initial = {
        label: address.label || '',
        municipalityId: address.municipalityId ? String(address.municipalityId) : '',
        province: address.province || '',
        provinceId: address.provinceId ? String(address.provinceId) : '',
        postoAdmin: address.postoAdmin || '',
        suco: address.suco || '',
        village: address.village || '',
        street: address.street || '',
        reference: address.reference || '',
        phone: address.phone || '',
        isPrimary: address.isPrimary || false,
      };
      reset(initial as any);
    }
  }, [address, reset]);

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!address) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Address Not Found</h2>
        <Button className="mt-4" asChild>
          <Link href="/account/addresses">Back to Addresses</Link>
        </Button>
      </div>
    );
  }
  const handleSuccess = () => router.push('/account/addresses');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <CardTitle>Edit Address</CardTitle>
            <CardDescription>Update your delivery address</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <AddressForm initialData={address} onSuccess={handleSuccess} />
      </CardContent>
    </Card>
  );
}