'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useSeller } from '@/hooks/useSellers';
import { useSellerProducts } from '@/hooks/useProducts';
import { useAuthStore } from '@/stores/authStore';
import { ProductGrid } from '@/components/products/ProductGrid';
import { ProductSort } from '@/components/products/ProductSort';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Store,
  Star,
  Package,
  ShoppingBag,
  MapPin,
  Phone,
  Mail,
  ChevronLeft,
  CheckCircle,
  XCircle,
  MessageCircle,
} from 'lucide-react';

export default function SellerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sellerId = parseInt(params.id as string);
  const { user } = useAuthStore();
  
  const [filters, setFilters] = useState({
    page: 1,
    limit: 12,
    sortBy: 'newest' as string,
  });

  const { data: seller, isLoading: sellerLoading } = useSeller(sellerId);
  const { data: productsData, isLoading: productsLoading } = useSellerProducts(
    sellerId,
    filters,
  );

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSortChange = (sort: string) => {
    setFilters(prev => ({ ...prev, sortBy: sort, page: 1 }));
  };

  if (sellerLoading || !seller) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" className="mb-2" onClick={() => router.back()}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex items-start gap-6">
          <Skeleton className="h-24 w-24 rounded-lg" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const storeName = seller.storeName || seller.user?.name || 'Seller';

  const getInitials = (name?: string | null) => {
    const safeName = (name || storeName).trim();
    return safeName
      .split(' ')
      .filter(Boolean)
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isOwner = user?.id === seller.userId;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" className="mb-2" onClick={() => router.back()}>
        <ChevronLeft className="mr-2 h-4 w-4" />
        Back to Sellers
      </Button>

      <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
        <div className="relative h-64 sm:h-72 lg:h-80 bg-slate-100">
          {seller.storeBanner ? (
            <Image
              src={seller.storeBanner}
              alt={`${storeName} banner`}
              fill
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-primary/15 via-transparent to-slate-100" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 sm:left-8 sm:right-8">
            <div className="flex flex-col gap-3 rounded-3xl bg-background/95 p-4 shadow-2xl ring-1 ring-slate-200/70 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-3xl border-4 border-white bg-muted shadow-xl">
                  {seller.storeLogo ? (
                    <Image
                      src={seller.storeLogo}
                      alt={`${storeName} logo`}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <span className="text-2xl font-bold text-primary">
                        {getInitials(seller.storeName)}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                      {storeName}
                    </h1>
                    {seller.isVerified ? (
                      <Badge className="bg-green-600 text-white gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        Pending
                      </Badge>
                    )}
                    {isOwner && (
                      <Badge variant="outline" className="gap-1">
                        Your Store
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                      <span className="font-medium text-foreground">
                        {seller.rating?.toFixed(1) || '0'}
                      </span>
                      <span>({seller.totalReviews || 0} reviews)</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Package className="h-4 w-4" />
                      <span>{seller._count?.products || 0} products</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <ShoppingBag className="h-4 w-4" />
                      <span>{seller._count?.orders || 0} orders</span>
                    </div>
                  </div>
                  {seller.storeAddress && (
                    <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{seller.storeAddress}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
                {seller.storeEmail && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={`mailto:${seller.storeEmail}`}>
                      <Mail className="mr-2 h-4 w-4" />
                      Email
                    </a>
                  </Button>
                )}
                {seller.storePhone && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={`tel:${seller.storePhone}`}>
                      <Phone className="mr-2 h-4 w-4" />
                      Call
                    </a>
                  </Button>
                )}
                {isOwner && (
                  <Button size="sm" asChild>
                    <Link href="/profile/store">
                      <Store className="mr-2 h-4 w-4" />
                      Manage Store
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Store Description */}
      {seller.description && (
        <div className="rounded-2xl border p-4 bg-muted/30">
          <h2 className="font-semibold mb-2">About the Store</h2>
          <p className="text-muted-foreground whitespace-pre-wrap">{seller.description}</p>
        </div>
      )}

      {/* Products / Reviews */}
      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products">
            Products
            <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full">
              {seller._count?.products || 0}
            </span>
          </TabsTrigger>
          <TabsTrigger value="reviews">
            Reviews
            {seller.totalReviews > 0 && (
              <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full">
                {seller.totalReviews}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <div className="flex flex-wrap items-center justify-end gap-4">
            <ProductSort value={filters.sortBy} onChange={handleSortChange} />
          </div>

          {productsLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-lg" />
              ))}
            </div>
          ) : productsData?.data?.length === 0 ? (
            <div className="text-center py-12 border rounded-lg">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No Products Available</h3>
              <p className="text-muted-foreground">
                This seller hasn't listed any products yet.
              </p>
            </div>
          ) : (
            <ProductGrid
              products={productsData?.data || []}
              pagination={productsData?.pagination}
              onPageChange={handlePageChange}
            />
          )}
        </TabsContent>

        <TabsContent value="reviews">
          {seller.totalReviews === 0 ? (
            <div className="text-center py-12 border rounded-lg">
              <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No Reviews Yet</h3>
              <p className="text-muted-foreground">
                This seller hasn't received any reviews yet.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-6 p-4 border rounded-lg bg-muted/30">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">
                  {seller.rating?.toFixed(1) || '0'}
                </div>
                <div className="flex items-center justify-center mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= Math.round(seller.rating || 0)
                          ? 'fill-amber-500 text-amber-500'
                          : 'text-muted-foreground'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  {seller.totalReviews} reviews
                </p>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Trust Badges */}
      <div className="grid gap-4 sm:grid-cols-3 pt-4 border-t">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span>{seller.isVerified ? 'Verified Seller' : 'Verification Pending'}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Package className="h-5 w-5 text-primary" />
          <span>{seller._count?.products || 0} Products Available</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <ShoppingBag className="h-5 w-5 text-primary" />
          <span>{seller._count?.orders || 0} Orders Completed</span>
        </div>
      </div>
    </div>
  );
}