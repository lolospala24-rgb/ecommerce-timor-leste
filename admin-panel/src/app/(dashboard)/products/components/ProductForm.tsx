'use client';

import { useState, useEffect } from 'react';
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
import { ImageUpload } from '@/components/shared/ImageUpload';
import { useCategories } from '@/hooks/useCategories';
import { useSellers } from '@/hooks/useSellers';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Loader2, AlertCircle } from 'lucide-react';

const productSchema = z.object({
  name: z.string().min(3, 'Product name must be at least 3 characters'),
  nameTetum: z.string().optional(),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  descriptionTetum: z.string().optional(),
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
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  slug: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ProductForm({ initialData, onSuccess, onCancel }: ProductFormProps) {
  const [images, setImages] = useState<string[]>(initialData?.images || []);
  const [isLoading, setIsLoading] = useState(false);
  const [sellerError, setSellerError] = useState<string | null>(null);
  const { data: categories } = useCategories({ page: 1, limit: 100 });
  const { data: sellers } = useSellers({ page: 1, limit: 100, isVerified: true });
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

      const payload = {
        name: data.name,
        nameTetum: data.nameTetum || null,
        description: data.description,
        descriptionTetum: data.descriptionTetum || null,
        price: Number(data.price),
        comparePrice: data.comparePrice ? Number(data.comparePrice) : null,
        cost: data.cost ? Number(data.cost) : null,
        stock: Number(data.stock),
        sku: data.sku || null,
        barcode: data.barcode || null,
        videoUrl: data.videoUrl || null,
        weight: data.weight ? Number(data.weight) : null,
        categoryId: effectiveCategoryId,
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
      console.error('❌ Product save error:', error);
      
      if (error.response) {
        console.log('📋 Error response data:', error.response.data);
        
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <Label>Product Name (Portuguese) *</Label>
              <Input 
                {...register('name')} 
                placeholder="Enter product name"
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>

            <div>
              <Label>Product Name (Tetun)</Label>
              <Input 
                {...register('nameTetum')} 
                placeholder="Naran produtu iha Tetun"
              />
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
                  {categories?.data?.
                    filter((category: any) => category.parentId === null)
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
                <Input
                  value={user.seller?.storeName || 'Your store'}
                  disabled
                  className="bg-muted"
                />
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
              <Label>Price ($) *</Label>
              <Input
                type="number"
                step="0.01"
                {...register('price', { valueAsNumber: true })}
                placeholder="0.00"
              />
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
            </div>

            <div>
              <Label>Cost ($)</Label>
              <Input
                type="number"
                step="0.01"
                {...register('cost', { valueAsNumber: true })}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <Label>Stock *</Label>
              <Input 
                type="number" 
                {...register('stock', { valueAsNumber: true })} 
                placeholder="0"
              />
              {errors.stock && <p className="text-sm text-red-500">{errors.stock.message}</p>}
            </div>

            <div>
              <Label>SKU</Label>
              <Input {...register('sku')} placeholder="SKU-001" />
            </div>

            <div>
              <Label>Barcode</Label>
              <Input {...register('barcode')} placeholder="1234567890" />
            </div>

            <div>
              <Label>Video URL</Label>
              <Input
                type="url"
                {...register('videoUrl')}
                placeholder="https://example.com/video.mp4"
              />
              {errors.videoUrl && (
                <p className="text-sm text-red-500">{errors.videoUrl.message}</p>
              )}
            </div>

            <div>
              <Label>Weight (kg)</Label>
              <Input
                type="number"
                step="0.1"
                {...register('weight', { valueAsNumber: true })}
                placeholder="0.0"
              />
            </div>

            <div>
              <Label>Slug (URL)</Label>
              <Input {...register('slug')} placeholder="auto-generated if empty" />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="isActive">Active</Label>
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={(checked) => setValue('isActive', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="isFeatured">Featured</Label>
              <Switch
                id="isFeatured"
                checked={isFeatured}
                onCheckedChange={(checked) => setValue('isFeatured', checked)}
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <Label>Description (Portuguese) *</Label>
          <Textarea 
            rows={5} 
            {...register('description')} 
            placeholder="Describe your product in detail (at least 20 characters)..."
          />
          {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
        </div>

        <div>
          <Label>Description (Tetun)</Label>
          <Textarea 
            rows={5} 
            {...register('descriptionTetum')} 
            placeholder="Deskrisaun produtu iha Tetun..."
          />
        </div>

        {/* Images */}
        <div>
          <Label>Product Images</Label>
          <ImageUpload images={images} setImages={setImages} maxImages={10} />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || !!sellerError}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              initialData?.id ? 'Update Product' : 'Create Product'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}