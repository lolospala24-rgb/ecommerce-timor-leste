'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImageUpload } from '@/components/shared/ImageUpload';
import { StoreAddressInput } from '@/components/shared/StoreAddressInput';
import { useUpdateSeller } from '@/hooks/useSellers';
import { usePublicMunicipalities } from '@/hooks/useMunicipalities';
import { Loader2 } from 'lucide-react';

// Mirrors CreateSellerForm's store-profile fields, minus the owner
// account fields (email/password/name/phone) — those belong to the
// User record, not the Seller, and changing a login email/password is a
// distinct, more sensitive operation this form doesn't attempt.
const PHONE_PATTERN = /^[+]?[0-9]{8,15}$/;
const normalizePhone = (value: string) => value.replace(/[\s-]/g, '');

const editSellerSchema = z.object({
  storeName: z.string().min(2, 'Store name is required'),
  storePhone: z
    .string()
    .min(8, 'Store phone is required')
    .refine((v) => PHONE_PATTERN.test(normalizePhone(v)), 'Enter a valid phone number (8-15 digits)'),
  storeEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  storeAddress: z.string().min(5, 'Store address is required'),
  originMunicipality: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
});

type EditSellerFormValues = z.infer<typeof editSellerSchema>;

interface EditSellerFormProps {
  seller: {
    id: number;
    storeName: string;
    storePhone: string;
    storeEmail?: string | null;
    storeAddress: string;
    storeLatitude?: number | null;
    storeLongitude?: number | null;
    storeLogo?: string | null;
    storeBanner?: string | null;
    originMunicipality?: string | null;
    description?: string | null;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

export function EditSellerForm({ seller, onSuccess, onCancel }: EditSellerFormProps) {
  const { mutateAsync, isPending: isLoading } = useUpdateSeller();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EditSellerFormValues>({
    resolver: zodResolver(editSellerSchema),
    defaultValues: {
      storeName: seller.storeName || '',
      storePhone: seller.storePhone || '',
      storeEmail: seller.storeEmail || '',
      storeAddress: seller.storeAddress || '',
      originMunicipality: seller.originMunicipality || '',
      description: seller.description || '',
    },
  });

  const [storeLogo, setStoreLogo] = useState<string>(seller.storeLogo || '');
  const [storeBanner, setStoreBanner] = useState<string>(seller.storeBanner || '');
  const [storeCoords, setStoreCoords] = useState<{ lat: number; lng: number } | null>(
    seller.storeLatitude != null && seller.storeLongitude != null
      ? { lat: seller.storeLatitude, lng: seller.storeLongitude }
      : null,
  );
  const storeAddress = watch('storeAddress');
  const originMunicipality = watch('originMunicipality');
  const { data: municipalities } = usePublicMunicipalities();

  const onSubmit = async (values: EditSellerFormValues) => {
    try {
      await mutateAsync({
        id: seller.id,
        data: {
          storeName: values.storeName,
          storePhone: normalizePhone(values.storePhone),
          storeEmail: values.storeEmail || undefined,
          storeAddress: values.storeAddress,
          storeLatitude: storeCoords?.lat,
          storeLongitude: storeCoords?.lng,
          originMunicipality: values.originMunicipality || undefined,
          storeLogo: storeLogo || undefined,
          storeBanner: storeBanner || undefined,
          description: values.description || undefined,
        } as any,
      });
      onSuccess();
    } catch {
      // useUpdateSeller's onError already shows a toast with the specific
      // reason — nothing else to do, just don't let it surface as an
      // unhandled promise rejection.
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
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
            <Label htmlFor="storeAddress">Store Address *</Label>
            <StoreAddressInput
              id="storeAddress"
              value={storeAddress || ''}
              onChange={(address) => setValue('storeAddress', address, { shouldValidate: true })}
              onCoordinates={(lat, lng) => setStoreCoords({ lat, lng })}
              placeholder="Search or enter store address..."
            />
            {errors.storeAddress && <p className="mt-1 text-sm text-red-500">{errors.storeAddress.message}</p>}
          </div>
          <div>
            <Label htmlFor="originMunicipality">Seller Origin</Label>
            <Select
              value={originMunicipality || ''}
              onValueChange={(value) => setValue('originMunicipality', value)}
            >
              <SelectTrigger id="originMunicipality">
                <SelectValue placeholder="Where this seller's local products come from" />
              </SelectTrigger>
              <SelectContent>
                {municipalities?.map((m) => (
                  <SelectItem key={m.id} value={m.name}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Different from Store Address — used as the default origin for this seller&apos;s
              locally-made products.
            </p>
          </div>
        </div>

        <div className="space-y-4">
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
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </form>
  );
}
