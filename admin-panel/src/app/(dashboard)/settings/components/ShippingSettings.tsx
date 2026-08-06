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
import { Plus, Trash2, MapPin, Truck, CircleCheckBig, Package2 } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface ShippingSettingsProps {
  settings?: Partial<ShippingSettingsData> | null;
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
  shippingZones?: ShippingZoneFormValue[];
}

interface ShippingZoneFormValue {
  id: number;
  zoneName: string;
  provinceId?: number | null;
  municipalityId?: number | null;
  courierId?: number | null;
  courierServiceId?: number | null;
  courierRateId?: number | null;
  shippingMethod: string;
  shippingCost: number;
  estimatedDeliveryDays?: number | null;
  minimumWeight?: number | null;
  maximumWeight?: number | null;
  status: string;
  priority: number;
  name?: string;
  method?: string;
  cost?: number;
}

interface ShippingFormData {
  defaultShippingCost: number;
  freeShippingThreshold: number;
  enableFreeShipping: boolean;
  enableDynamicShipping: boolean;
  enableLocalPickup: boolean;
  defaultCourier: string;
  defaultShippingMethod: string;
  shippingZones: ShippingZoneFormValue[];
}

interface CourierOption {
  id: number;
  name: string;
  code: string;
  status?: string;
}

interface ProvinceOption {
  id: number;
  name: string;
  code?: string;
}

interface MunicipalityOption {
  id: number;
  name: string;
}

const SHIPPING_METHODS = ['STANDARD', 'EXPRESS', 'ECONOMY', 'LOCAL_PICKUP'];
const SHIPPING_STATUSES = ['ACTIVE', 'INACTIVE'];

const getInitialFormData = (shippingData?: Partial<ShippingSettingsData> | null, fallbackSettings?: Partial<ShippingSettingsData> | null): ShippingFormData => ({
  defaultShippingCost: Number(shippingData?.defaultShippingCost ?? fallbackSettings?.defaultShippingCost ?? 2.5),
  freeShippingThreshold: Number(shippingData?.freeShippingThreshold ?? fallbackSettings?.freeShippingThreshold ?? 50),
  enableFreeShipping: Boolean(shippingData?.enableFreeShipping ?? fallbackSettings?.enableFreeShipping ?? false),
  enableDynamicShipping: Boolean(shippingData?.enableDynamicShipping ?? fallbackSettings?.enableDynamicShipping ?? false),
  enableLocalPickup: Boolean(shippingData?.enableLocalPickup ?? fallbackSettings?.enableLocalPickup ?? false),
  defaultCourier: shippingData?.defaultCourier ?? fallbackSettings?.defaultCourier ?? '',
  defaultShippingMethod: shippingData?.defaultShippingMethod ?? fallbackSettings?.defaultShippingMethod ?? 'STANDARD',
  shippingZones: Array.isArray(shippingData?.shippingZones) && shippingData.shippingZones.length > 0
    ? shippingData.shippingZones.map((zone, index) => ({
        id: zone.id ?? index + 1,
        zoneName: zone.zoneName ?? zone.name ?? '',
        provinceId: zone.provinceId ?? null,
        municipalityId: zone.municipalityId ?? null,
        courierId: zone.courierId ?? null,
        courierServiceId: zone.courierServiceId ?? null,
        courierRateId: zone.courierRateId ?? null,
        shippingMethod: zone.shippingMethod ?? zone.method ?? 'STANDARD',
        shippingCost: Number(zone.shippingCost ?? zone.cost ?? 0),
        estimatedDeliveryDays: zone.estimatedDeliveryDays ?? null,
        minimumWeight: zone.minimumWeight ?? null,
        maximumWeight: zone.maximumWeight ?? null,
        status: zone.status ?? 'ACTIVE',
        priority: Number(zone.priority ?? 0),
      }))
    : [
        {
          id: 1,
          zoneName: 'Dili Metro',
          provinceId: null,
          municipalityId: null,
          shippingMethod: 'STANDARD',
          shippingCost: 2.0,
          estimatedDeliveryDays: 2,
          status: 'ACTIVE',
          priority: 1,
        },
      ],
});

export function ShippingSettings({ settings, onSettingsUpdated }: ShippingSettingsProps) {
  const [formData, setFormData] = useState<ShippingFormData>(() => getInitialFormData(undefined, settings));
  const [isSaving, setIsSaving] = useState(false);
  const [couriers, setCouriers] = useState<CourierOption[]>([]);
  const [provinces, setProvinces] = useState<ProvinceOption[]>([]);
  const [municipalitiesByZone, setMunicipalitiesByZone] = useState<Record<number, MunicipalityOption[]>>({});

  useEffect(() => {
    setFormData(getInitialFormData(undefined, settings));
  }, [settings]);

  useEffect(() => {
    const loadShippingSettings = async () => {
      try {
        const response = await api.get('/settings/shipping');
        const shippingData = response?.data?.data ?? response?.data ?? response;
        setFormData(getInitialFormData(shippingData, settings));
      } catch {
        setFormData(getInitialFormData(undefined, settings));
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

    const loadProvinces = async () => {
      try {
        const response = await api.get('/locations/countries/TL/provinces');
        const list = Array.isArray(response?.data?.data)
          ? response.data.data
          : Array.isArray(response?.data)
            ? response.data
            : [];
        setProvinces(list.filter((province: ProvinceOption) => province?.name));
      } catch {
        setProvinces([]);
      }
    };

    loadShippingSettings();
    loadCouriers();
    loadProvinces();
  }, [settings]);

  const handleChange = <K extends keyof ShippingFormData>(field: K, value: ShippingFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const parseNumericValue = (value: string) => {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const parseOptionalNumber = (value: string) => {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const loadMunicipalitiesForZone = async (index: number, provinceName?: string | null) => {
    if (!provinceName) {
      setMunicipalitiesByZone(prev => ({ ...prev, [index]: [] }));
      return;
    }

    try {
      const response = await api.get(`/locations/provinces/${encodeURIComponent(provinceName)}/municipalities`);
      const list = Array.isArray(response?.data?.data)
        ? response.data.data
        : Array.isArray(response?.data)
          ? response.data
          : [];
      setMunicipalitiesByZone(prev => ({ ...prev, [index]: list.filter((municipality: MunicipalityOption) => municipality?.name) }));
    } catch {
      setMunicipalitiesByZone(prev => ({ ...prev, [index]: [] }));
    }
  };

  const addShippingZone = () => {
    setFormData(prev => ({
      ...prev,
      shippingZones: [
        ...prev.shippingZones,
        {
          id: Date.now(),
          zoneName: '',
          shippingMethod: 'STANDARD',
          shippingCost: 0,
          status: 'ACTIVE',
          priority: 0,
        },
      ],
    }));
  };

  const updateShippingZone = <K extends keyof ShippingZoneFormValue>(index: number, field: K, value: ShippingZoneFormValue[K]) => {
    const updatedZones = [...formData.shippingZones];
    updatedZones[index] = { ...updatedZones[index], [field]: value };

    if (field === 'provinceId') {
      updatedZones[index] = { ...updatedZones[index], municipalityId: null };
      const provinceName = provinces.find((province) => province.id === Number(value))?.name;
      void loadMunicipalitiesForZone(index, provinceName);
    }

    setFormData(prev => ({ ...prev, shippingZones: updatedZones }));
  };

  const removeShippingZone = (index: number) => {
    setFormData(prev => ({
      ...prev,
      shippingZones: prev.shippingZones.filter((_: ShippingZoneFormValue, i: number) => i !== index),
    }));
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
        shippingZones: (formData.shippingZones || []).map((zone: ShippingZoneFormValue) => ({
          zoneName: zone.zoneName || '',
          provinceId: zone.provinceId ?? null,
          municipalityId: zone.municipalityId ?? null,
          courierId: zone.courierId ?? null,
          courierServiceId: zone.courierServiceId ?? null,
          courierRateId: zone.courierRateId ?? null,
          shippingMethod: zone.shippingMethod || 'STANDARD',
          shippingCost: Number(zone.shippingCost ?? 0),
          estimatedDeliveryDays: zone.estimatedDeliveryDays ?? null,
          minimumWeight: zone.minimumWeight ?? null,
          maximumWeight: zone.maximumWeight ?? null,
          status: zone.status || 'ACTIVE',
          priority: Number(zone.priority ?? 0),
        })),
      };

      const response = await api.put('/settings/shipping', payload);
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
          Configure shipping costs, defaults, and delivery rules based on your courier and location setup.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Truck className="h-4 w-4 text-primary" />
              Default shipping
            </div>
            <p className="mt-2 text-2xl font-semibold">${formData.defaultShippingCost.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Fallback cost when no zone matches.</p>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CircleCheckBig className="h-4 w-4 text-primary" />
              Free shipping
            </div>
            <p className="mt-2 text-2xl font-semibold">{formData.enableFreeShipping ? 'Enabled' : 'Off'}</p>
            <p className="text-xs text-muted-foreground">Threshold at ${formData.freeShippingThreshold.toFixed(2)}.</p>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4 text-primary" />
              Delivery zones
            </div>
            <p className="mt-2 text-2xl font-semibold">{formData.shippingZones.length}</p>
            <p className="text-xs text-muted-foreground">Configured rules for delivery coverage.</p>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Package2 className="h-4 w-4 text-primary" />
            Live shipping snapshot
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="secondary">Default courier: {formData.defaultCourier || 'Not set'}</Badge>
            <Badge variant="outline">Method: {formData.defaultShippingMethod || 'STANDARD'}</Badge>
            <Badge variant="outline">Pickup: {formData.enableLocalPickup ? 'Enabled' : 'Disabled'}</Badge>
            <Badge variant="outline">Dynamic zones: {formData.enableDynamicShipping ? 'Enabled' : 'Disabled'}</Badge>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {formData.shippingZones.slice(0, 4).map((zone) => (
              <Badge key={zone.id} variant="secondary">
                {zone.zoneName || 'Unnamed zone'} • ${Number(zone.shippingCost || 0).toFixed(2)}
              </Badge>
            ))}
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

        <div className="space-y-4 border-t pt-4">
          <div className="flex justify-between items-center">
            <div>
              <Label>Shipping Zones</Label>
              <p className="text-sm text-muted-foreground">Define delivery zones, rate rules, and courier assignments.</p>
            </div>
            <Button variant="outline" size="sm" onClick={addShippingZone}>
              <Plus className="h-4 w-4 mr-1" />
              Add Zone
            </Button>
          </div>

          {formData.shippingZones.map((zone: ShippingZoneFormValue, index: number) => (
            <div key={zone.id} className="rounded-lg border p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">{zone.zoneName || `Zone ${index + 1}`}</Label>
                  <p className="text-xs text-muted-foreground">Configure the rules for this delivery zone.</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeShippingZone(index)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-sm">Zone Name</Label>
                  <Input
                    placeholder="e.g. Dili Metro"
                    value={zone.zoneName}
                    onChange={(e) => updateShippingZone(index, 'zoneName', e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-sm">Shipping Method</Label>
                  <Select
                    value={zone.shippingMethod ?? 'STANDARD'}
                    onValueChange={(value) => updateShippingZone(index, 'shippingMethod', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
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

                <div className="space-y-1">
                  <Label className="text-sm">Shipping Cost ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={zone.shippingCost ?? 0}
                    onChange={(e) => updateShippingZone(index, 'shippingCost', parseNumericValue(e.target.value))}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-sm">Status</Label>
                  <Select
                    value={zone.status ?? 'ACTIVE'}
                    onValueChange={(value) => updateShippingZone(index, 'status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {SHIPPING_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-sm">Province</Label>
                  <Select
                    value={zone.provinceId?.toString() ?? ''}
                    onValueChange={(value) => updateShippingZone(index, 'provinceId', value ? Number(value) : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select province" />
                    </SelectTrigger>
                    <SelectContent>
                      {provinces.map((province) => (
                        <SelectItem key={province.id} value={province.id.toString()}>
                          {province.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-sm">Municipality</Label>
                  <Select
                    value={zone.municipalityId?.toString() ?? ''}
                    onValueChange={(value) => updateShippingZone(index, 'municipalityId', value ? Number(value) : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select municipality" />
                    </SelectTrigger>
                    <SelectContent>
                      {(municipalitiesByZone[index] || []).map((municipality) => (
                        <SelectItem key={municipality.id} value={municipality.id.toString()}>
                          {municipality.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-sm">Courier</Label>
                  <Select
                    value={zone.courierId?.toString() ?? ''}
                    onValueChange={(value) => updateShippingZone(index, 'courierId', value ? Number(value) : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select courier" />
                    </SelectTrigger>
                    <SelectContent>
                      {couriers.map((courier) => (
                        <SelectItem key={courier.id} value={courier.id.toString()}>
                          {courier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-sm">Courier Service ID</Label>
                  <Input
                    type="number"
                    value={zone.courierServiceId ?? ''}
                    onChange={(e) => updateShippingZone(index, 'courierServiceId', parseOptionalNumber(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-sm">Courier Rate ID</Label>
                  <Input
                    type="number"
                    value={zone.courierRateId ?? ''}
                    onChange={(e) => updateShippingZone(index, 'courierRateId', parseOptionalNumber(e.target.value))}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-sm">Estimated Delivery Days</Label>
                  <Input
                    type="number"
                    value={zone.estimatedDeliveryDays ?? ''}
                    onChange={(e) => updateShippingZone(index, 'estimatedDeliveryDays', parseOptionalNumber(e.target.value))}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-sm">Min Weight</Label>
                  <Input
                    type="number"
                    value={zone.minimumWeight ?? ''}
                    onChange={(e) => updateShippingZone(index, 'minimumWeight', parseOptionalNumber(e.target.value))}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-sm">Max Weight</Label>
                  <Input
                    type="number"
                    value={zone.maximumWeight ?? ''}
                    onChange={(e) => updateShippingZone(index, 'maximumWeight', parseOptionalNumber(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-1 md:max-w-xs">
                <Label className="text-sm">Priority</Label>
                <Input
                  type="number"
                  value={zone.priority ?? 0}
                  onChange={(e) => updateShippingZone(index, 'priority', parseNumericValue(e.target.value))}
                />
              </div>
            </div>
          ))}

          <p className="text-xs text-muted-foreground">
            If no zone matches the customer address, the default shipping cost is used.
          </p>
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