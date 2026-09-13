'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAddresses } from '@/hooks/useAddresses';

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

export default function EditAddressPage() {
  const params = useParams();
  const router = useRouter();
  const addressId = parseInt(params.id as string);
  const { addresses, isLoading } = useAddresses();

  const address = addresses?.find((a: any) => a.id === addressId);

  if (isLoading) {
    return <DialogSkeleton />;
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
    <AddressForm
      initialData={address}
      onSuccess={handleSuccess}
      onCancel={() => router.back()}
    />
  );
}
