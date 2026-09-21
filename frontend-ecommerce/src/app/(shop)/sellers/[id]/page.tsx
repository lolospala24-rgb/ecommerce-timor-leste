'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useSeller } from '@/hooks/useSellers';
import { useSellerProducts } from '@/hooks/useProducts';
import { useTranslation } from '@/lib/i18n/LanguageContext';
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
  ChevronLeft,
  CheckCircle,
  XCircle,
  Tag,
} from 'lucide-react';

export default function SellerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sellerId = parseInt(params.id as string);
  const { user } = useAuthStore();
  const { t } = useTranslation();
  
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
  const hasActivePromotions = !!seller?.hasActivePromotions;
  const { data: promoData, isLoading: promoLoading } = useSellerProducts(
    sellerId,
    { page: 1, limit: 8, hasActivePromotion: true, enabled: hasActivePromotions },
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

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Banner — a short strip rather than a near-full-screen hero; on a
            phone the old h-64+ banner pushed the store's actual name and
            stats below the fold before a shopper saw anything real. */}
        <div className="relative h-20 bg-muted sm:h-32">
          {seller.storeBanner ? (
            <Image
              src={seller.storeBanner}
              alt={`${storeName} banner`}
              fill
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/15 to-primary/5" />
          )}
        </div>

        <div className="px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="-mt-8 flex items-end justify-between gap-3 sm:-mt-10">
            <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border-4 border-card bg-muted shadow-sm sm:h-20 sm:w-20">
              {seller.storeLogo ? (
                <Image
                  src={seller.storeLogo}
                  alt={`${storeName} logo`}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="text-lg font-bold text-primary sm:text-2xl">
                    {getInitials(seller.storeName)}
                  </span>
                </div>
              )}
            </div>
            {isOwner && (
              <Button size="sm" asChild>
                <Link href="/profile/store">
                  <Store className="mr-2 h-4 w-4" />
                  Manage Store
                </Link>
              </Button>
            )}
          </div>

          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-2xl">
                {storeName}
              </h1>
              {seller.isVerified ? (
                <Badge className="gap-1 bg-green-600 text-white">
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
                <Badge variant="outline">Your Store</Badge>
              )}
            </div>
            {seller.storeAddress && (
              <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{seller.storeAddress}</span>
              </div>
            )}
          </div>

          {/* Stats — real fields only (rating/products/orders), no
              response-time or unlabeled trust badges: that data isn't
              tracked per-seller, and inventing it would misrepresent the
              store. */}
          <div className="mt-4 grid grid-cols-3 divide-x divide-border rounded-lg border">
            <div className="flex flex-col items-center gap-0.5 py-2.5">
              <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                {seller.rating?.toFixed(1) || '0.0'}
              </span>
              <span className="text-[11px] text-muted-foreground">{seller.totalReviews || 0} reviews</span>
            </div>
            <div className="flex flex-col items-center gap-0.5 py-2.5">
              <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
                <Package className="h-3.5 w-3.5 text-primary" />
                {seller._count?.products || 0}
              </span>
              <span className="text-[11px] text-muted-foreground">Products</span>
            </div>
            <div className="flex flex-col items-center gap-0.5 py-2.5">
              <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
                <ShoppingBag className="h-3.5 w-3.5 text-primary" />
                {seller._count?.orders || 0}
              </span>
              <span className="text-[11px] text-muted-foreground">Orders</span>
            </div>
          </div>
        </div>
      </div>

      {/* Store Description */}
      {seller.description && (
        <div className="rounded-xl border p-4 bg-muted/30">
          <h2 className="font-semibold mb-2">About the Store</h2>
          <p className="text-muted-foreground whitespace-pre-wrap">{seller.description}</p>
        </div>
      )}

      {/* Promo Toko / Products / Reviews */}
      <Tabs defaultValue={hasActivePromotions ? 'promo' : 'products'} className="space-y-4">
        <TabsList>
          {hasActivePromotions && (
            <TabsTrigger value="promo" className="gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              {t('promotion.storeTab')}
            </TabsTrigger>
          )}
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

        {hasActivePromotions && (
          <TabsContent value="promo" className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('promotion.storeSubtitle')}</p>
            {promoLoading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-64 rounded-lg" />
                ))}
              </div>
            ) : (
              <ProductGrid products={promoData?.data || []} />
            )}
          </TabsContent>
        )}

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
    </div>
  );
}