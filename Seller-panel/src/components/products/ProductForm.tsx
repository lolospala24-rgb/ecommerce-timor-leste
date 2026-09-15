'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImageUpload } from '@/components/shared/ImageUpload';
import { useCategories } from '@/hooks/useCategories';
import { useCreateProduct, useUpdateProduct } from '@/hooks/useSellerProducts';
import { useAuthStore } from '@/stores/authStore';
import type { SellerProduct } from '@/types/product.types';

interface ProductFormProps {
  initialData?: SellerProduct;
}

export function ProductForm({ initialData }: ProductFormProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: categories } = useCategories();
  const isEdit = !!initialData;
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct(initialData?.id ?? 0);

  const [form, setForm] = useState({
    name: initialData?.name ?? '',
    nameTetum: initialData?.nameTetum ?? '',
    description: initialData?.description ?? '',
    price: initialData?.price?.toString() ?? '',
    comparePrice: initialData?.comparePrice?.toString() ?? '',
    cost: initialData?.cost?.toString() ?? '',
    stock: initialData?.stock?.toString() ?? '0',
    sku: initialData?.sku ?? '',
    brand: initialData?.brand ?? '',
    weight: initialData?.weight?.toString() ?? '',
    categoryId: initialData?.categoryId?.toString() ?? '',
    lowStockThreshold: initialData?.lowStockThreshold?.toString() ?? '10',
    isActive: initialData?.isActive ?? true,
    isFeatured: initialData?.isFeatured ?? false,
  });
  const [images, setImages] = useState<string[]>(initialData?.images ?? []);

  const isVerified = user?.seller?.isVerified ?? false;
  const isSaving = createProduct.isPending || updateProduct.isPending;

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name: form.name.trim(),
      nameTetum: form.nameTetum.trim() || undefined,
      description: form.description.trim(),
      price: Number(form.price),
      comparePrice: form.comparePrice ? Number(form.comparePrice) : undefined,
      cost: form.cost ? Number(form.cost) : undefined,
      stock: Number(form.stock),
      sku: form.sku.trim() || undefined,
      brand: form.brand.trim() || undefined,
      weight: form.weight ? Number(form.weight) : undefined,
      categoryId: Number(form.categoryId),
      lowStockThreshold: form.lowStockThreshold ? Number(form.lowStockThreshold) : undefined,
      isActive: form.isActive,
      isFeatured: form.isFeatured,
      images,
    };

    if (isEdit && initialData) {
      updateProduct.mutate(payload, {
        onSuccess: () => router.push(`/products/${initialData.id}`),
      });
    } else {
      createProduct.mutate(payload, {
        onSuccess: (product) => router.push(`/products/${product.id}`),
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!isEdit && !isVerified && (
        <div className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          Your store isn&apos;t verified yet. You can fill out this form, but creating the product will be rejected
          until an admin verifies your account.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-lg border bg-card p-5">
            <h3 className="mb-4 font-medium">Basic Information</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Product name *</Label>
                  <Input id="name" required minLength={3} maxLength={200} value={form.name} onChange={(e) => set('name', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nameTetum">Name (Tetum)</Label>
                  <Input id="nameTetum" maxLength={200} value={form.nameTetum} onChange={(e) => set('nameTetum', e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  required
                  minLength={20}
                  maxLength={5000}
                  rows={5}
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="sku">SKU</Label>
                  <Input id="sku" maxLength={100} value={form.sku} onChange={(e) => set('sku', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="brand">Brand</Label>
                  <Input id="brand" maxLength={100} value={form.brand} onChange={(e) => set('brand', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input id="weight" type="number" step="0.01" min="0" value={form.weight} onChange={(e) => set('weight', e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-5">
            <h3 className="mb-4 font-medium">Media</h3>
            <ImageUpload images={images} setImages={setImages} maxImages={10} />
          </div>

          <div className="rounded-lg border bg-card p-5">
            <h3 className="mb-4 font-medium">Pricing & Inventory</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="price">Price (USD) *</Label>
                <Input id="price" type="number" required min="0.01" step="0.01" value={form.price} onChange={(e) => set('price', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="comparePrice">Compare-at price</Label>
                <Input id="comparePrice" type="number" min="0" step="0.01" value={form.comparePrice} onChange={(e) => set('comparePrice', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stock">Stock *</Label>
                <Input id="stock" type="number" required min="0" step="1" value={form.stock} onChange={(e) => set('stock', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lowStockThreshold">Low stock alert below</Label>
                <Input
                  id="lowStockThreshold"
                  type="number"
                  min="0"
                  step="1"
                  value={form.lowStockThreshold}
                  onChange={(e) => set('lowStockThreshold', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-5">
            <h3 className="mb-4 font-medium">Status</h3>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground">Visible to shoppers</p>
              </div>
              <Switch checked={form.isActive} onCheckedChange={(v) => set('isActive', v)} />
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">Featured</p>
                <p className="text-xs text-muted-foreground">Highlight on your storefront</p>
              </div>
              <Switch checked={form.isFeatured} onCheckedChange={(v) => set('isFeatured', v)} />
            </div>
          </div>

          <div className="rounded-lg border bg-card p-5">
            <h3 className="mb-4 font-medium">Category</h3>
            <Select value={form.categoryId} onValueChange={(v) => set('categoryId', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Button type="submit" disabled={isSaving || !form.categoryId}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isEdit ? 'Save Changes' : 'Publish Product'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSaving}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
