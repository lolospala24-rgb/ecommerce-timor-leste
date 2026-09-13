'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

// AddressForm renders itself as a Dialog (header/body/footer included) —
// pulls in @react-google-maps/api (~130KB) for its address search box, so
// it's code-split to keep that weight out of this route's initial JS. Same
// pattern as GoogleMapPicker in the checkout flow.
const AddressForm = dynamic(
  () => import('@/components/checkout/AddressForm').then((mod) => mod.AddressForm),
  { ssr: false, loading: () => <DialogSkeleton /> },
);

function DialogSkeleton() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <Skeleton className="h-[600px] w-full max-w-[860px] rounded-lg" />
    </div>
  );
}

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
    <AddressForm
      initialData={hasPrefill ? prefillData : undefined}
      onSuccess={() => router.push(redirectTo)}
      onCancel={() => router.back()}
    />
  );
}

export default function NewAddressPage() {
  return (
    <Suspense fallback={<DialogSkeleton />}>
      <NewAddressContent />
    </Suspense>
  );
}
