'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Camera, Loader2, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StoreTabsNav } from '@/components/store/StoreTabsNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useMyStore, useUpdateMyStore, useUploadStoreBanner, useUploadStoreLogo } from '@/hooks/useSellerStore';

export default function StoreProfilePage() {
  const { data: store, isLoading } = useMyStore();
  const updateStore = useUpdateMyStore();
  const uploadLogo = useUploadStoreLogo();
  const uploadBanner = useUploadStoreBanner();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ storeName: '', description: '', storePhone: '', storeEmail: '' });

  useEffect(() => {
    if (store) {
      setForm({
        storeName: store.storeName || '',
        description: store.description || '',
        storePhone: store.storePhone || '',
        storeEmail: store.storeEmail || '',
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

  return (
    <div>
      <PageHeader
        title="My Store"
        description="How your store looks and what customers can reach you at."
        action={
          store.isVerified ? (
            <Badge className="gap-1 border-0 bg-success/15 text-success">
              <ShieldCheck className="h-3.5 w-3.5" /> Verified
            </Badge>
          ) : (
            <Badge className="gap-1 border-0 bg-warning/15 text-warning">
              <ShieldQuestion className="h-3.5 w-3.5" /> Pending verification
            </Badge>
          )
        }
      />
      <StoreTabsNav />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-lg border bg-card p-5">
            <h3 className="mb-4 font-medium">Branding</h3>

            <div className="relative mb-14 h-36 overflow-hidden rounded-lg bg-muted sm:h-44">
              {store.storeBanner && <Image src={store.storeBanner} alt="Banner" fill unoptimized className="object-cover" />}
              <button
                type="button"
                onClick={() => bannerInputRef.current?.click()}
                disabled={uploadBanner.isPending}
                className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-md bg-black/60 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur hover:bg-black/70"
              >
                {uploadBanner.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                Change banner
              </button>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadBanner.mutate(e.target.files[0])}
              />

              <div className="absolute -bottom-12 left-4 h-24 w-24 overflow-hidden rounded-full border-4 border-card bg-muted">
                {store.storeLogo && <Image src={store.storeLogo} alt="Logo" fill unoptimized className="object-cover" />}
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadLogo.isPending}
                  className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition-opacity hover:bg-black/40 hover:opacity-100"
                >
                  {uploadLogo.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                </button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadLogo.mutate(e.target.files[0])}
                />
              </div>
            </div>
          </div>

          <form
            className="space-y-4 rounded-lg border bg-card p-5"
            onSubmit={(e) => {
              e.preventDefault();
              updateStore.mutate(form);
            }}
          >
            <h3 className="font-medium">Store Information</h3>
            <div className="space-y-1.5">
              <Label htmlFor="storeName">Store name</Label>
              <Input
                id="storeName"
                minLength={2}
                maxLength={100}
                value={form.storeName}
                onChange={(e) => setForm((f) => ({ ...f, storeName: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={4}
                maxLength={1000}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="storePhone">Store phone</Label>
                <Input
                  id="storePhone"
                  value={form.storePhone}
                  onChange={(e) => setForm((f) => ({ ...f, storePhone: e.target.value }))}
                  placeholder="+670…"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="storeEmail">Store email</Label>
                <Input
                  id="storeEmail"
                  type="email"
                  value={form.storeEmail}
                  onChange={(e) => setForm((f) => ({ ...f, storeEmail: e.target.value }))}
                />
              </div>
            </div>
            <Button type="submit" disabled={updateStore.isPending}>
              {updateStore.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </form>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Customer preview</p>
          <div className="overflow-hidden rounded-lg border bg-card">
            <div className="relative h-24 bg-muted">
              {store.storeBanner && <Image src={store.storeBanner} alt="" fill unoptimized className="object-cover" />}
            </div>
            <div className="relative px-4 pb-4 pt-10">
              <div className="absolute -top-8 left-4 h-16 w-16 overflow-hidden rounded-full border-4 border-card bg-muted">
                {store.storeLogo && <Image src={store.storeLogo} alt="" fill unoptimized className="object-cover" />}
              </div>
              <p className="font-semibold">{form.storeName || 'Your Store'}</p>
              <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{form.description || 'Add a description so shoppers know what you sell.'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
