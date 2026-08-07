'use client';

import { useParams, useRouter } from 'next/navigation';
import { useProduct, useProductVariants } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductForm } from '../components/ProductForm';
import { VariantManager } from '../components/VariantManager';
import { ProductTypeSelector } from '../components/ProductTypeSelector';
import { ProductSpecifications } from '../components/ProductSpecifications';
import {
  ArrowLeft,
  Package,
  DollarSign,
  ShoppingBag,
  Star,
  Eye,
  EyeOff,
  Trash2,
  Edit,
} from 'lucide-react';
import { useState } from 'react';
import { RemoteImage } from '@/components/shared/RemoteImage';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = parseInt(params.id as string);
  const { data: product, isLoading, refetch } = useProduct(productId);
  const { data: variants = [], refetch: refetchVariants } = useProductVariants(productId);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [imageLoadErrors, setImageLoadErrors] = useState<boolean[]>([]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Package className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Product Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The product you're looking for doesn't exist or has been deleted.
        </p>
        <Button onClick={() => router.push('/products')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Button>
      </div>
    );
  }

  const handleToggleStatus = async () => {
    setIsToggling(true);
    try {
      await api.post(`/products/${productId}/toggle-status`);
      toast.success(`Product ${product.isActive ? 'deactivated' : 'activated'} successfully`);
      refetch();
    } catch (error) {
      toast.error('Failed to update product status');
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/products/${productId}`);
      toast.success('Product deleted successfully');
      router.push('/products');
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Edit Product</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <ProductForm
              initialData={product}
              onSuccess={() => {
                setIsEditing(false);
                refetch();
              }}
              onCancel={() => setIsEditing(false)}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
          <Badge variant={product.isActive ? 'default' : 'secondary'}>
            {product.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleToggleStatus} disabled={isToggling}>
            {product.isActive ? (
              <>
                <EyeOff className="mr-2 h-4 w-4" />
                Deactivate
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                Activate
              </>
            )}
          </Button>
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Product Images */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Product Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {product.images && product.images.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {product.images.map((image: string, index: number) => (
                    <div key={index} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      {imageLoadErrors[index] ? (
                      <div className="flex items-center justify-center h-full w-full bg-gray-200 text-sm text-muted-foreground">
                        Image not available
                      </div>
                    ) : (
                      <RemoteImage
                        src={image}
                        alt={`${product.name} - ${index + 1}`}
                        fill
                        className="object-cover"
                        onError={() =>
                          setImageLoadErrors((prev) => {
                            const next = [...prev];
                            next[index] = true;
                            return next;
                          })
                        }
                      />
                    )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 bg-gray-100 rounded-lg">
                  <Package className="h-12 w-12 text-gray-400" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Product Info */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name (Portuguese)</p>
                <p>{product.name}</p>
              </div>
              {product.nameTetum && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Name (Tetun)</p>
                  <p>{product.nameTetum}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Price</p>
                <p className="text-2xl font-bold text-primary">
                  ${product.price !== undefined ? product.price.toLocaleString() : '0'}
                </p>
              </div>
              {product.comparePrice && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Compare Price</p>
                  <p className="text-lg line-through text-muted-foreground">
                    ${product.comparePrice.toLocaleString()}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Stock</p>
                <Badge variant={product.stock > 0 ? 'default' : 'destructive'}>
                  {product.stock > 0 ? `${product.stock} units` : 'Out of Stock'}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">SKU</p>
                <p>{product.sku || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Category</p>
                <p>{product.category?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Seller</p>
                <p>{product.seller?.storeName || '-'}</p>
              </div>
              {product.weight && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Weight</p>
                  <p>{product.weight} kg</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description Tabs */}
      <Tabs defaultValue="description" className="space-y-4">
        <TabsList>
          <TabsTrigger value="description">Description (Portuguese)</TabsTrigger>
          {product.descriptionTetum && (
            <TabsTrigger value="descriptionTetum">Description (Tetun)</TabsTrigger>
          )}
          <TabsTrigger value="variants">Variants</TabsTrigger>
          <TabsTrigger value="type">Product Type</TabsTrigger>
          <TabsTrigger value="specifications">Specifications</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="description">
          <Card>
            <CardContent className="p-6">
              <div className="prose max-w-none">
                <p>{product.description}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {product.descriptionTetum && (
          <TabsContent value="descriptionTetum">
            <Card>
              <CardContent className="p-6">
                <div className="prose max-w-none">
                  <p>{product.descriptionTetum}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="variants">
          <VariantManager
            productId={productId}
            variants={variants}
            productType={product.type}
            onUpdate={() => {
              refetchVariants();
              refetch();
            }}
          />
        </TabsContent>

        <TabsContent value="type">
          <ProductTypeSelector
            productId={productId}
            currentTypeId={product.type?.id ?? product.typeId ?? null}
            onUpdate={refetch}
          />
        </TabsContent>

        <TabsContent value="specifications">
          <ProductSpecifications
            productId={productId}
            specifications={product.specifications}
            brand={product.brand}
            onUpdate={refetch}
          />
        </TabsContent>

        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle>Product Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="border rounded-lg p-4 text-center">
                  <ShoppingBag className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-2xl font-bold">{product._count?.orderItems || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Sales</p>
                </div>
                <div className="border rounded-lg p-4 text-center">
                  <Star className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-2xl font-bold">{product.rating?.toFixed(1) || '0'}</p>
                  <p className="text-sm text-muted-foreground">Average Rating</p>
                </div>
                <div className="border rounded-lg p-4 text-center">
                  <DollarSign className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-2xl font-bold">
                    ${product.totalRevenue?.toLocaleString() || '0'}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Product"
        description={`Are you sure you want to delete "${product.name}"? This action cannot be undone and will remove all associated data including orders and reviews.`}
        confirmText="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}