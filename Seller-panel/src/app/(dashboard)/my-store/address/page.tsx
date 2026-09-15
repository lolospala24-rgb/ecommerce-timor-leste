'use client';

import { useEffect, useState } from 'react';
import { Loader2, MapPin, LocateFixed } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/shared/PageHeader';
import { StoreTabsNav } from '@/components/store/StoreTabsNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyStore, useUpdateMyStore } from '@/hooks/useSellerStore';

export default function StoreAddressPage() {
  const { data: store, isLoading } = useMyStore();
  const updateStore = useUpdateMyStore();
  const [locating, setLocating] = useState(false);

  const [form, setForm] = useState({
    storeAddress: '',
    storeLatitude: '',
    storeLongitude: '',
    originMunicipality: '',
    originPostoAdmin: '',
    originSuco: '',
    originAldeia: '',
  });

  useEffect(() => {
    if (store) {
      setForm({
        storeAddress: store.storeAddress || '',
        storeLatitude: store.storeLatitude?.toString() || '',
        storeLongitude: store.storeLongitude?.toString() || '',
        originMunicipality: store.originMunicipality || '',
        originPostoAdmin: store.originPostoAdmin || '',
        originSuco: store.originSuco || '',
        originAldeia: store.originAldeia || '',
      });
    }
  }, [store]);

  if (isLoading || !store) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          storeLatitude: pos.coords.latitude.toFixed(6),
          storeLongitude: pos.coords.longitude.toFixed(6),
        }));
        setLocating(false);
      },
      () => {
        toast.error('Could not get your location');
        setLocating(false);
      },
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateStore.mutate({
      storeAddress: form.storeAddress,
      storeLatitude: form.storeLatitude ? Number(form.storeLatitude) : undefined,
      storeLongitude: form.storeLongitude ? Number(form.storeLongitude) : undefined,
      originMunicipality: form.originMunicipality || undefined,
      originPostoAdmin: form.originPostoAdmin || undefined,
      originSuco: form.originSuco || undefined,
      originAldeia: form.originAldeia || undefined,
    });
  };

  return (
    <div>
      <PageHeader title="My Store" description="Where your store operates from." />
      <StoreTabsNav />

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <div className="space-y-4 rounded-lg border bg-card p-5">
          <h3 className="flex items-center gap-2 font-medium">
            <MapPin className="h-4 w-4 text-muted-foreground" /> Pickup Address
          </h3>
          <div className="space-y-1.5">
            <Label htmlFor="storeAddress">Full address</Label>
            <Textarea
              id="storeAddress"
              rows={3}
              minLength={10}
              value={form.storeAddress}
              onChange={(e) => setForm((f) => ({ ...f, storeAddress: e.target.value }))}
              placeholder="Street, suco, municipality…"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="lat">Latitude</Label>
              <Input id="lat" type="number" step="any" value={form.storeLatitude} onChange={(e) => setForm((f) => ({ ...f, storeLatitude: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lng">Longitude</Label>
              <Input id="lng" type="number" step="any" value={form.storeLongitude} onChange={(e) => setForm((f) => ({ ...f, storeLongitude: e.target.value }))} />
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={useCurrentLocation} disabled={locating}>
            {locating ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="mr-2 h-3.5 w-3.5" />}
            Use my current location
          </Button>
        </div>

        <div className="space-y-4 rounded-lg border bg-card p-5">
          <h3 className="font-medium">Origin (for &quot;Locally Made&quot; products)</h3>
          <p className="text-sm text-muted-foreground">
            Used as the default origin when you mark a product as locally made without a custom origin.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="originMunicipality">Municipality</Label>
              <Input id="originMunicipality" value={form.originMunicipality} onChange={(e) => setForm((f) => ({ ...f, originMunicipality: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="originPostoAdmin">Posto Administrativo</Label>
              <Input id="originPostoAdmin" value={form.originPostoAdmin} onChange={(e) => setForm((f) => ({ ...f, originPostoAdmin: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="originSuco">Suco</Label>
              <Input id="originSuco" value={form.originSuco} onChange={(e) => setForm((f) => ({ ...f, originSuco: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="originAldeia">Aldeia</Label>
              <Input id="originAldeia" value={form.originAldeia} onChange={(e) => setForm((f) => ({ ...f, originAldeia: e.target.value }))} />
            </div>
          </div>
        </div>

        <Button type="submit" disabled={updateStore.isPending}>
          {updateStore.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save Changes
        </Button>
      </form>
    </div>
  );
}
