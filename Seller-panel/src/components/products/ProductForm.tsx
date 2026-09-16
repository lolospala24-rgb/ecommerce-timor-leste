'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Plus, X, ListChecks, Shapes } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImageUpload } from '@/components/shared/ImageUpload';
import { useCategories } from '@/hooks/useCategories';
import { useProductTypes } from '@/hooks/useProductTypes';
import { useCreateProduct, useUpdateProduct } from '@/hooks/useSellerProducts';
import { useAuthStore } from '@/stores/authStore';
import { parseProductTypeFields } from '@/lib/productType';
import { RequestProductTypeDialog } from '@/components/products/RequestProductTypeDialog';
import type { SellerProduct } from '@/types/product.types';

type SpecRow = { key: string; value: string };

const toSpecRows = (specifications?: Record<string, unknown> | null): SpecRow[] => {
  const entries = Object.entries(specifications ?? {}).map(([key, value]) => ({
    key,
    value: String(value ?? ''),
  }));
  return entries.length > 0 ? entries : [{ key: '', value: '' }];
};

interface ProductFormProps {
  initialData?: SellerProduct;
}

export function ProductForm({ initialData }: ProductFormProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: categories } = useCategories();
  const { data: productTypes } = useProductTypes();
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
    typeId: initialData?.typeId?.toString() ?? '',
    lowStockThreshold: initialData?.lowStockThreshold?.toString() ?? '10',
    isActive: initialData?.isActive ?? true,
    isFeatured: initialData?.isFeatured ?? false,
  });
  const [images, setImages] = useState<string[]>(initialData?.images ?? []);
  const [specRows, setSpecRows] = useState<SpecRow[]>(() => toSpecRows(initialData?.specifications));
  const [requestTypeOpen, setRequestTypeOpen] = useState(false);

  const selectedType = productTypes?.find((t) => t.id === Number(form.typeId));
  // Advisory quick-add chips only — never forces a type's fields into the
  // rows below, so a seller's own custom specs are never silently
  // overwritten just by picking (or switching) a product type.
  const suggestedSpecFields = useMemo(() => parseProductTypeFields(selectedType?.specFields), [selectedType]);
  const existingSpecKeys = new Set(specRows.map((r) => r.key.trim().toLowerCase()).filter(Boolean));
  const availableSpecSuggestions = suggestedSpecFields.filter((f) => !existingSpecKeys.has(f.key.toLowerCase()));

  const addSuggestedSpec = (key: string) => {
    setSpecRows((prev) => {
      if (prev.length === 1 && !prev[0].key.trim() && !prev[0].value.trim()) {
        return [{ key, value: '' }];
      }
      return [...prev, { key, value: '' }];
    });
  };

  const isVerified = user?.seller?.isVerified ?? false;
  const isSaving = createProduct.isPending || updateProduct.isPending;

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const specifications = specRows.reduce<Record<string, string>>((acc, row) => {
      const key = row.key.trim();
      const value = row.value.trim();
      if (key && value) acc[key] = value;
      return acc;
    }, {});

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
      typeId: form.typeId ? Number(form.typeId) : undefined,
      specifications: Object.keys(specifications).length > 0 ? specifications : undefined,
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

          <div className="rounded-lg border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium">Specifications</h3>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              General details shown on the product page (e.g. Material, Country of Origin) — separate from variant options like Color or Size.
            </p>

            {availableSpecSuggestions.length > 0 && (
              <div className="mb-4 space-y-2">
                <Label className="text-xs text-muted-foreground">Suggested for {selectedType?.name}</Label>
                <div className="flex flex-wrap gap-2">
                  {availableSpecSuggestions.map((field) => (
                    <Badge
                      key={field.key}
                      variant="secondary"
                      className="cursor-pointer hover:bg-secondary/70"
                      onClick={() => addSuggestedSpec(field.key)}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      {field.label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {specRows.map((row, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    placeholder="Field (e.g. Material)"
                    value={row.key}
                    onChange={(e) => {
                      const next = [...specRows];
                      next[idx] = { ...next[idx], key: e.target.value };
                      setSpecRows(next);
                    }}
                  />
                  <Input
                    placeholder="Value (e.g. 100% Cotton)"
                    value={row.value}
                    onChange={(e) => {
                      const next = [...specRows];
                      next[idx] = { ...next[idx], value: e.target.value };
                      setSpecRows(next);
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0"
                    onClick={() => setSpecRows(specRows.filter((_, i) => i !== idx))}
                    disabled={specRows.length === 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSpecRows([...specRows, { key: '', value: '' }])}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Field
              </Button>
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

          <div className="rounded-lg border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Shapes className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium">Product Type</h3>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              Optional — picking a type suggests matching fields below and for variants.
            </p>
            <Select value={form.typeId || 'none'} onValueChange={(v) => set('typeId', v === 'none' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="No specific type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific type</SelectItem>
                {productTypes?.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="mt-2.5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setRequestTypeOpen(true)}
                className="text-xs font-medium text-primary hover:underline"
              >
                Don&apos;t see your type? Request one
              </button>
              <Link href="/products/type-requests" className="text-xs text-muted-foreground hover:underline">
                My requests
              </Link>
            </div>
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

      <RequestProductTypeDialog open={requestTypeOpen} onOpenChange={setRequestTypeOpen} />
    </form>
  );
}
