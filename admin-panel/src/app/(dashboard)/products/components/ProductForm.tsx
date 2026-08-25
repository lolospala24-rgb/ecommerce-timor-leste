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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ImageUpload } from '@/components/shared/ImageUpload';
import { VideoUpload } from '@/components/shared/VideoUpload';
import { useCategories } from '@/hooks/useCategories';
import { useSellers } from '@/hooks/useSellers';
import { useProductTypes } from '@/hooks/useProductTypes';
import { useAuthStore } from '@/stores/authStore';
import { fieldsToNameList, parseProductTypeFields } from '@/lib/productType';
import { previewSlug } from '@/lib/slug';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Loader2,
  AlertCircle,
  Plus,
  X,
  ListChecks,
  Layers,
  TrendingUp,
  Wand2,
  Eye,
  UploadCloud,
  Info,
  Image as ImageIcon,
  Boxes,
  DollarSign,
  Truck,
  Search,
  CheckCircle2,
  FolderTree,
  Tag,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';
import { StagedVariantManager, StagedVariant } from './StagedVariantManager';
import { CreateProductTypeDialog } from './CreateProductTypeDialog';
import { CreateCategoryDialog } from './CreateCategoryDialog';

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
  weight: z.number().optional().nullable(),
  length: z.number().optional().nullable(),
  width: z.number().optional().nullable(),
  height: z.number().optional().nullable(),
  shippingClass: z.string().optional(),
  lowStockThreshold: z.number().optional().nullable(),
  wholesalePrice: z.number().optional().nullable(),
  wholesaleMinQty: z.number().optional().nullable(),
  packagingName: z.string().optional(),
  packagingUnitCount: z.number().optional().nullable(),
  packagingPrice: z.number().optional().nullable(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
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

const ALL_TABS = ['basic', 'media', 'variants', 'specifications', 'pricing', 'shipping', 'seo'] as const;
type TabId = (typeof ALL_TABS)[number];

const TAB_LABELS: Record<TabId, string> = {
  basic: 'Basic Information',
  media: 'Media',
  variants: 'Variants',
  specifications: 'Specifications',
  pricing: 'Pricing & Inventory',
  shipping: 'Shipping',
  seo: 'SEO',
};

const TAB_ICONS: Record<TabId, LucideIcon> = {
  basic: Info,
  media: ImageIcon,
  variants: Boxes,
  specifications: ListChecks,
  pricing: DollarSign,
  shipping: Truck,
  seo: Search,
};

const TAB_DESCRIPTIONS: Record<TabId, string> = {
  basic: 'Name, category, brand, type and the product description.',
  media: 'Product photos and an optional video. The first image becomes the thumbnail.',
  variants: 'Optional — different options like Color or Size, each with its own SKU, price and stock.',
  specifications: 'General product details shown on the storefront (e.g. Material, Warranty).',
  pricing: 'Price, stock, and optional wholesale/packaging reference pricing.',
  shipping: 'Weight, dimensions and shipping class used for delivery estimates.',
  seo: 'How this product appears in search engine results.',
};

export function ProductForm({ initialData, onSuccess, onCancel }: ProductFormProps) {
  const isCreateMode = !initialData?.id;
  const visibleTabs = useMemo<TabId[]>(
    () => (isCreateMode ? [...ALL_TABS] : ALL_TABS.filter((t) => t !== 'variants' && t !== 'specifications')),
    [isCreateMode],
  );

  const [images, setImages] = useState<string[]>(initialData?.images || []);
  const [videoUrl, setVideoUrl] = useState<string>(initialData?.videoUrl || '');
  const [specRows, setSpecRows] = useState<SpecRow[]>(() => specsToRows(initialData?.specifications));
  const [variants, setVariants] = useState<StagedVariant[]>([]);
  const [tags, setTags] = useState<string[]>(
    Array.isArray(initialData?.tags) ? initialData.tags.map((t: unknown) => String(t)) : [],
  );
  const [tagInput, setTagInput] = useState('');
  const [metaKeywords, setMetaKeywords] = useState<string[]>(
    Array.isArray(initialData?.metaKeywords) ? initialData.metaKeywords.map((k: unknown) => String(k)) : [],
  );
  const [metaKeywordInput, setMetaKeywordInput] = useState('');
  const [wholesaleEnabled, setWholesaleEnabled] = useState<boolean>(
    initialData?.wholesalePrice !== null && initialData?.wholesalePrice !== undefined,
  );
  const [packagingEnabled, setPackagingEnabled] = useState<boolean>(!!initialData?.packagingName);
  const [isLoading, setIsLoading] = useState(false);
  const [sellerError, setSellerError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [isCreateTypeOpen, setIsCreateTypeOpen] = useState(false);
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const { data: categories, refetch: refetchCategories } = useCategories({ page: 1, limit: 100 });
  const { data: sellers } = useSellers({ page: 1, limit: 100, isVerified: true });
  const { data: productTypes, refetch: refetchProductTypes } = useProductTypes();
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
      weight: initialData?.weight ?? null,
      length: initialData?.length ?? null,
      width: initialData?.width ?? null,
      height: initialData?.height ?? null,
      shippingClass: initialData?.shippingClass || '',
      lowStockThreshold: initialData?.lowStockThreshold ?? null,
      wholesalePrice: initialData?.wholesalePrice ?? null,
      wholesaleMinQty: initialData?.wholesaleMinQty ?? null,
      packagingName: initialData?.packagingName || '',
      packagingUnitCount: initialData?.packagingUnitCount ?? null,
      packagingPrice: initialData?.packagingPrice ?? null,
      metaTitle: initialData?.metaTitle || '',
      metaDescription: initialData?.metaDescription || '',
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
  const selectedSubCategoryName = categories?.data?.find((category: any) => category.id === selectedSubCategoryId)?.name || '';
  const topLevelCategories = categories?.data?.filter((category: any) => category.parentId === null) || [];

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

  const suggestedSpecFields = parseProductTypeFields(selectedType?.specFields);
  const existingSpecKeys = new Set(specRows.map((r) => r.key.trim().toLowerCase()).filter(Boolean));
  const availableSpecSuggestions = suggestedSpecFields.filter((f) => !existingSpecKeys.has(f.key.toLowerCase()));
  const handleAddSuggestedSpec = (key: string) => {
    setSpecRows((prev) => {
      if (prev.length === 1 && !prev[0].key.trim() && !prev[0].value.trim()) {
        return [{ key, value: '' }];
      }
      return [...prev, { key, value: '' }];
    });
  };

  // Tag / keyword chip helpers
  const handleAddTag = () => {
    const value = tagInput.trim();
    if (value && !tags.some((t) => t.toLowerCase() === value.toLowerCase())) {
      setTags((prev) => [...prev, value]);
    }
    setTagInput('');
  };
  const handleRemoveTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

  const handleAddMetaKeyword = () => {
    const value = metaKeywordInput.trim();
    if (value && !metaKeywords.some((k) => k.toLowerCase() === value.toLowerCase())) {
      setMetaKeywords((prev) => [...prev, value]);
    }
    setMetaKeywordInput('');
  };
  const handleRemoveMetaKeyword = (keyword: string) => setMetaKeywords((prev) => prev.filter((k) => k !== keyword));

  // Live helpers
  const nameValue = watch('name');
  const slugValue = watch('slug');
  const slugPreview = slugValue?.trim() ? previewSlug(slugValue) : previewSlug(nameValue || '');
  const slugChangedFromSaved = !!(initialData?.slug && slugValue?.trim() && slugPreview !== initialData.slug);
  const descriptionValue = watch('description') || '';
  const descriptionTetumValue = watch('descriptionTetum') || '';
  const priceValue = watch('price');
  const costValue = watch('cost');
  const comparePriceValue = watch('comparePrice');
  const skuValue = watch('sku');
  const stockValue = watch('stock');
  const lowStockThresholdValue = watch('lowStockThreshold');
  const wholesalePriceValue = watch('wholesalePrice') || 0;
  const wholesaleMinQtyValue = watch('wholesaleMinQty') || 0;
  const packagingNameValue = watch('packagingName') || '';
  const packagingUnitCountValue = watch('packagingUnitCount') || 0;
  const packagingPriceValue = watch('packagingPrice') || 0;
  const metaTitleValue = watch('metaTitle') || '';
  const metaDescriptionValue = watch('metaDescription') || '';
  const margin = useMemo(() => {
    if (!priceValue || !costValue || costValue <= 0) return null;
    const profit = priceValue - costValue;
    return { profit, percent: (profit / priceValue) * 100 };
  }, [priceValue, costValue]);

  const stockStatus = useMemo(() => {
    const threshold = lowStockThresholdValue ?? 5;
    if (!stockValue || stockValue <= 0) return { label: 'Out of Stock', color: 'text-red-600' };
    if (stockValue <= threshold) return { label: 'Low Stock', color: 'text-amber-600' };
    return { label: 'In Stock', color: 'text-green-600' };
  }, [stockValue, lowStockThresholdValue]);

  const basicTabHasError = !!(errors.name || errors.description || errors.categoryId || errors.sellerId);
  const pricingTabHasError = !!(errors.price || errors.stock);

  const buildPayload = (data: ProductFormData) => {
    const effectiveCategoryId = data.subCategoryId ? Number(data.subCategoryId) : Number(data.categoryId);
    const specifications = specRows.reduce<Record<string, string>>((acc, row) => {
      const key = row.key.trim();
      const value = row.value.trim();
      if (key && value) acc[key] = value;
      return acc;
    }, {});

    const payload: Record<string, unknown> = {
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
      videoUrl: videoUrl || null,
      weight: data.weight ? Number(data.weight) : null,
      length: data.length ? Number(data.length) : null,
      width: data.width ? Number(data.width) : null,
      height: data.height ? Number(data.height) : null,
      shippingClass: data.shippingClass || null,
      lowStockThreshold:
        data.lowStockThreshold !== null && data.lowStockThreshold !== undefined ? Number(data.lowStockThreshold) : null,
      wholesalePrice: wholesaleEnabled && data.wholesalePrice ? Number(data.wholesalePrice) : null,
      wholesaleMinQty: wholesaleEnabled && data.wholesaleMinQty ? Number(data.wholesaleMinQty) : null,
      packagingName: packagingEnabled && data.packagingName?.trim() ? data.packagingName.trim() : null,
      packagingUnitCount: packagingEnabled && data.packagingUnitCount ? Number(data.packagingUnitCount) : null,
      packagingPrice: packagingEnabled && data.packagingPrice ? Number(data.packagingPrice) : null,
      metaTitle: data.metaTitle || null,
      metaDescription: data.metaDescription || null,
      metaKeywords,
      tags,
      categoryId: effectiveCategoryId,
      typeId: data.typeId || null,
      isActive: Boolean(data.isActive),
      isFeatured: Boolean(data.isFeatured),
      slug: data.slug || null,
      images,
    };

    if (isCreateMode && variants.length > 0) {
      payload.variants = variants.map(({ tempId, ...v }) => v);
    }

    return payload;
  };

  const onSubmit = async (data: ProductFormData) => {
    if (user?.role !== 'SELLER' && user?.role !== 'ADMIN') {
      toast.error('You must be a seller to create products');
      return;
    }

    if (wholesaleEnabled && (!data.wholesalePrice || !data.wholesaleMinQty)) {
      toast.error('Please fill in Wholesale Price and Minimum Purchase Quantity, or uncheck wholesale pricing.');
      setActiveTab('pricing');
      return;
    }
    if (packagingEnabled && (!data.packagingName?.trim() || !data.packagingUnitCount || !data.packagingPrice)) {
      toast.error('Please fill in all package fields, or uncheck "sold by the package".');
      setActiveTab('pricing');
      return;
    }

    setIsLoading(true);
    try {
      const resolvedSellerId = user?.role === 'ADMIN' ? data.sellerId : user?.seller?.id ?? data.sellerId;
      if (!resolvedSellerId) {
        toast.error('Please select a seller');
        setIsLoading(false);
        return;
      }

      const payload = { ...buildPayload(data), sellerId: Number(resolvedSellerId) };

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
    }
  };

  const isActive = watch('isActive');
  const isFeatured = watch('isFeatured');

  const submitWithStatus = (active: boolean) => {
    setValue('isActive', active, { shouldValidate: false });
    handleSubmit(onSubmit, onInvalid)();
  };

  const goToNextTab = () => {
    const currentIndex = visibleTabs.indexOf(activeTab);
    if (currentIndex >= 0 && currentIndex < visibleTabs.length - 1) {
      setActiveTab(visibleTabs[currentIndex + 1]);
    }
  };

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

      <form onSubmit={handleSubmit(onSubmit, onInvalid)}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
          {/* ============ MAIN CONTENT ============ */}
          <div className="space-y-6 min-w-0">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
              <TabsList
                className="grid h-auto w-full gap-1 bg-muted/60 p-1"
                style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }}
              >
                {visibleTabs.map((tab) => {
                  const TabIcon = TAB_ICONS[tab];
                  return (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      className="flex-col gap-1 py-2.5 text-[11px] font-medium sm:flex-row sm:gap-1.5 sm:text-xs"
                    >
                      <TabIcon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{TAB_LABELS[tab]}</span>
                      {tab === 'basic' && basicTabHasError && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />}
                      {tab === 'pricing' && pricingTabHasError && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {/* ============ BASIC INFORMATION ============ */}
              <TabsContent value="basic" className="pt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-1.5 text-base">
                    <Info className="h-4 w-4" />
                    {TAB_LABELS.basic}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{TAB_DESCRIPTIONS.basic}</p>
                </CardHeader>
                <CardContent className="space-y-4">
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

                  <div className="md:col-span-2">
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
                        {topLevelCategories.map((category: any) => (
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
                        onValueChange={(value) => setValue('subCategoryId', value === 'none' ? undefined : parseInt(value))}
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
                    <Label>Brand</Label>
                    <Input {...register('brand')} placeholder="e.g. Nike" />
                  </div>

                  <div>
                    <Label className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5" />
                      Product Type
                    </Label>
                    <div className="flex gap-2">
                      <Select
                        value={selectedTypeId ? selectedTypeId.toString() : 'none'}
                        onValueChange={(value) => setValue('typeId', value === 'none' ? null : parseInt(value))}
                      >
                        <SelectTrigger className="flex-1">
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
                      <Button type="button" variant="outline" size="icon" title="New Type" onClick={() => setIsCreateTypeOpen(true)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {typeFieldNames.length > 0
                        ? `Variant fields for this type: ${typeFieldNames.join(', ')}`
                        : 'Defines variant fields (e.g. Color, Size) shown on the storefront.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <Label htmlFor="isFeatured">Featured</Label>
                      <p className="text-xs text-muted-foreground">Highlighted on the homepage</p>
                    </div>
                    <Switch id="isFeatured" checked={isFeatured} onCheckedChange={(checked) => setValue('isFeatured', checked)} />
                  </div>
                </div>

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
                  <div className="flex items-center justify-between">
                    <Label>Description (Portuguese) *</Label>
                    <span
                      className={`text-xs ${
                        descriptionValue.length > 0 && descriptionValue.length < 20 ? 'text-red-500' : 'text-muted-foreground'
                      }`}
                    >
                      {descriptionValue.length}/5000 (min 20)
                    </span>
                  </div>
                  <Textarea rows={5} {...register('description')} placeholder="Describe your product in detail (at least 20 characters)..." />
                  {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label>Description (Tetun)</Label>
                    <span className="text-xs text-muted-foreground">{descriptionTetumValue.length}/5000</span>
                  </div>
                  <Textarea rows={5} {...register('descriptionTetum')} placeholder="Deskrisaun produtu iha Tetun..." />
                </div>
                </CardContent>
              </Card>
              </TabsContent>

              {/* ============ MEDIA ============ */}
              <TabsContent value="media" className="pt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-1.5 text-base">
                      <ImageIcon className="h-4 w-4" />
                      {TAB_LABELS.media}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{TAB_DESCRIPTIONS.media}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Product Images</Label>
                      <p className="text-xs text-muted-foreground mb-2">The first image is used as the product's thumbnail.</p>
                      <ImageUpload images={images} setImages={setImages} maxImages={10} />
                    </div>

                    <div>
                      <Label>Product Video</Label>
                      <VideoUpload videoUrl={videoUrl} onChange={setVideoUrl} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ============ VARIANTS (create-mode only) ============ */}
              {isCreateMode && (
                <TabsContent value="variants" className="pt-4">
                  <StagedVariantManager variants={variants} onChange={setVariants} productType={selectedType} />
                </TabsContent>
              )}

              {/* ============ SPECIFICATIONS (create-mode only) ============ */}
              {isCreateMode && (
                <TabsContent value="specifications" className="pt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-1.5 text-base">
                        <ListChecks className="h-4 w-4" />
                        Specifications
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-xs text-muted-foreground">
                        General product details (e.g. Material, Origin, Warranty) shown on the storefront product page.
                      </p>

                      {availableSpecSuggestions.length > 0 && (
                        <div className="space-y-2">
                          <Label>Suggested for this product type</Label>
                          <div className="flex flex-wrap gap-2">
                            {availableSpecSuggestions.map((field) => (
                              <Badge
                                key={field.key}
                                variant="secondary"
                                className="cursor-pointer hover:bg-secondary/70"
                                onClick={() => handleAddSuggestedSpec(field.key)}
                              >
                                <Plus className="mr-1 h-3 w-3" />
                                {field.label}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

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
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* ============ PRICING & INVENTORY ============ */}
              <TabsContent value="pricing" className="space-y-4 pt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-1.5 text-base">
                      <DollarSign className="h-4 w-4" />
                      {TAB_LABELS.pricing}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{TAB_DESCRIPTIONS.pricing}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Price ($) *</Label>
                    <Input type="number" step="0.01" {...register('price', { valueAsNumber: true })} placeholder="0.00" />
                    {errors.price && <p className="text-sm text-red-500">{errors.price.message}</p>}
                  </div>

                  <div>
                    <Label>Compare Price ($)</Label>
                    <Input type="number" step="0.01" {...register('comparePrice', { valueAsNumber: true })} placeholder="0.00" />
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
                    <Label>Low Stock Alert</Label>
                    <Input type="number" {...register('lowStockThreshold', { valueAsNumber: true })} placeholder="e.g. 5" />
                    <p className="text-xs text-muted-foreground mt-1">Flag as "Low Stock" at or below this quantity</p>
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

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Wholesale &amp; Packaging</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <p className="text-xs text-muted-foreground -mt-2">
                      Informational only — shown to shoppers as reference pricing. It does not change what "Add to
                      Cart" charges; customers still buy at the regular price above.
                    </p>

                    <div className="rounded-lg border p-3 space-y-3">
                      <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={wholesaleEnabled}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setWholesaleEnabled(checked);
                            if (!checked) {
                              setValue('wholesalePrice', null);
                              setValue('wholesaleMinQty', null);
                            }
                          }}
                        />
                        This product has wholesale pricing
                      </label>
                      {wholesaleEnabled && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                          <div>
                            <Label>Wholesale Price ($) *</Label>
                            <Input
                              type="number"
                              step="0.01"
                              {...register('wholesalePrice', { valueAsNumber: true })}
                              placeholder="0.00"
                            />
                            <p className="text-xs text-muted-foreground mt-1">Per-unit price at the minimum quantity below</p>
                          </div>
                          <div>
                            <Label>Minimum Purchase Quantity *</Label>
                            <Input
                              type="number"
                              {...register('wholesaleMinQty', { valueAsNumber: true })}
                              placeholder="e.g. 10"
                            />
                          </div>
                          {wholesalePriceValue > 0 && wholesaleMinQtyValue > 0 && (
                            <p className="md:col-span-2 text-xs text-muted-foreground">
                              Preview: <span className="font-medium text-foreground">Buy {wholesaleMinQtyValue}+ units — ${wholesalePriceValue.toFixed(2)}/unit</span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg border p-3 space-y-3">
                      <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={packagingEnabled}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setPackagingEnabled(checked);
                            if (!checked) {
                              setValue('packagingName', '');
                              setValue('packagingUnitCount', null);
                              setValue('packagingPrice', null);
                            }
                          }}
                        />
                        This product is also sold by the package
                      </label>
                      {packagingEnabled && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-6">
                          <div>
                            <Label>Package Name *</Label>
                            <Input {...register('packagingName')} placeholder="e.g. Pack, Dozen, Box, Carton" />
                            <p className="text-xs text-muted-foreground mt-1">Any label — not limited to a fixed list</p>
                          </div>
                          <div>
                            <Label>Units per Package *</Label>
                            <Input
                              type="number"
                              {...register('packagingUnitCount', { valueAsNumber: true })}
                              placeholder="e.g. 12"
                            />
                          </div>
                          <div>
                            <Label>Package Price ($) *</Label>
                            <Input
                              type="number"
                              step="0.01"
                              {...register('packagingPrice', { valueAsNumber: true })}
                              placeholder="0.00"
                            />
                          </div>
                          {packagingNameValue?.trim() && packagingUnitCountValue > 0 && packagingPriceValue > 0 && (
                            <p className="md:col-span-3 text-xs text-muted-foreground">
                              Preview: <span className="font-medium text-foreground">
                                {packagingNameValue.trim()} ({packagingUnitCountValue} units) — ${packagingPriceValue.toFixed(2)}
                              </span>{' '}
                              (${(packagingPriceValue / packagingUnitCountValue).toFixed(2)}/unit)
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ============ SHIPPING ============ */}
              <TabsContent value="shipping" className="pt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-1.5 text-base">
                      <Truck className="h-4 w-4" />
                      {TAB_LABELS.shipping}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{TAB_DESCRIPTIONS.shipping}</p>
                  </CardHeader>
                  <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Weight (kg)</Label>
                    <Input type="number" step="0.1" {...register('weight', { valueAsNumber: true })} placeholder="0.0" />
                  </div>
                  <div>
                    <Label>Shipping Class</Label>
                    <Input {...register('shippingClass')} placeholder="e.g. Standard, Fragile (optional)" />
                  </div>
                  <div>
                    <Label>Length (cm)</Label>
                    <Input type="number" step="0.1" {...register('length', { valueAsNumber: true })} placeholder="0.0" />
                  </div>
                  <div>
                    <Label>Width (cm)</Label>
                    <Input type="number" step="0.1" {...register('width', { valueAsNumber: true })} placeholder="0.0" />
                  </div>
                  <div>
                    <Label>Height (cm)</Label>
                    <Input type="number" step="0.1" {...register('height', { valueAsNumber: true })} placeholder="0.0" />
                  </div>
                </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ============ SEO ============ */}
              <TabsContent value="seo" className="pt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-1.5 text-base">
                      <Search className="h-4 w-4" />
                      {TAB_LABELS.seo}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{TAB_DESCRIPTIONS.seo}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <Label>Meta Title</Label>
                    <span className="text-xs text-muted-foreground">{metaTitleValue.length}/200</span>
                  </div>
                  <Input {...register('metaTitle')} placeholder="Defaults to the product name if left empty" />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label>Meta Description</Label>
                    <span className="text-xs text-muted-foreground">{metaDescriptionValue.length}/500</span>
                  </div>
                  <Textarea rows={3} {...register('metaDescription')} placeholder="Shown in search engine results" />
                </div>

                <div className="space-y-2">
                  <Label>SEO Keywords</Label>
                  <div className="flex flex-wrap gap-2">
                    {metaKeywords.map((keyword) => (
                      <Badge key={keyword} variant="secondary" className="gap-1">
                        {keyword}
                        <button type="button" onClick={() => handleRemoveMetaKeyword(keyword)}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={metaKeywordInput}
                      onChange={(e) => setMetaKeywordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddMetaKeyword();
                        }
                      }}
                      placeholder="Add a keyword and press Enter"
                    />
                    <Button type="button" variant="outline" onClick={handleAddMetaKeyword}>
                      Add
                    </Button>
                  </div>
                </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Cancel / Next footer */}
            <div className="flex justify-between gap-3 border-t pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              {activeTab !== visibleTabs[visibleTabs.length - 1] && (
                <Button type="button" onClick={goToNextTab}>
                  Next →
                </Button>
              )}
            </div>
          </div>

          {/* ============ SIDEBAR ============ */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-1.5 text-base">
                  <CheckCircle2 className="h-4 w-4" />
                  Product Status
                </CardTitle>
                <Badge variant={isActive ? 'default' : 'secondary'}>{isActive ? 'Published' : 'Draft'}</Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" checked={!isActive} onChange={() => setValue('isActive', false)} />
                  Draft — hidden from customers
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" checked={isActive} onChange={() => setValue('isActive', true)} />
                  Published — visible on the storefront
                </label>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5 text-base">
                  <FolderTree className="h-4 w-4" />
                  Product Category
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {selectedCategoryName ? (
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="gap-1">
                      {selectedCategoryName}
                      <button type="button" onClick={() => setValue('categoryId', undefined as any)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                    {selectedSubCategoryName && <Badge variant="outline">{selectedSubCategoryName}</Badge>}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No category selected yet</p>
                )}
                <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => setIsCreateCategoryOpen(true)}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add New Category
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5 text-base">
                  <Tag className="h-4 w-4" />
                  Product Tags
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button type="button" onClick={() => handleRemoveTag(tag)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="Add a tag"
                    className="h-8 text-sm"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={handleAddTag}>
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5 text-base">
                  <DollarSign className="h-4 w-4" />
                  Pricing Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-medium">${(priceValue || 0).toFixed(2)}</span>
                </div>
                {!!comparePriceValue && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Compare Price</span>
                    <span className="text-muted-foreground line-through">${Number(comparePriceValue).toFixed(2)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5 text-base">
                  <Warehouse className="h-4 w-4" />
                  Inventory Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SKU</span>
                  <span className="font-mono">{skuValue || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stock</span>
                  <span className={`font-medium ${stockStatus.color}`}>
                    {stockValue ?? 0} · {stockStatus.label}
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Button
                type="button"
                className="w-full"
                disabled={isLoading || !!sellerError}
                onClick={() => submitWithStatus(true)}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="mr-2 h-4 w-4" />
                )}
                Publish Product
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={isLoading || !!sellerError}
                onClick={() => submitWithStatus(false)}
              >
                Save Draft
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={() => setIsPreviewOpen(true)}>
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Button>
            </div>
          </div>
        </div>
      </form>

      <CreateProductTypeDialog
        open={isCreateTypeOpen}
        onOpenChange={setIsCreateTypeOpen}
        onCreated={async (created) => {
          await refetchProductTypes();
          setValue('typeId', created.id);
        }}
      />

      <CreateCategoryDialog
        open={isCreateCategoryOpen}
        onOpenChange={setIsCreateCategoryOpen}
        parentOptions={topLevelCategories}
        onCreated={async (created) => {
          await refetchCategories();
          if (created.parentId) {
            setValue('categoryId', created.parentId);
            setValue('subCategoryId', created.id);
          } else {
            setValue('categoryId', created.id);
            setValue('subCategoryId', undefined);
          }
        }}
      />

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{nameValue || 'Untitled product'}</DialogTitle>
            <DialogDescription>Quick preview of the current form values</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            {images[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={images[0]} alt={nameValue} className="w-full h-48 object-cover rounded-lg border" />
            )}
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">${(priceValue || 0).toFixed(2)}</span>
              {!!comparePriceValue && (
                <span className="text-muted-foreground line-through">${Number(comparePriceValue).toFixed(2)}</span>
              )}
            </div>
            <p className="text-muted-foreground line-clamp-4">{descriptionValue}</p>
            <div className="flex flex-wrap gap-1">
              {selectedCategoryName && <Badge variant="outline">{selectedCategoryName}</Badge>}
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
