'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, ArrowLeft, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAddresses, useCreateAddress } from '@/hooks/useAddresses';
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
  lat: z.string().optional(),
  lng: z.string().optional(),
  placeName: z.string().optional(),
});

type FormData = z.infer<typeof addressSchema>;

export default function NewAddressPage() {
  const search = useSearchParams();
  const router = useRouter();
  const { addresses } = useAddresses();
  const { mutateAsync: createAddress, isPending } = useCreateAddress();
  const [error, setError] = useState('');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Address</CardTitle>
        <CardDescription>Add a new delivery address. Select municipality from shipping zones.</CardDescription>
      </CardHeader>
      <CardContent>
        <AddressForm onSuccess={() => router.push('/checkout')} onCancel={() => router.back()} />
      </CardContent>
    </Card>
  );
}
