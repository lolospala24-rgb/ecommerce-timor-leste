'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSellers } from '@/hooks/useSellers';
import { SearchInput } from '@/components/shared/SearchInput';
import { Pagination } from '@/components/shared/Pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Store, Star, Package, ShoppingBag, MapPin, ChevronRight } from 'lucide-react';

export default function SellersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    page: 1,
    limit: 12,
    search: '',
    isVerified: true,
  });

  const { data, isLoading } = useSellers(filters);

  const filteredSellers = data?.data?.filter((seller: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      seller.storeName.toLowerCase().includes(query) ||
      seller.description?.toLowerCase().includes(query) ||
      seller.user?.name.toLowerCase().includes(query)
    );
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setFilters(prev => ({ ...prev, search: query, page: 1 }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32 mt-1" />
          </div>
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Sellers</h1>
          <p className="text-muted-foreground">
            Discover products from trusted sellers in Timor-Leste
          </p>
        </div>
        <div className="w-full sm:w-72">
          <SearchInput
            placeholder="Search sellers..."
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border p-4 bg-card">
          <div className="flex items-center gap-3">
            <Store className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{data?.pagination?.total || 0}</p>
              <p className="text-sm text-muted-foreground">Total Sellers</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border p-4 bg-card">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">
                {filteredSellers?.reduce((acc: number, seller: any) => acc + (seller._count?.products || 0), 0) || 0}
              </p>
              <p className="text-sm text-muted-foreground">Products (this page)</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border p-4 bg-card">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">
                {filteredSellers?.reduce((acc: number, seller: any) => acc + (seller._count?.orders || 0), 0) || 0}
              </p>
              <p className="text-sm text-muted-foreground">Orders (this page)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sellers Grid */}
      {filteredSellers?.length === 0 ? (
        <div className="text-center py-12">
          <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No Sellers Found</h3>
          <p className="text-muted-foreground">
            {searchQuery ? 'No sellers match your search' : 'Sellers will appear here'}
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap justify-center gap-6">
          {filteredSellers?.map((seller: any) => (
            <div key={seller.id} className="w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)]">
              <SellerCard seller={seller} />
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <Pagination
          currentPage={filters.page}
          totalPages={data.pagination.totalPages}
          totalItems={data.pagination.total}
          pageSize={data.pagination.limit}
          onPageChange={(page) => setFilters(prev => ({ ...prev, page }))}
          showTotal={false}
          className="mt-6"
        />
      )}
    </div>
  );
}

// Seller Card Component
function SellerCard({ seller }: { seller: any }) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Link
      href={`/sellers/${seller.id}`}
      className="group block overflow-hidden rounded-2xl border border-slate-100 bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
    >
      <div className="p-6">
        {/* Store Header */}
        <div className="flex items-start gap-4">
          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-primary/10">
            {seller.storeLogo ? (
              <Image
                src={seller.storeLogo}
                alt={seller.storeName}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="text-lg font-bold text-primary">
                  {getInitials(seller.storeName)}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                {seller.storeName}
              </h3>
              {seller.isVerified && (
                <Badge variant="default" className="text-xs bg-green-600">
                  Verified
                </Badge>
              )}
            </div>
            {seller.user?.name && (
              <p className="text-sm text-muted-foreground">
                by {seller.user.name}
              </p>
            )}
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                <span>{seller.rating?.toFixed(1) || '0'}</span>
              </div>
              <span>•</span>
              <span>{seller._count?.products || 0} products</span>
            </div>
          </div>
        </div>

        {/* Store Description */}
        {seller.description && (
          <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
            {seller.description}
          </p>
        )}

        {/* Store Stats */}
        <div className="mt-4 flex items-center justify-between border-t pt-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Package className="h-4 w-4" />
              <span>{seller._count?.products || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <ShoppingBag className="h-4 w-4" />
              <span>{seller._count?.orders || 0}</span>
            </div>
          </div>
          <div className="flex items-center text-sm text-primary font-medium">
            Visit Store
            <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </div>

        {/* Store Address */}
        {seller.storeAddress && (
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{seller.storeAddress}</span>
          </div>
        )}
      </div>
    </Link>
  );
}