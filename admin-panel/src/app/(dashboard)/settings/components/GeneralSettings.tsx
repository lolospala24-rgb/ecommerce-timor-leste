'use client';

import { useEffect, useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { ImageUpload } from '@/components/shared/ImageUpload';
import { Globe, MapPin, Phone, Mail, Percent, ReceiptText } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface GeneralSettingsProps {
  settings: any;
  onSettingsUpdated?: () => Promise<void> | void;
}

const buildFormData = (settings: any) => ({
  siteName: settings?.siteName || 'E-commerce Timor-Leste',
  siteDescription: settings?.siteDescription || 'Online marketplace for Timor-Leste',
  siteLogo: settings?.siteLogo || '',
  siteFavicon: settings?.siteFavicon || '',
  contactEmail: settings?.contactEmail || 'support@ecommercetimor.com',
  contactPhone: settings?.contactPhone || '+670 1234 5678',
  address: settings?.address || 'Dili, Timor-Leste',
  timezone: settings?.timezone || 'Asia/Dili',
  currency: settings?.currency || 'USD',
  dateFormat: settings?.dateFormat || 'MM/DD/YYYY',
  timeFormat: settings?.timeFormat || '12h',
  taxRate: settings?.taxRate ?? 8,
  serviceFee: settings?.serviceFee ?? 4.5,
});

export function GeneralSettings({ settings, onSettingsUpdated }: GeneralSettingsProps) {
  const [formData, setFormData] = useState(() => buildFormData(settings));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData(buildFormData(settings));
  }, [settings]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        taxRate: Number(formData.taxRate ?? 0),
        serviceFee: Number(formData.serviceFee ?? 0),
      };
      const response = await api.post('/admin/settings', payload);
      const updated = response?.data ?? response;
      const normalized = typeof updated === 'object' && updated ? { ...formData, ...updated } : formData;
      setFormData((prev) => ({ ...prev, ...normalized }));
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
          Configure store identity, contact details, and commerce values from live configuration.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Globe className="h-4 w-4 text-primary" />
              Store profile
            </div>
            <p className="mt-2 text-lg font-semibold">{formData.siteName}</p>
            <p className="text-xs text-muted-foreground">{formData.currency} • {formData.timezone}</p>
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
            <Label>Timezone</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.timezone}
              onChange={(e) => handleChange('timezone', e.target.value)}
            >
              <option value="Asia/Dili">Asia/Dili (UTC+9)</option>
              <option value="Asia/Jakarta">Asia/Jakarta (UTC+7)</option>
              <option value="Asia/Singapore">Asia/Singapore (UTC+8)</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Date Format</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.dateFormat}
              onChange={(e) => handleChange('dateFormat', e.target.value)}
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
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

        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="h-4 w-4 text-primary" />
            Store branding
          </div>
          <Label>Store Logo</Label>
          <ImageUpload
            images={formData.siteLogo ? [formData.siteLogo] : []}
            setImages={(images) => handleChange('siteLogo', images[0] || '')}
            maxImages={1}
          />
          <p className="text-xs text-muted-foreground">
            Recommended size: 200x60px. Supported formats: PNG, JPG, SVG
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{formData.currency}</Badge>
            <Badge variant="outline">{formData.dateFormat}</Badge>
            <Badge variant="outline">{formData.timezone}</Badge>
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