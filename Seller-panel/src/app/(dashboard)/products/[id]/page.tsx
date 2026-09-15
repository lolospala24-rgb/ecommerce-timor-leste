'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ProductForm } from '@/components/products/ProductForm';
import { VariantManager } from '@/components/products/VariantManager';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useDeleteProduct, useSellerProduct, useUpdateStock } from '@/hooks/useSellerProducts';

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const { data: product, isLoading } = useSellerProduct(id);
  const deleteProduct = useDeleteProduct();
  const updateStock = useUpdateStock();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [stockDelta, setStockDelta] = useState('');

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Product not found.{' '}
        <Link href="/products" className="text-primary hover:underline">
          Back to products
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link href="/products" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to products
      </Link>
      <PageHeader
        title={product.name}
        description={`Product #${product.id} — ${product.stock} in stock`}
        action={
          <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        }
      />

      <div className="mb-6 rounded-lg border bg-card p-5">
        <h3 className="mb-3 font-medium">Quick Stock Adjustment</h3>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="number"
            placeholder="Quantity"
            className="w-32"
            value={stockDelta}
            onChange={(e) => setStockDelta(e.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            disabled={!stockDelta || updateStock.isPending}
            onClick={() => updateStock.mutate({ id: product.id, quantity: Number(stockDelta), type: 'add' }, { onSuccess: () => setStockDelta('') })}
          >
            {updateStock.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add to stock'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!stockDelta || updateStock.isPending}
            onClick={() =>
              updateStock.mutate({ id: product.id, quantity: Number(stockDelta), type: 'subtract' }, { onSuccess: () => setStockDelta('') })
            }
          >
            Subtract
          </Button>
          <span className="text-sm text-muted-foreground">Current: {product.stock} units</span>
        </div>
      </div>

      <ProductForm initialData={product} />

      <div className="mt-6">
        <VariantManager productId={product.id} baseSku={product.sku} />
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete product?"
        description={`"${product.name}" will be permanently removed. This can't be undone if it has no order history.`}
        confirmText="Delete"
        isLoading={deleteProduct.isPending}
        onConfirm={() => deleteProduct.mutate(product.id, { onSuccess: () => router.push('/products') })}
      />
    </div>
  );
}
