'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/shared/ImageUpload';
import { useRegisterSeller } from '@/hooks/useSellers';
import { Loader2 } from 'lucide-react';

// Backend (RegisterSellerDto) requires digits-only, no spaces/dashes:
// /^[+]?[0-9]{8,15}$/. Validating against that same pattern here — after
// stripping the formatting characters the placeholders below suggest —
// catches the mismatch before it round-trips to a 400.
const PHONE_PATTERN = /^[+]?[0-9]{8,15}$/;
const normalizePhone = (value: string) => value.replace(/[\s-]/g, '');

const sellerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Owner name is required'),
  phone: z
    .string()
    .min(8, 'Phone number is required')
    .refine((v) => PHONE_PATTERN.test(normalizePhone(v)), 'Enter a valid phone number (8-15 digits)'),
  storeName: z.string().min(2, 'Store name is required'),
  storePhone: z
    .string()
    .min(8, 'Store phone is required')
    .refine((v) => PHONE_PATTERN.test(normalizePhone(v)), 'Enter a valid phone number (8-15 digits)'),
  storeEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  storeAddress: z.string().min(5, 'Store address is required'),
  storeLogo: z.string().optional().or(z.literal('')),
  storeBanner: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
});

type CreateSellerFormValues = z.infer<typeof sellerSchema>;

interface CreateSellerFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function CreateSellerForm({ onSuccess, onCancel }: CreateSellerFormProps) {
  const { mutateAsync, isPending: isLoading } = useRegisterSeller();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateSellerFormValues>({
    resolver: zodResolver(sellerSchema),
    defaultValues: {
      email: '',
      password: '',
      name: '',
      phone: '',
      storeName: '',
      storePhone: '',
      storeEmail: '',
      storeAddress: '',
      storeLogo: '',
      storeBanner: '',
      description: '',
    },
  });

  const [storeLogo, setStoreLogo] = useState<string>('');
  const [storeBanner, setStoreBanner] = useState<string>('');

  const onSubmit = async (values: CreateSellerFormValues) => {
    try {
      await mutateAsync({
        email: values.email,
        password: values.password,
        name: values.name,
        phone: normalizePhone(values.phone),
        storeName: values.storeName,
        storePhone: normalizePhone(values.storePhone),
        storeEmail: values.storeEmail || undefined,
        storeAddress: values.storeAddress,
        storeLogo: storeLogo || undefined,
        storeBanner: storeBanner || undefined,
        description: values.description || undefined,
      });
      onSuccess();
    } catch {
      // useRegisterSeller's onError already shows a toast with the specific
      // reason — nothing else to do, just don't let it surface as an
      // unhandled promise rejection.
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <Label htmlFor="email">Owner Email *</Label>
            <Input id="email" type="email" placeholder="owner@example.com" {...register('email')} />
            {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
          </div>
          <div>
            <Label htmlFor="password">Password *</Label>
            <Input id="password" type="password" placeholder="Enter a secure password" {...register('password')} />
            {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>}
          </div>
          <div>
            <Label htmlFor="name">Owner Name *</Label>
            <Input id="name" placeholder="Seller owner name" {...register('name')} />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="phone">Owner Phone *</Label>
            <Input id="phone" type="tel" placeholder="+670 77 123 456" {...register('phone')} />
            {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone.message}</p>}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="storeName">Store Name *</Label>
            <Input id="storeName" placeholder="Store or shop name" {...register('storeName')} />
            {errors.storeName && <p className="mt-1 text-sm text-red-500">{errors.storeName.message}</p>}
          </div>
          <div>
            <Label htmlFor="storePhone">Store Phone *</Label>
            <Input id="storePhone" type="tel" placeholder="+670 77 987 654" {...register('storePhone')} />
            {errors.storePhone && <p className="mt-1 text-sm text-red-500">{errors.storePhone.message}</p>}
          </div>
          <div>
            <Label htmlFor="storeEmail">Store Email</Label>
            <Input id="storeEmail" type="email" placeholder="store@example.com" {...register('storeEmail')} />
            {errors.storeEmail && <p className="mt-1 text-sm text-red-500">{errors.storeEmail.message}</p>}
          </div>
          <div>
            <Label>Store Logo</Label>
            <ImageUpload
              images={storeLogo ? [storeLogo] : []}
              setImages={(images) => setStoreLogo(images[0] || '')}
              maxImages={1}
            />
            <p className="text-xs text-muted-foreground mt-1">Upload one logo image for the seller profile.</p>
          </div>
          <div>
            <Label>Store Banner</Label>
            <ImageUpload
              images={storeBanner ? [storeBanner] : []}
              setImages={(images) => setStoreBanner(images[0] || '')}
              maxImages={1}
            />
            <p className="text-xs text-muted-foreground mt-1">Upload one banner image for the seller store page.</p>
          </div>
          <div>
            <Label htmlFor="storeAddress">Store Address *</Label>
            <Input id="storeAddress" placeholder="Store address" {...register('storeAddress')} />
            {errors.storeAddress && <p className="mt-1 text-sm text-red-500">{errors.storeAddress.message}</p>}
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Store Description</Label>
        <Textarea id="description" rows={4} placeholder="Add a short description for the seller" {...register('description')} />
        {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description.message}</p>}
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Seller'
          )}
        </Button>
      </div>
    </form>
  );
}
