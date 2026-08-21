'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAddresses } from '@/hooks/useAddresses';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Plus, Edit, Trash2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import api from '@/lib/api';

export default function AddressesPage() {
  const { addresses, isLoading, refetch } = useAddresses();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await api.delete(`/addresses/${deleteId}`);
      toast.success('Address deleted successfully');
      refetch();
    } catch (error) {
      toast.error('Failed to delete address');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleSetPrimary = async (id: number) => {
    try {
      await api.patch(`/addresses/${id}/primary`);
      toast.success('Primary address updated');
      refetch();
    } catch (error) {
      toast.error('Failed to update primary address');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        {[...Array(2)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Addresses</h1>
          <p className="text-muted-foreground">Manage your delivery addresses</p>
        </div>
        <Button asChild>
          <Link href="/account/addresses/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Address
          </Link>
        </Button>
      </div>

      {addresses?.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No Addresses</h3>
          <p className="text-muted-foreground">Add your first delivery address</p>
          <Button className="mt-4" asChild>
            <Link href="/account/addresses/new">Add Address</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {addresses?.map((address: any) => (
            <Card key={address.id} className="relative">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">
                        {address.label || 'Address'}
                      </h3>
                      {address.isPrimary && (
                        <Badge className="bg-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Primary
                        </Badge>
                      )}
                    </div>
                    {address.recipientName && (
                      <p className="text-sm font-medium">Recipient: {address.recipientName}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {address.street && `${address.street}, `}
                      {address.village && `${address.village}, `}
                      {address.suco}, {address.postoAdmin}, {address.municipality}
                    </p>
                    {address.reference && (
                      <p className="text-sm text-muted-foreground">
                        Reference: {address.reference}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Phone: {address.phone}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!address.isPrimary && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetPrimary(address.id)}
                      >
                        Set Primary
                      </Button>
                    )}
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/account/addresses/${address.id}/edit`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    {!address.isPrimary && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteId(address.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Address"
        description="Are you sure you want to delete this address? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}