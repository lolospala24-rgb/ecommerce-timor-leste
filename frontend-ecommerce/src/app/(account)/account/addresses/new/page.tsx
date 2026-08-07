'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AddressForm } from '@/components/checkout/AddressForm';

export default function NewAddressPage() {
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Address</CardTitle>
        <CardDescription>Add a new delivery address. Select municipality from shipping zones.</CardDescription>
      </CardHeader>
      <CardContent>
        <AddressForm onSuccess={() => router.push('/checkout')} onCancel={() => router.back()} />
      </CardContent>
    </Card>
  );
}
