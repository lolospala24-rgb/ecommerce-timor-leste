'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { useAddresses } from '@/hooks/useAddresses';
import { AddressForm } from '@/components/checkout/AddressForm';

export default function EditAddressPage() {
  const params = useParams();
  const router = useRouter();
  const addressId = parseInt(params.id as string);
  const { addresses, isLoading } = useAddresses();

  const address = addresses?.find((a: any) => a.id === addressId);

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!address) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Address Not Found</h2>
        <Button className="mt-4" asChild>
          <Link href="/account/addresses">Back to Addresses</Link>
        </Button>
      </div>
    );
  }

  const handleSuccess = () => router.push('/account/addresses');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <CardTitle>Edit Address</CardTitle>
            <CardDescription>Update your delivery address</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <AddressForm initialData={address} onSuccess={handleSuccess} />
      </CardContent>
    </Card>
  );
}
