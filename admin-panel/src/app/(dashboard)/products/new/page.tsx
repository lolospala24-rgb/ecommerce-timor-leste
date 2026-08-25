'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ProductForm } from '../components/ProductForm';

export default function NewProductPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/products')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add New Product</h1>
          <p className="text-muted-foreground">
            Create a product with everything it needs — media, variants, specifications, pricing, shipping and SEO — in one place.
          </p>
        </div>
      </div>

      <ProductForm
        onSuccess={() => router.push('/products')}
        onCancel={() => router.push('/products')}
      />
    </div>
  );
}
