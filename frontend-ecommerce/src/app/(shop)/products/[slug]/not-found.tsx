import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ProductNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-bold">Product Not Found</h1>
      <p className="mt-2 max-w-sm text-muted-foreground">
        The product you&apos;re looking for doesn&apos;t exist or has been removed.
      </p>
      <Button className="mt-6" asChild>
        <Link href="/products">Browse Products</Link>
      </Button>
    </div>
  );
}
