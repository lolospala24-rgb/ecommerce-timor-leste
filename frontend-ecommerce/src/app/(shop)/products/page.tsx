'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProductGrid } from '@/components/products/ProductGrid';
import { ProductFilters } from '@/components/products/ProductFilters';
import { ProductSort } from '@/components/products/ProductSort';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { SlidersHorizontal, X } from 'lucide-react';

export default function ProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [filters, setFilters] = useState({
    page: 1,
    limit: 12,
    search: searchParams.get('q') || '',
    categoryId: searchParams.get('category') ? parseInt(searchParams.get('category')!) : undefined,
    minPrice: searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined,
    maxPrice: searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined,
    sortBy: 'newest' as string,
    inStock: undefined as boolean | undefined,
    minRating: undefined as number | undefined,
  });
  
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const { data, isLoading, refetch } = useProducts(filters);
  const { data: categories } = useCategories({ limit: 100 });

  // Update filters when URL params change
  useEffect(() => {
    const category = searchParams.get('category');
    const q = searchParams.get('q');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');

    setFilters(prev => ({
      ...prev,
      search: q || '',
      categoryId: category ? parseInt(category) : undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      page: 1,
    }));
  }, [searchParams]);

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSortChange = (sort: string) => {
    setFilters(prev => ({ ...prev, sortBy: sort, page: 1 }));
  };

  const handleFilterChange = (newFilters: any) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 12,
      search: '',
      categoryId: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      sortBy: 'newest',
      inStock: undefined,
      minRating: undefined,
    });
    router.push('/products');
  };

  const hasActiveFilters = 
    filters.categoryId !== undefined ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.inStock !== undefined ||
    filters.minRating !== undefined;

  return (
    <div className="flex flex-col md:flex-row gap-6 md:gap-8">
      {/* Sidebar Filters - Desktop */}
      <aside className="hidden md:block w-64 flex-shrink-0">
        <div className="sticky top-20 space-y-4">
          <ProductFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            categories={categories?.data || []}
          />
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={clearFilters}
            >
              <X className="mr-2 h-4 w-4" />
              Clear All Filters
            </Button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">
              {filters.search ? `Results for "${filters.search}"` : 'All Products'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {data?.pagination?.total || 0} products found
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Mobile Filter Button */}
            <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="md:hidden w-full sm:w-auto">
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
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
                    categories={categories?.data || []}
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

            {/* Sort */}
            <div className="w-full sm:w-auto">
              <ProductSort value={filters.sortBy} onChange={handleSortChange} />
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {isLoading ? (
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
        ) : (
          <ProductGrid
            products={data?.data || []}
            pagination={data?.pagination}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </div>
  );
}