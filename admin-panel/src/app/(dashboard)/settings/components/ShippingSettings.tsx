'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MapPin, Truck, CircleCheckBig, ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface ShippingSettingsProps {
  // Unused here — shipping settings are always loaded fresh from the
  // dedicated /shipping-settings endpoint below, not from the general
  // Settings object. Kept for prop-shape consistency with the other tabs.
  settings?: unknown;
  onSettingsUpdated?: () => Promise<void> | void;
}

interface ShippingSettingsData {
  defaultShippingCost?: number;
  freeShippingThreshold?: number;
  enableFreeShipping?: boolean;
  enableDynamicShipping?: boolean;
  enableLocalPickup?: boolean;
  defaultCourier?: string | null;
  defaultShippingMethod?: string | null;
}

interface ShippingFormData {
  defaultShippingCost: number;
  freeShippingThreshold: number;
  enableFreeShipping: boolean;
  enableDynamicShipping: boolean;
  enableLocalPickup: boolean;
  defaultCourier: string;
  defaultShippingMethod: string;
}

interface CourierOption {
  id: number;
  name: string;
  code: string;
  status?: string;
}

const SHIPPING_METHODS = ['STANDARD', 'EXPRESS', 'ECONOMY', 'LOCAL_PICKUP'];

const getInitialFormData = (shippingData?: Partial<ShippingSettingsData> | null): ShippingFormData => ({
  defaultShippingCost: Number(shippingData?.defaultShippingCost ?? 2.5),
  freeShippingThreshold: Number(shippingData?.freeShippingThreshold ?? 50),
  enableFreeShipping: Boolean(shippingData?.enableFreeShipping ?? false),
  enableDynamicShipping: Boolean(shippingData?.enableDynamicShipping ?? false),
  enableLocalPickup: Boolean(shippingData?.enableLocalPickup ?? false),
  defaultCourier: shippingData?.defaultCourier ?? '',
  defaultShippingMethod: shippingData?.defaultShippingMethod ?? 'STANDARD',
});

export function ShippingSettings({ onSettingsUpdated }: ShippingSettingsProps) {
  const [formData, setFormData] = useState<ShippingFormData>(() => getInitialFormData());
  const [isSaving, setIsSaving] = useState(false);
  const [couriers, setCouriers] = useState<CourierOption[]>([]);

  useEffect(() => {
    const loadShippingSettings = async () => {
      try {
        const response = await api.get('/shipping-settings');
        const shippingData = response?.data?.data ?? response?.data ?? response;
        setFormData(getInitialFormData(shippingData));
      } catch {
        setFormData(getInitialFormData());
      }
    };

    const loadCouriers = async () => {
      try {
        const response = await api.get('/couriers');
        const list = Array.isArray(response?.data?.data)
          ? response.data.data
          : Array.isArray(response?.data)
            ? response.data
            : [];
        setCouriers(list.filter((courier: CourierOption) => courier?.name));
      } catch {
        setCouriers([]);
      }
    };

    loadShippingSettings();
    loadCouriers();
  }, []);

  const handleChange = <K extends keyof ShippingFormData>(field: K, value: ShippingFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const parseNumericValue = (value: string) => {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      const payload = {
        defaultShippingCost: Number(formData.defaultShippingCost ?? 0),
        freeShippingThreshold: Number(formData.freeShippingThreshold ?? 0),
        enableFreeShipping: Boolean(formData.enableFreeShipping),
        enableDynamicShipping: Boolean(formData.enableDynamicShipping),
        enableLocalPickup: Boolean(formData.enableLocalPickup),
        defaultCourier: formData.defaultCourier ?? '',
        defaultShippingMethod: formData.defaultShippingMethod ?? '',
      };

      const response = await api.put('/shipping-settings', payload);
      const shippingData = response?.data?.data ?? response?.data ?? response;
      if (shippingData) {
        setFormData(getInitialFormData(shippingData));
      }
      await onSettingsUpdated?.();
      toast.success('Shipping settings updated');
    } catch {
      toast.error('Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shipping Settings</CardTitle>
        <CardDescription>
          Configure global shipping defaults. Courier coverage and per-municipality rates are managed on the
          dedicated Shipping Rates page.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Truck className="h-4 w-4 text-primary" />
              Default shipping
            </div>
            <p className="mt-2 text-2xl font-semibold">${formData.defaultShippingCost.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Fallback cost when no shipping rate matches.</p>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CircleCheckBig className="h-4 w-4 text-primary" />
              Free shipping
            </div>
            <p className="mt-2 text-2xl font-semibold">{formData.enableFreeShipping ? 'Enabled' : 'Off'}</p>
            <p className="text-xs text-muted-foreground">Threshold at ${formData.freeShippingThreshold.toFixed(2)}.</p>
          </div>
        </div>

        <Link
          href="/shipping-rates"
          className="flex items-center justify-between rounded-lg border border-dashed p-4 transition-colors hover:bg-accent"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Manage courier coverage &amp; shipping rates</p>
              <p className="text-xs text-muted-foreground">
                Add, edit, or deactivate per-municipality courier rates on the Shipping Rates page.
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Link>

        <div className="rounded-lg border p-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Default courier: {formData.defaultCourier || 'Not set'}</Badge>
            <Badge variant="outline">Method: {formData.defaultShippingMethod || 'STANDARD'}</Badge>
            <Badge variant="outline">Pickup: {formData.enableLocalPickup ? 'Enabled' : 'Disabled'}</Badge>
            <Badge variant="outline">Dynamic zones: {formData.enableDynamicShipping ? 'Enabled' : 'Disabled'}</Badge>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Default Shipping Cost ($)</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.defaultShippingCost ?? 0}
              onChange={(e) => handleChange('defaultShippingCost', parseNumericValue(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label>Free Shipping Threshold ($)</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.freeShippingThreshold ?? 0}
              onChange={(e) => handleChange('freeShippingThreshold', parseNumericValue(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Orders above this amount automatically receive free shipping.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label>Enable Free Shipping</Label>
              <p className="text-sm text-muted-foreground">Apply free shipping when the threshold is met.</p>
            </div>
            <Switch
              checked={formData.enableFreeShipping}
              onCheckedChange={(checked) => handleChange('enableFreeShipping', checked)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label>Enable Dynamic Shipping</Label>
              <p className="text-sm text-muted-foreground">Use zone-based pricing for delivery.</p>
            </div>
            <Switch
              checked={formData.enableDynamicShipping}
              onCheckedChange={(checked) => handleChange('enableDynamicShipping', checked)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4 md:col-span-2">
            <div>
              <Label>Enable Local Pickup</Label>
              <p className="text-sm text-muted-foreground">Allow customers to collect orders directly from the store.</p>
            </div>
            <Switch
              checked={formData.enableLocalPickup}
              onCheckedChange={(checked) => handleChange('enableLocalPickup', checked)}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 border-t pt-4">
          <div className="space-y-2">
            <Label>Default Courier</Label>
            <Select
              value={formData.defaultCourier ?? ''}
              onValueChange={(value) => handleChange('defaultCourier', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a courier" />
              </SelectTrigger>
              <SelectContent>
                {couriers.map((courier) => (
                  <SelectItem key={courier.id} value={courier.name}>
                    {courier.name} ({courier.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Default Shipping Method</Label>
            <Select
              value={formData.defaultShippingMethod ?? 'STANDARD'}
              onValueChange={(value) => handleChange('defaultShippingMethod', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a method" />
              </SelectTrigger>
              <SelectContent>
                {SHIPPING_METHODS.map((method) => (
                  <SelectItem key={method} value={method}>
                    {method}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Shipping Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
