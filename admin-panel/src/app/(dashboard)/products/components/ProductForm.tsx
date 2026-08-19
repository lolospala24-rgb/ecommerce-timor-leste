'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageUpload } from '@/components/shared/ImageUpload';
import { useCategories } from '@/hooks/useCategories';
import { useSellers } from '@/hooks/useSellers';
import { useProductTypes } from '@/hooks/useProductTypes';
import { useAuthStore } from '@/stores/authStore';
import { fieldsToNameList } from '@/lib/productType';
import { previewSlug } from '@/lib/slug';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Loader2, AlertCircle, Plus, X, ListChecks, Layers, TrendingUp, Wand2 } from 'lucide-react';

const productSchema = z.object({
  name: z.string().min(3, 'Product name must be at least 3 characters'),
  nameTetum: z.string().optional(),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  descriptionTetum: z.string().optional(),
  brand: z.string().optional(),
  price: z.number().min(0, 'Price must be positive'),
  comparePrice: z.number().optional().nullable(),
  cost: z.number().optional().nullable(),
  stock: z.number().min(0, 'Stock must be positive'),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  videoUrl: z.union([z.literal(''), z.string().url('Please enter a valid video URL')]).optional(),
  weight: z.number().optional().nullable(),
  categoryId: z.number().min(1, 'Please select a category'),
  subCategoryId: z.number().optional().nullable(),
  sellerId: z.number().min(1, 'Please select a seller'),
  typeId: z.number().optional().nullable(),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  slug: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;
type SpecRow = { key: string; value: string };

interface ProductFormProps {
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

const specsToRows = (specifications?: Record<string, unknown> | null): SpecRow[] => {
  const entries = Object.entries(specifications ?? {}).map(([key, value]) => ({
    key,
    value: String(value ?? ''),
  }));
  return entries.length > 0 ? entries : [{ key: '', value: '' }];
};

export function ProductForm({ initialData, onSuccess, onCancel }: ProductFormProps) {
  const [images, setImages] = useState<string[]>(initialData?.images || []);
  const [specRows, setSpecRows] = useState<SpecRow[]>(() => specsToRows(initialData?.specifications));
  const [isLoading, setIsLoading] = useState(false);
  const [sellerError, setSellerError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const { data: categories } = useCategories({ page: 1, limit: 100 });
  const { data: sellers } = useSellers({ page: 1, limit: 100, isVerified: true });
  const { data: productTypes } = useProductTypes();
  const { user, isAuthenticated } = useAuthStore();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: initialData?.name || '',
      nameTetum: initialData?.nameTetum || '',
      description: initialData?.description || '',
      descriptionTetum: initialData?.descriptionTetum || '',
      brand: initialData?.brand || '',
      price: initialData?.price ?? 0,
      comparePrice: initialData?.comparePrice ?? null,
      cost: initialData?.cost ?? null,
      stock: initialData?.stock ?? 0,
      sku: initialData?.sku || '',
      barcode: initialData?.barcode || '',
      videoUrl: initialData?.videoUrl || '',
      weight: initialData?.weight ?? null,
      categoryId: initialData?.categoryId || undefined,
      subCategoryId: initialData?.subCategoryId || undefined,
      sellerId: initialData?.sellerId || undefined,
      typeId: initialData?.type?.id ?? initialData?.typeId ?? null,
      isActive: initialData?.isActive ?? true,
      isFeatured: initialData?.isFeatured ?? false,
      slug: initialData?.slug || '',
    },
  });

  // Auto-assign seller for seller accounts
  useEffect(() => {
    if (user?.role === 'SELLER' && user.seller?.id) {
      setValue('sellerId', user.seller.id);
    }
  }, [user, setValue]);

  // The backend only has a single `categoryId` — a "sub-category" is just a
  // Category row whose `parentId` points at another Category. When editing
  // a product whose category is itself a child, split it back into the two
  // selects: the parent goes in `categoryId` (drives the top select) and the
  // actual saved category goes in `subCategoryId` (drives the sub select).
  useEffect(() => {
    if (!initialData?.categoryId || !categories?.data?.length) return;
    const savedCategory = categories.data.find((c: any) => c.id === initialData.categoryId);
    if (savedCategory?.parentId) {
      setValue('categoryId', savedCategory.parentId);
      setValue('subCategoryId', savedCategory.id);
    }
  }, [initialData?.categoryId, categories?.data, setValue]);

  // Check if user has seller role
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role !== 'SELLER' && user.role !== 'ADMIN') {
        setSellerError('You must be a seller to create products. Please register as a seller first.');
      } else if (user.role === 'SELLER') {
        // Check if seller is verified
        const sellerProfile = sellers?.data?.find((s: any) => s.userId === user.id);
        if (sellerProfile && !sellerProfile.isVerified) {
          setSellerError('Your seller account is pending verification. Please wait for admin approval.');
        } else {
          setSellerError(null);
        }
      }
    }
  }, [user, isAuthenticated, sellers]);

  const selectedCategoryId = watch('categoryId');
  const selectedSubCategoryId = watch('subCategoryId');
  const subcategories = categories?.data?.filter((category: any) => category.parentId === selectedCategoryId) || [];
  const selectedCategoryName = categories?.data?.find((category: any) => category.id === selectedCategoryId)?.name || '';

  useEffect(() => {
    if (selectedSubCategoryId && !subcategories.some((subcategory: any) => subcategory.id === selectedSubCategoryId)) {
      setValue('subCategoryId', undefined);
    }
  }, [selectedSubCategoryId, subcategories, setValue]);

  const productTypeList: any[] = Array.isArray(productTypes)
    ? productTypes
    : Array.isArray((productTypes as any)?.data)
    ? (productTypes as any).data
    : [];
  const selectedTypeId = watch('typeId');
  const selectedType = productTypeList.find((t) => t.id === selectedTypeId);
  const typeFieldNames = fieldsToNameList(selectedType?.fields);

  // Specification row helpers
  const handleSpecRowChange = (index: number, field: 'key' | 'value', value: string) => {
    setSpecRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };
  const handleAddSpecRow = () => setSpecRows((prev) => [...prev, { key: '', value: '' }]);
  const handleRemoveSpecRow = (index: number) => setSpecRows((prev) => prev.filter((_, i) => i !== index));

  // Live helpers
  const nameValue = watch('name');
  const slugValue = watch('slug');
  const slugPreview = slugValue?.trim() ? previewSlug(slugValue) : previewSlug(nameValue || '');
  const slugChangedFromSaved = !!(initialData?.slug && slugValue?.trim() && slugPreview !== initialData.slug);
  const descriptionValue = watch('description') || '';
  const descriptionTetumValue = watch('descriptionTetum') || '';
  const priceValue = watch('price');
  const costValue = watch('cost');
  const margin = useMemo(() => {
    if (!priceValue || !costValue || costValue <= 0) return null;
    const profit = priceValue - costValue;
    return {
      profit,
      percent: (profit / priceValue) * 100,
    };
  }, [priceValue, costValue]);

  const basicTabHasError = !!(errors.name || errors.description || errors.categoryId || errors.sellerId);
  const pricingTabHasError = !!(errors.price || errors.stock);
  const mediaTabHasError = !!errors.videoUrl;

  const onSubmit = async (data: ProductFormData) => {
    // Check if user is seller
    if (user?.role !== 'SELLER' && user?.role !== 'ADMIN') {
      toast.error('You must be a seller to create products');
      return;
    }

    setIsLoading(true);
    try {
      const resolvedSellerId =
        user?.role === 'ADMIN'
          ? data.sellerId
          : user?.seller?.id ?? data.sellerId;

      if (!resolvedSellerId) {
        toast.error('Please select a seller');
        setIsLoading(false);
        return;
      }

      // The backend has one `categoryId` field; a chosen sub-category IS the
      // product's category (it's just a Category row with a parentId), so it
      // takes priority over the parent selected in the top-level dropdown.
      const effectiveCategoryId = data.subCategoryId ? Number(data.subCategoryId) : Number(data.categoryId);

      const specifications = specRows.reduce<Record<string, string>>((acc, row) => {
        const key = row.key.trim();
        const value = row.value.trim();
        if (key && value) acc[key] = value;
        return acc;
      }, {});

      const payload = {
        name: data.name,
        nameTetum: data.nameTetum || null,
        description: data.description,
        descriptionTetum: data.descriptionTetum || null,
        brand: data.brand || null,
        specifications,
        price: Number(data.price),
        comparePrice: data.comparePrice ? Number(data.comparePrice) : null,
        cost: data.cost ? Number(data.cost) : null,
        stock: Number(data.stock),
        sku: data.sku || null,
        barcode: data.barcode || null,
        videoUrl: data.videoUrl || null,
        weight: data.weight ? Number(data.weight) : null,
        categoryId: effectiveCategoryId,
        typeId: data.typeId || null,
        sellerId: Number(resolvedSellerId),
        isActive: Boolean(data.isActive),
        isFeatured: Boolean(data.isFeatured),
        slug: data.slug || null,
        images: images,
      };

      if (initialData?.id) {
        await api.patch(`/products/${initialData.id}`, payload);
        toast.success('Product updated successfully');
      } else {
        await api.post('/products', payload);
        toast.success('Product created successfully');
      }

      onSuccess();
    } catch (error: any) {
      console.error('Product save error:', error.response?.data ?? error);

      if (error.response) {
        const errorData = error.response.data;
        if (errorData.message) {
          toast.error(`Error: ${errorData.message}`);
        } else if (errorData.errors) {
          toast.error(`Validation errors: ${errorData.errors.join(', ')}`);
        } else {
          toast.error('Failed to save product. Please check all fields.');
        }
      } else if (error.request) {
        toast.error('No response from server. Please check your connection.');
      } else {
        toast.error(error.message || 'Failed to save product');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onInvalid = () => {
    // Jump the admin to whichever tab holds the first validation error,
    // since fields on inactive tabs are unmounted and their errors would
    // otherwise be invisible.
    if (errors.name || errors.description || errors.categoryId || errors.sellerId) {
      setActiveTab('basic');
    } else if (errors.price || errors.stock) {
      setActiveTab('pricing');
    } else if (errors.videoUrl) {
      setActiveTab('media');
    }
  };

  // Watch values for switches
  const isActive = watch('isActive');
  const isFeatured = watch('isFeatured');

  return (
    <div>
      {sellerError && (
        <div className="mb-4 p-4 border border-yellow-500 bg-yellow-50 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-800">{sellerError}</p>
            <p className="text-xs text-yellow-700 mt-1">
              You need to register as a seller and get verified before you can add products.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">
              Basic Info
              {basicTabHasError && <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />}
            </TabsTrigger>
            <TabsTrigger value="pricing">
              Pricing &amp; Stock
              {pricingTabHasError && <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />}
            </TabsTrigger>
            <TabsTrigger value="media">
              Media &amp; Type
              {mediaTabHasError && <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />}
            </TabsTrigger>
            <TabsTrigger value="organize">Specs &amp; SEO</TabsTrigger>
          </TabsList>

          {/* ============ BASIC INFO ============ */}
          <TabsContent value="basic" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Product Name (Portuguese) *</Label>
                <Input {...register('name')} placeholder="Enter product name" />
                {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
              </div>

              <div>
                <Label>Product Name (Tetun)</Label>
                <Input {...register('nameTetum')} placeholder="Naran produtu iha Tetun" />
              </div>

              <div>
                <Label>Category *</Label>
                <Select
                  value={watch('categoryId')?.toString() || ''}
                  onValueChange={(value) => setValue('categoryId', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.data
                      ?.filter((category: any) => category.parentId === null)
                      .map((category: any) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {errors.categoryId && <p className="text-sm text-red-500">{errors.categoryId.message}</p>}
              </div>

              {subcategories.length > 0 && (
                <div>
                  <Label>Sub-Category</Label>
                  <Select
                    value={watch('subCategoryId')?.toString() || ''}
                    onValueChange={(value) =>
                      setValue('subCategoryId', value === 'none' ? undefined : parseInt(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sub-category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No sub-category</SelectItem>
                      {subcategories.map((subcategory: any) => (
                        <SelectItem key={subcategory.id} value={subcategory.id.toString()}>
                          {selectedCategoryName ? `${selectedCategoryName} > ${subcategory.name}` : subcategory.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>Seller *</Label>
                {user?.role === 'SELLER' ? (
                  <Input value={user.seller?.storeName || 'Your store'} disabled className="bg-muted" />
                ) : (
                  <Select
                    value={watch('sellerId')?.toString() || ''}
                    onValueChange={(value) => setValue('sellerId', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select seller" />
                    </SelectTrigger>
                    <SelectContent>
                      {sellers?.data?.map((seller: any) => (
                        <SelectItem key={seller.id} value={seller.id.toString()}>
                          {seller.storeName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {errors.sellerId && <p className="text-sm text-red-500">{errors.sellerId.message}</p>}
              </div>

              <div>
                <Label>Brand</Label>
                <Input {...register('brand')} placeholder="e.g. Nike" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label>Description (Portuguese) *</Label>
                <span
                  className={`text-xs ${
                    descriptionValue.length > 0 && descriptionValue.length < 20
                      ? 'text-red-500'
                      : 'text-muted-foreground'
                  }`}
                >
                  {descriptionValue.length}/5000 (min 20)
                </span>
              </div>
              <Textarea
                rows={5}
                {...register('description')}
                placeholder="Describe your product in detail (at least 20 characters)..."
              />
              {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label>Description (Tetun)</Label>
                <span className="text-xs text-muted-foreground">{descriptionTetumValue.length}/5000</span>
              </div>
              <Textarea rows={5} {...register('descriptionTetum')} placeholder="Deskrisaun produtu iha Tetun..." />
            </div>
          </TabsContent>

          {/* ============ PRICING & STOCK ============ */}
          <TabsContent value="pricing" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Price ($) *</Label>
                <Input type="number" step="0.01" {...register('price', { valueAsNumber: true })} placeholder="0.00" />
                {errors.price && <p className="text-sm text-red-500">{errors.price.message}</p>}
              </div>

              <div>
                <Label>Compare Price ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...register('comparePrice', { valueAsNumber: true })}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground mt-1">Shown as a strikethrough "was" price</p>
              </div>

              <div>
                <Label>Cost ($)</Label>
                <Input type="number" step="0.01" {...register('cost', { valueAsNumber: true })} placeholder="0.00" />
                <p className="text-xs text-muted-foreground mt-1">Your cost — not shown to customers</p>
              </div>

              <div>
                <Label>Profit Margin</Label>
                <div className="h-9 flex items-center">
                  {margin ? (
                    <Badge variant={margin.profit >= 0 ? 'default' : 'destructive'} className="gap-1">
                      <TrendingUp className="h-3 w-3" />
                      ${margin.profit.toFixed(2)} ({margin.percent.toFixed(0)}%)
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">Enter price and cost to see margin</span>
                  )}
                </div>
              </div>

              <div>
                <Label>Stock *</Label>
                <Input type="number" {...register('stock', { valueAsNumber: true })} placeholder="0" />
                {errors.stock && <p className="text-sm text-red-500">{errors.stock.message}</p>}
              </div>

              <div>
                <Label>Weight (kg)</Label>
                <Input type="number" step="0.1" {...register('weight', { valueAsNumber: true })} placeholder="0.0" />
              </div>

              <div>
                <Label>SKU</Label>
                <Input {...register('sku')} placeholder="SKU-001" />
              </div>

              <div>
                <Label>Barcode</Label>
                <Input {...register('barcode')} placeholder="1234567890" />
              </div>
            </div>
          </TabsContent>

          {/* ============ MEDIA & TYPE ============ */}
          <TabsContent value="media" className="space-y-4 pt-4">
            <div>
              <Label>Product Images</Label>
              <ImageUpload images={images} setImages={setImages} maxImages={10} />
            </div>

            <div>
              <Label>Video URL</Label>
              <Input type="url" {...register('videoUrl')} placeholder="https://example.com/video.mp4" />
              {errors.videoUrl && <p className="text-sm text-red-500">{errors.videoUrl.message}</p>}
            </div>

            <div>
              <Label className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                Product Type
              </Label>
              <Select
                value={selectedTypeId ? selectedTypeId.toString() : 'none'}
                onValueChange={(value) => setValue('typeId', value === 'none' ? null : parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a product type (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No product type</SelectItem>
                  {productTypeList.map((type: any) => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {typeFieldNames.length > 0
                  ? `Variant fields for this type: ${typeFieldNames.join(', ')}`
                  : 'Defines variant fields (e.g. Color, Size) shown on the storefront. Manage types from the product detail page.'}
              </p>
            </div>
          </TabsContent>

          {/* ============ SPECIFICATIONS & SEO ============ */}
          <TabsContent value="organize" className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <ListChecks className="h-3.5 w-3.5" />
                Specifications
              </Label>
              <p className="text-xs text-muted-foreground">
                General product details (e.g. Material, Origin, Warranty) shown on the storefront product page.
              </p>
              <div className="space-y-2">
                {specRows.map((row, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Field (e.g., Material)"
                      value={row.key}
                      onChange={(e) => handleSpecRowChange(index, 'key', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Value (e.g., 100% Cotton)"
                      value={row.value}
                      onChange={(e) => handleSpecRowChange(index, 'value', e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveSpecRow(index)}
                      disabled={specRows.length === 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={handleAddSpecRow}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Field
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Slug (URL)</Label>
                <div className="flex gap-2">
                  <Input {...register('slug')} placeholder="auto-generated if empty" className="flex-1" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title="Generate from name"
                    disabled={!nameValue?.trim()}
                    onClick={() => setValue('slug', previewSlug(nameValue || ''), { shouldDirty: true })}
                  >
                    <Wand2 className="h-4 w-4" />
                  </Button>
                </div>
                {slugPreview && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {slugValue?.trim() ? 'URL: ' : 'Auto-generated URL: '}/products/
                    <span className="font-mono">{slugPreview}</span>
                  </p>
                )}
                {slugChangedFromSaved && (
                  <p className="text-xs text-amber-600 mt-1">
                    Changing the slug will break any existing links to this product's page.
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label htmlFor="isActive">Active</Label>
                  <p className="text-xs text-muted-foreground">Visible to customers</p>
                </div>
                <Switch id="isActive" checked={isActive} onCheckedChange={(checked) => setValue('isActive', checked)} />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label htmlFor="isFeatured">Featured</Label>
                  <p className="text-xs text-muted-foreground">Highlighted on the homepage</p>
                </div>
                <Switch
                  id="isFeatured"
                  checked={isFeatured}
                  onCheckedChange={(checked) => setValue('isFeatured', checked)}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || !!sellerError}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : initialData?.id ? (
              'Update Product'
            ) : (
              'Create Product'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
