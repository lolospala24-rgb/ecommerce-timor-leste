'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// AddressForm pulls in @react-google-maps/api (~130KB) for its address
// search box — code-split so that weight isn't part of this route's
// initial JS. Same pattern as GoogleMapPicker in the checkout flow.
const AddressForm = dynamic(
  () => import('@/components/checkout/AddressForm').then((mod) => mod.AddressForm),
  { ssr: false, loading: () => <Skeleton className="h-96 w-full" /> },
);

function NewAddressContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // A redirect target is only honored when it points back into this app,
  // so an address created directly (no map-picker prefill) lands on the
  // address list instead of an arbitrary external URL.
  const redirectParam = searchParams.get('redirect');
  const redirectTo = redirectParam && redirectParam.startsWith('/') ? redirectParam : '/account/addresses';

  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  const prefillData = {
    street: searchParams.get('street') || undefined,
    village: searchParams.get('village') || undefined,
    suco: searchParams.get('suco') || undefined,
    postoAdmin: searchParams.get('postoAdmin') || undefined,
    municipality: searchParams.get('municipality') || undefined,
    placeName: searchParams.get('placeName') || undefined,
    latitude: lat ? Number(lat) : undefined,
    longitude: lng ? Number(lng) : undefined,
  };
  const hasPrefill = Object.values(prefillData).some((value) => value !== undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Address</CardTitle>
        <CardDescription>Add a new delivery address. Select municipality from shipping zones.</CardDescription>
      </CardHeader>
      <CardContent>
        <AddressForm
          initialData={hasPrefill ? prefillData : undefined}
          onSuccess={() => router.push(redirectTo)}
          onCancel={() => router.back()}
        />
      </CardContent>
    </Card>
  );
}

export default function NewAddressPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <NewAddressContent />
    </Suspense>
  );
}
