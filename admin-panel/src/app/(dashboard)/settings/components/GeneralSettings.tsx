'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
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
import { Globe, Percent, ReceiptText, Loader2, Upload, X, ImageIcon } from 'lucide-react';
import { useSettings, type Settings } from '@/hooks/useSettings';
import toast from 'react-hot-toast';

const MAX_BRANDING_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function validateBrandingImage(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'Only JPG, PNG, WEBP, or GIF images are allowed';
  }
  if (file.size > MAX_BRANDING_IMAGE_BYTES) {
    return 'Image must be 5MB or smaller';
  }
  return null;
}

interface BrandingImageFieldProps {
  label: string;
  hint: string;
  imageUrl?: string | null;
  isUploading: boolean;
  onUpload: (file: File) => Promise<unknown>;
  onClear: () => void;
  previewClassName: string;
}

// Shared by the Logo and Favicon fields below — both are a single real
// image persisted immediately on upload (via the dedicated
// upload-logo/upload-favicon endpoints), not part of the batched "Save
// General Settings" submit, so a change here takes effect right away.
function BrandingImageField({
  label,
  hint,
  imageUrl,
  isUploading,
  onUpload,
  onClear,
  previewClassName,
}: BrandingImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const error = validateBrandingImage(file);
    if (error) {
      toast.error(error);
      return;
    }

    await onUpload(file);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-4">
        <div className={`flex items-center justify-center overflow-hidden rounded-lg border bg-muted/30 ${previewClassName}`}>
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : imageUrl ? (
            <Image src={imageUrl} alt={label} width={64} height={64} className="h-full w-full object-contain" unoptimized />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={isUploading} onClick={() => inputRef.current?.click()}>
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              {imageUrl ? 'Replace' : 'Upload'}
            </Button>
            {imageUrl && (
              <Button type="button" variant="ghost" size="sm" disabled={isUploading} onClick={onClear}>
                <X className="mr-1.5 h-3.5 w-3.5" />
                Remove
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
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

interface GeneralSettingsProps {
  settings: Settings | undefined;
  onSettingsUpdated?: () => Promise<void> | void;
}

const buildFormData = (settings?: Settings) => ({
  siteName: settings?.siteName || 'E-commerce Timor-Leste',
  siteDescription: settings?.siteDescription || 'Online marketplace for Timor-Leste',
  contactEmail: settings?.contactEmail || 'support@ecommercetimor.com',
  contactPhone: settings?.contactPhone || '+670 1234 5678',
  address: settings?.address || 'Dili, Timor-Leste',
  currency: settings?.currency || 'USD',
  taxRate: settings?.taxRate ?? 8,
  serviceFee: settings?.serviceFee ?? 4.5,
});

export function GeneralSettings({ settings, onSettingsUpdated }: GeneralSettingsProps) {
  const { updateSettings, uploadLogo, isUploadingLogo, uploadFavicon, isUploadingFavicon } = useSettings();
  const [formData, setFormData] = useState(() => buildFormData(settings));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData(buildFormData(settings));
  }, [settings]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleClearLogo = async () => {
    try {
      await updateSettings({ logoUrl: '' });
      await onSettingsUpdated?.();
      toast.success('Logo removed');
    } catch {
      toast.error('Failed to remove logo');
    }
  };

  const handleClearFavicon = async () => {
    try {
      await updateSettings({ faviconUrl: '' });
      await onSettingsUpdated?.();
      toast.success('Favicon removed');
    } catch {
      toast.error('Failed to remove favicon');
    }
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        ...formData,
        taxRate: Number(formData.taxRate ?? 0),
        serviceFee: Number(formData.serviceFee ?? 0),
      });
      await onSettingsUpdated?.();
      toast.success('General settings updated');
    } catch {
      toast.error('Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>General Settings</CardTitle>
        <CardDescription>
          Configure store identity, contact details, and commerce values.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 rounded-lg border p-4 sm:grid-cols-2">
          <BrandingImageField
            label="Site Logo"
            hint="Shown in the storefront header in place of the text logo. Square images work best."
            imageUrl={settings?.logoUrl}
            isUploading={isUploadingLogo}
            onUpload={(file) => uploadLogo(file)}
            onClear={handleClearLogo}
            previewClassName="h-16 w-16"
          />
          <BrandingImageField
            label="Favicon"
            hint="Shown in the browser tab. A small square icon (e.g. 64×64) works best."
            imageUrl={settings?.faviconUrl}
            isUploading={isUploadingFavicon}
            onUpload={(file) => uploadFavicon(file)}
            onClear={handleClearFavicon}
            previewClassName="h-10 w-10"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Globe className="h-4 w-4 text-primary" />
              Store profile
            </div>
            <p className="mt-2 text-lg font-semibold">{formData.siteName}</p>
            <p className="text-xs text-muted-foreground">{formData.currency}</p>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Percent className="h-4 w-4 text-primary" />
              Commerce values
            </div>
            <p className="mt-2 text-lg font-semibold">Tax {formData.taxRate}%</p>
            <p className="text-xs text-muted-foreground">Service fee ${Number(formData.serviceFee || 0).toFixed(2)}</p>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ReceiptText className="h-4 w-4 text-primary" />
              Contact details
            </div>
            <p className="mt-2 text-lg font-semibold">{formData.contactEmail}</p>
            <p className="text-xs text-muted-foreground">{formData.contactPhone}</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Store Name</Label>
            <Input
              value={formData.siteName}
              onChange={(e) => handleChange('siteName', e.target.value)}
              placeholder="Enter store name"
            />
          </div>

          <div className="space-y-2">
            <Label>Currency</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.currency}
              onChange={(e) => handleChange('currency', e.target.value)}
            >
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="IDR">IDR - Indonesian Rupiah</option>
            </select>
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label>Store Description</Label>
            <Textarea
              value={formData.siteDescription}
              onChange={(e) => handleChange('siteDescription', e.target.value)}
              placeholder="Describe your store"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Contact Email</Label>
            <Input
              type="email"
              value={formData.contactEmail}
              onChange={(e) => handleChange('contactEmail', e.target.value)}
              placeholder="contact@store.com"
            />
          </div>

          <div className="space-y-2">
            <Label>Contact Phone</Label>
            <Input
              value={formData.contactPhone}
              onChange={(e) => handleChange('contactPhone', e.target.value)}
              placeholder="+670 1234 5678"
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label>Store Address</Label>
            <Textarea
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Store address"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Tax Rate (%)</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.taxRate}
              onChange={(e) => handleChange('taxRate', Number(e.target.value))}
              placeholder="8"
            />
          </div>

          <div className="space-y-2">
            <Label>Service Fee ($)</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.serviceFee}
              onChange={(e) => handleChange('serviceFee', Number(e.target.value))}
              placeholder="4.50"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save General Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
