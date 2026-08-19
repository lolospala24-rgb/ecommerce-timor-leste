'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Store, Loader2, Upload, ImageIcon, CheckCircle, XCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import {
  useMyStore,
  useUpdateMyStore,
  useUploadStoreLogo,
  useUploadStoreBanner,
} from '@/hooks/useSellers';
import toast from 'react-hot-toast';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function validateImage(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'Only JPG, PNG, WEBP, or GIF images are allowed';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return 'Image must be 5MB or smaller';
  }
  return null;
}

// There's no "remove logo/banner" endpoint on the backend — upload-logo/
// upload-banner replace whatever's there, so this only ever offers
// Upload/Replace, not Remove (building a Remove button would just call an
// endpoint that doesn't exist).
function StoreImageField({
  label,
  hint,
  imageUrl,
  isUploading,
  onUpload,
  previewClassName,
}: {
  label: string;
  hint: string;
  imageUrl?: string | null;
  isUploading: boolean;
  onUpload: (file: File) => Promise<unknown>;
  previewClassName: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const error = validateImage(file);
    if (error) {
      toast.error(error);
      return;
    }

    await onUpload(file);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className={`flex items-center justify-center overflow-hidden rounded-lg border bg-muted/30 ${previewClassName}`}>
        {isUploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : imageUrl ? (
          <Image
            src={imageUrl}
            alt={label}
            width={400}
            height={200}
            className="h-full w-full object-cover"
            unoptimized
          />
        ) : (
          <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={isUploading} onClick={() => inputRef.current?.click()}>
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          {imageUrl ? 'Replace' : 'Upload'}
        </Button>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(',')}
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

export default function MyStorePage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuthStore();
  const { data: seller, isLoading } = useMyStore();
  const updateStore = useUpdateMyStore();
  const uploadLogo = useUploadStoreLogo();
  const uploadBanner = useUploadStoreBanner();

  const [formData, setFormData] = useState({
    storeName: '',
    storePhone: '',
    storeEmail: '',
    storeAddress: '',
    description: '',
  });

  useEffect(() => {
    if (seller) {
      setFormData({
        storeName: seller.storeName || '',
        storePhone: seller.storePhone || '',
        storeEmail: seller.storeEmail || '',
        storeAddress: seller.storeAddress || '',
        description: seller.description || '',
      });
    }
  }, [seller]);

  // This page manages a seller's OWN store — /sellers/my-store on the
  // backend resolves strictly from the authenticated user's own seller
  // row, so there's no risk of editing someone else's store even if this
  // guard were bypassed. It's here purely so a non-seller doesn't land on
  // a page that can never load data for them.
  useEffect(() => {
    if (!authLoading && user && user.role !== 'SELLER') {
      router.replace('/dashboard');
    }
  }, [authLoading, user, router]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    await updateStore.mutateAsync(formData);
  };

  if (authLoading || (user?.role === 'SELLER' && isLoading)) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (user?.role !== 'SELLER') {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Store</h1>
        <p className="text-muted-foreground">
          Manage your store profile — this is what customers see on your public store page.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Store Branding
              </CardTitle>
              <CardDescription>
                Logo and banner shown on your public store page and product listings.
              </CardDescription>
            </div>
            {seller?.isVerified ? (
              <Badge className="gap-1 bg-green-500">
                <CheckCircle className="h-3 w-3" />
                Verified
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <XCircle className="h-3 w-3" />
                Pending Verification
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <StoreImageField
            label="Store Logo"
            hint="Square image recommended. Shown as your store avatar throughout the site."
            imageUrl={seller?.storeLogo}
            isUploading={uploadLogo.isPending}
            onUpload={(file) => uploadLogo.mutateAsync(file)}
            previewClassName="h-24 w-24 rounded-full"
          />
          <StoreImageField
            label="Store Banner"
            hint="Wide image recommended (e.g. 1920×400). Shown at the top of your public store page."
            imageUrl={seller?.storeBanner}
            isUploading={uploadBanner.isPending}
            onUpload={(file) => uploadBanner.mutateAsync(file)}
            previewClassName="h-32 w-full"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Store Information</CardTitle>
          <CardDescription>
            Contact details and description shown to customers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Store Name</Label>
              <Input
                value={formData.storeName}
                onChange={(e) => handleChange('storeName', e.target.value)}
                placeholder="Your store name"
              />
            </div>
            <div className="space-y-2">
              <Label>Store Phone</Label>
              <Input
                value={formData.storePhone}
                onChange={(e) => handleChange('storePhone', e.target.value)}
                placeholder="+670 1234 5678"
              />
            </div>
            <div className="space-y-2">
              <Label>Store Email</Label>
              <Input
                type="email"
                value={formData.storeEmail}
                onChange={(e) => handleChange('storeEmail', e.target.value)}
                placeholder="store@example.com"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Store Address</Label>
              <Textarea
                value={formData.storeAddress}
                onChange={(e) => handleChange('storeAddress', e.target.value)}
                placeholder="Your store's address"
                rows={2}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Store Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Tell customers about your store"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={updateStore.isPending}>
              {updateStore.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
