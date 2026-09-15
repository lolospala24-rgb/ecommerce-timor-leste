'use client';

import { useEffect, useState } from 'react';
import { Loader2, Landmark, ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StoreTabsNav } from '@/components/store/StoreTabsNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyStore, useUpdateMyStore } from '@/hooks/useSellerStore';

export default function StoreSettingsPage() {
  const { data: store, isLoading } = useMyStore();
  const updateStore = useUpdateMyStore();

  const [form, setForm] = useState({ bankName: '', bankAccountName: '', bankAccountNumber: '' });

  useEffect(() => {
    if (store) {
      setForm({
        bankName: store.bankName || '',
        bankAccountName: store.bankAccountName || '',
        bankAccountNumber: store.bankAccountNumber || '',
      });
    }
  }, [store]);

  if (isLoading || !store) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="My Store" description="Payout and account settings." />
      <StoreTabsNav />

      {store.rejectionReason && (
        <div className="mb-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-medium">Your store was rejected</p>
            <p>{store.rejectionReason}</p>
          </div>
        </div>
      )}

      <form
        className="max-w-xl space-y-4 rounded-lg border bg-card p-5"
        onSubmit={(e) => {
          e.preventDefault();
          updateStore.mutate(form);
        }}
      >
        <h3 className="flex items-center gap-2 font-medium">
          <Landmark className="h-4 w-4 text-muted-foreground" /> Bank Details
        </h3>
        <p className="text-sm text-muted-foreground">Required before you can request a payout.</p>

        <div className="space-y-1.5">
          <Label htmlFor="bankName">Bank name</Label>
          <Input id="bankName" maxLength={100} value={form.bankName} onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bankAccountName">Account holder name</Label>
          <Input
            id="bankAccountName"
            maxLength={100}
            value={form.bankAccountName}
            onChange={(e) => setForm((f) => ({ ...f, bankAccountName: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bankAccountNumber">Account number</Label>
          <Input
            id="bankAccountNumber"
            maxLength={50}
            value={form.bankAccountNumber}
            onChange={(e) => setForm((f) => ({ ...f, bankAccountNumber: e.target.value }))}
          />
        </div>

        <Button type="submit" disabled={updateStore.isPending}>
          {updateStore.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save Changes
        </Button>
      </form>
    </div>
  );
}
