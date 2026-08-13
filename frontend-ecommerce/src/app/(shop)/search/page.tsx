'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useSellers } from '@/hooks/useSellers';
import { ProductGrid } from '@/components/products/ProductGrid';
import { ProductFilters } from '@/components/products/ProductFilters';
import { ProductSort } from '@/components/products/ProductSort';
import { SearchInput } from '@/components/shared/SearchInput';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Search, Package, Store, FolderTree, X, Filter } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageSkeleton />}>
      <SearchPageContent />
    </Suspense>
  );
}

function SearchPageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-12 w-full" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-square rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const seller = searchParams.get('seller') || '';

  const [searchQuery, setSearchQuery] = useState(query);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 12,
    search: query,
    categoryId: category ? parseInt(category) : undefined,
    sellerId: seller ? parseInt(seller) : undefined,
    sortBy: 'relevance' as string,
  });
  const [activeTab, setActiveTab] = useState('products');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const { data: productsData, isLoading: productsLoading } = useProducts(filters);
  const { data: categoriesData } = useCategories({ limit: 100 });
  const { data: sellersData } = useSellers({ limit: 100, isVerified: true });

  // Update search when URL changes
  useEffect(() => {
    const q = searchParams.get('q') || '';
    const categoryId = searchParams.get('category');
    const sellerId = searchParams.get('seller');
    
    setSearchQuery(q);
    setFilters(prev => ({
      ...prev,
      search: q,
      categoryId: categoryId ? parseInt(categoryId) : undefined,
      sellerId: sellerId ? parseInt(sellerId) : undefined,
      page: 1,
    }));
  }, [searchParams]);

  // Handle search submission
  const handleSearch = (value: string) => {
    const params = new URLSearchParams();
    if (value) params.set('q', value);
    if (filters.categoryId) params.set('category', filters.categoryId.toString());
    if (filters.sellerId) params.set('seller', filters.sellerId.toString());
    router.push(`/search?${params.toString()}`);
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: any) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
    
    // Update URL
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (newFilters.categoryId) params.set('category', newFilters.categoryId.toString());
    if (newFilters.sellerId) params.set('seller', newFilters.sellerId.toString());
    router.push(`/search?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSortChange = (sort: string) => {
    setFilters(prev => ({ ...prev, sortBy: sort, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 12,
      search: searchQuery,
      categoryId: undefined,
      sellerId: undefined,
      sortBy: 'relevance',
    });
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const hasActiveFilters = 
    filters.categoryId !== undefined ||
    filters.sellerId !== undefined;

  // Render search results
  const renderProducts = () => {
    if (productsLoading) {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-square rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-6 w-1/3" />
            </div>
          ))}
        </div>
      );
    }

    if (productsData?.data?.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-6 mb-4">
            <Search className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold">No products found</h3>
          <p className="text-muted-foreground mt-2 max-w-md">
            We couldn't find any products matching your search criteria.
            Try adjusting your filters or search terms.
          </p>
          <Button variant="outline" className="mt-4" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      );
    }

    return (
      <ProductGrid
        products={productsData?.data || []}
        pagination={productsData?.pagination}
        onPageChange={handlePageChange}
      />
    );
  };

  const renderCategories = () => {
    const filteredCategories = categoriesData?.data?.filter((cat: any) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return cat.name.toLowerCase().includes(q) ||
             cat.nameTetum?.toLowerCase().includes(q) ||
             cat.description?.toLowerCase().includes(q);
    });

    if (!filteredCategories || filteredCategories.length === 0) {
      return (
        <div className="text-center py-12">
          <FolderTree className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No categories found matching your search</p>
        </div>
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredCategories.slice(0, 12).map((category: any) => (
          <Link
            key={category.id}
            href={`/categories/${category.slug}`}
            className="group block rounded-lg border p-4 transition-all hover:shadow-md hover:-translate-y-1"
          >
            <div className="flex items-center gap-3">
              {category.image ? (
                <div className="relative h-12 w-12 overflow-hidden rounded-lg">
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <FolderTree className="h-6 w-6 text-primary" />
                </div>
              )}
              <div>
                <h4 className="font-medium group-hover:text-primary transition-colors">
                  {category.name}
                </h4>
                {category.nameTetum && (
                  <p className="text-sm text-muted-foreground">{category.nameTetum}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {category.productCount || 0} products
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    );
  };

  const renderSellers = () => {
    const filteredSellers = sellersData?.data?.filter((seller: any) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return seller.storeName.toLowerCase().includes(q) ||
             seller.description?.toLowerCase().includes(q);
    });

    if (!filteredSellers || filteredSellers.length === 0) {
      return (
        <div className="text-center py-12">
          <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No sellers found matching your search</p>
        </div>
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredSellers.slice(0, 12).map((seller: any) => (
          <Link
            key={seller.id}
            href={`/sellers/${seller.id}`}
            className="group block rounded-lg border p-4 transition-all hover:shadow-md hover:-translate-y-1"
          >
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-primary/10">
                {seller.storeLogo ? (
                  <Image
                    src={seller.storeLogo}
                    alt={seller.storeName}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Store className="h-6 w-6 text-primary" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium group-hover:text-primary transition-colors truncate">
                  {seller.storeName}
                </h4>
                {seller.isVerified && (
                  <Badge variant="default" className="text-xs bg-green-600">
                    Verified
                  </Badge>
                )}
                <p className="text-xs text-muted-foreground">
                  {seller._count?.products || 0} products
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold">Search Results</h1>
        <div className="flex gap-4">
          <div className="flex-1">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              onSearch={handleSearch}
              placeholder="Search for products, categories, sellers..."
              autoFocus
            />
          </div>
          <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden">
                <Filter className="mr-2 h-4 w-4" />
                Filters
                {hasActiveFilters && (
                  <span className="ml-2 h-5 w-5 rounded-full bg-primary text-xs text-primary-foreground flex items-center justify-center">
                    !
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full max-w-sm">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <ProductFilters
                  filters={filters}
                  onFilterChange={(newFilters) => {
                    handleFilterChange(newFilters);
                    setMobileFiltersOpen(false);
                  }}
                  categories={categoriesData?.data || []}
                />
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-4"
                    onClick={() => {
                      clearFilters();
                      setMobileFiltersOpen(false);
                    }}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear All Filters
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
        {query && (
          <p className="text-sm text-muted-foreground">
            Showing results for: <span className="font-medium">"{query}"</span>
            {productsData?.pagination && (
              <span className="ml-2">
                ({productsData.pagination.total} results)
              </span>
            )}
          </p>
        )}
      </div>

      {/* Results Tabs */}
      <Tabs defaultValue="products" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Products
            {productsData?.pagination && (
              <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                {productsData.pagination.total}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <FolderTree className="h-4 w-4" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="sellers" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Sellers
          </TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4 mt-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-muted-foreground"
                >
                  <X className="mr-1 h-3 w-3" />
                  Clear filters
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <ProductSort value={filters.sortBy} onChange={handleSortChange} />
            </div>
          </div>

          {/* Products Grid */}
          {renderProducts()}
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="mt-4">
          {renderCategories()}
        </TabsContent>

        {/* Sellers Tab */}
        <TabsContent value="sellers" className="mt-4">
          {renderSellers()}
        </TabsContent>
      </Tabs>
    </div>
  );
}