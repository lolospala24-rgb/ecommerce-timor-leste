'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAddresses } from '@/hooks/useAddresses';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Pencil, Trash2, Plus, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import api from '@/lib/api';
import { AccountAppBar } from '@/components/account/AccountAppBar';
import { StatusPill } from '@/components/account/StatusPill';
import { cn } from '@/lib/utils';

export default function AddressesPage() {
  const { addresses, isLoading, refetch } = useAddresses();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await api.delete(`/addresses/${deleteId}`);
      toast.success('Enderesu hamoos ona');
      refetch();
    } catch (error) {
      toast.error('La konsege hamoos enderesu');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleSetPrimary = async (id: number) => {
    try {
      await api.patch(`/addresses/${id}/primary`);
      toast.success('Enderesu prinsipál atualiza ona');
      refetch();
    } catch (error) {
      toast.error('La konsege atualiza enderesu prinsipál');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <AccountAppBar title="Enderesu" backHref="/account" />
        {[...Array(2)].map((_, i) => (
          <Skeleton key={i} className="h-36 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <AccountAppBar title="Enderesu" backHref="/account" />

      {addresses?.length === 0 ? (
        <div className="rounded-2xl border py-12 text-center">
          <MapPin className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-medium">Seidauk iha enderesu</h3>
          <p className="text-muted-foreground">Aumenta ita-nia enderesu entrega uluk liu</p>
          <Button className="mt-4" asChild>
            <Link href="/account/addresses/new">Aumenta enderesu</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses?.map((address: any) => (
            <div
              key={address.id}
              className={cn(
                'space-y-2 rounded-2xl border bg-card p-4',
                address.isPrimary && 'border-2 border-primary',
              )}
            >
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <MapPin className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{address.label || 'Enderesu'}</h3>
                    {address.isPrimary && <StatusPill label="Prinsipál" tone="success" />}
                  </div>
                  {address.recipientName && (
                    <p className="text-sm text-foreground">
                      {address.recipientName}
                      {address.phone ? ` · +670 ${address.phone.replace(/^\+670\s*/, '')}` : ''}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {[address.street, address.village, address.suco, address.postoAdmin, address.municipality]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                  {address.reference && (
                    <p className="text-sm text-muted-foreground">Besik: {address.reference}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button variant="outline" size="sm" className="gap-1.5" asChild>
                  <Link href={`/account/addresses/${address.id}/edit`}>
                    <Pencil className="h-3.5 w-3.5" />
                    Edita
                  </Link>
                </Button>
                {!address.isPrimary && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Hamoos enderesu"
                      onClick={() => setDeleteId(address.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(address.id)}
                      className="ml-auto text-sm font-semibold text-primary underline-offset-2 hover:underline"
                    >
                      Halo prinsipál
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-start gap-2 rounded-xl bg-primary/5 p-3 text-sm text-primary">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Enderesu prinsipál sei hili automátiku iha checkout.</span>
      </div>

      <div className="sticky bottom-0 -mx-4 bg-background px-4 pb-1 pt-3 md:static md:mx-0 md:px-0">
        <Button className="w-full gap-2" asChild>
          <Link href="/account/addresses/new">
            <Plus className="h-4 w-4" />
            Aumenta enderesu foun
          </Link>
        </Button>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Hamoos enderesu"
        description="Ita boot iha serteza katak atu hamoos enderesu ida-ne'e? Asaun ida-ne'e labele troka fali."
        confirmText="Hamoos"
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}
