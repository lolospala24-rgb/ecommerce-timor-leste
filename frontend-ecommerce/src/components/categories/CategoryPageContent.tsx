'use client';

import { Suspense } from 'react';
import { useCategoryPage } from '@/hooks/useCategoryPage';
import { CategoryBanner, CategoryBreadcrumb } from '@/components/categories/CategoryBanner';
import { CategorySubcategories } from '@/components/categories/CategorySubcategories';
import { DynamicCategoryFilters } from '@/components/categories/DynamicCategoryFilters';
import { ProductGrid } from '@/components/products/ProductGrid';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Package, SlidersHorizontal } from 'lucide-react';
import { countActiveCategoryFilters } from '@/lib/categoryListing';
import { cn } from '@/lib/utils';
import { notFound } from 'next/navigation';

// =============================================================================
// Types
// =============================================================================

interface CategoryPageContentProps {
  slug: string;
}

// =============================================================================
// Category Page Skeleton
// =============================================================================

function CategoryPageSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex items-center gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-20" />
        ))}
      </div>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-muted/50 via-muted/30 to-muted/10">
        <Skeleton className="h-[280px] w-full" />
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-28 rounded-full shrink-0" />
        ))}
      </div>
      <div className="flex gap-8">
        <div className="hidden lg:block w-72 shrink-0">
          <div className="sticky top-24 rounded-xl border bg-card p-6">
            <div className="space-y-6">
              <Skeleton className="h-5 w-24" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-4 w-20" />
                  {Array.from({ length: 3 }).map((_, j) => (
                    <Skeleton key={j} className="h-3 w-full" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-8 w-56" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-28 lg:hidden" />
              <Skeleton className="h-10 w-[280px] rounded-full" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex items-center justify-between pt-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Empty State
// =============================================================================

function EmptyState({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 border-2 border-dashed rounded-2xl bg-muted/5">
      <div className="rounded-full bg-muted/20 p-5 mb-6 ring-4 ring-muted/10">
        <Package className="h-12 w-12 text-muted-foreground/60" />
      </div>
      <h3 className="text-xl font-semibold mb-3">No Products Found</h3>
      <p className="text-muted-foreground text-center max-w-md mb-8 leading-relaxed">
        We couldn&apos;t find any products matching your current filters. Try adjusting
        your search criteria or clearing all filters to see more results.
      </p>
      <Button onClick={onClearFilters} size="lg" className="font-medium">
        Clear All Filters
      </Button>
    </div>
  );
}

// =============================================================================
// Active Filters Bar
// =============================================================================

function ActiveFiltersBar({
  activeCount,
  onClear,
}: {
  activeCount: number;
  onClear: () => void;
}) {
  if (activeCount === 0) return null;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
          {activeCount}
        </span>
        Active Filters
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClear}
        className="ml-auto h-7 text-xs hover:bg-primary/10 hover:text-primary"
      >
        Clear all
      </Button>
    </div>
  );
}

// =============================================================================
// Sort Controls - Popular / Newest
// =============================================================================

function SortControls({
  activeSort,
  onChange,
  options,
}: {
  activeSort: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  const sortOptions = options.length > 0 ? options : [{ value: 'newest', label: 'Terbaru' }];

  return (
    <div className="flex items-center gap-2 md:gap-3 flex-wrap">
      <span className="text-xs md:text-sm font-medium text-muted-foreground hidden sm:inline-block">
        Urutkan
      </span>

      <div className="flex items-center bg-muted/20 rounded-full p-0.5 md:p-1 border border-border/40 shadow-sm overflow-x-auto">
        <div className="flex items-center gap-0.5 md:gap-1">
          {sortOptions.map((option) => {
            const isActive = activeSort === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange(option.value)}
                className={cn(
                  'px-4 md:px-5 py-1 md:py-1.5 text-xs md:text-sm font-medium rounded-full',
                  'transition-all duration-200',
                  'hover:scale-105 active:scale-95',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1',
                  'whitespace-nowrap',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                    : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                )}
                aria-pressed={isActive}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Mobile Filter Sheet
// =============================================================================

function MobileFilterSheet({
  activeFilterCount,
  children,
}: {
  activeFilterCount: number;
  children: React.ReactNode;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="lg:hidden shrink-0 relative group transition-all duration-200 hover:border-primary/50"
        >
          <SlidersHorizontal className="h-4 w-4 mr-2 transition-transform group-hover:rotate-90 duration-300" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full max-w-sm overflow-y-auto">
        <SheetHeader className="border-b pb-4 mb-4">
          <SheetTitle className="text-lg font-semibold flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                {activeFilterCount} active
              </span>
            )}
          </SheetTitle>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}

// =============================================================================
// Category Description Section
// =============================================================================

function CategoryDescription({
  name,
  description,
}: {
  name: string;
  description: string;
}) {
  if (!description || description.length <= 120) return null;

  return (
    <section className="border-t pt-8 mt-4">
      <div className="max-w-3xl">
        <h2 className="text-xl font-semibold mb-3">About {name}</h2>
        <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed">
          <p>{description}</p>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// Product Grid Section
// =============================================================================

function ProductGridSection({
  isLoading,
  products,
  pagination,
  onPageChange,
  onClearFilters,
}: {
  isLoading: boolean;
  products: any[];
  pagination: any;
  onPageChange: (page: number) => void;
  onClearFilters: () => void;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card overflow-hidden">
            <Skeleton className="h-48 w-full" />
            <div className="p-4 space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex items-center justify-between pt-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return <EmptyState onClearFilters={onClearFilters} />;
  }

  return (
    <ProductGrid
      products={products}
      pagination={pagination}
      onPageChange={onPageChange}
      columns={3}
    />
  );
}

// =============================================================================
// Page Title Component
// =============================================================================

function PageTitle({
  category,
  filters,
}: {
  category: any;
  filters: any;
}) {
  if (filters.search) {
    return `Results for "${filters.search}"`;
  }

  if (filters.subcategoryId) {
    return (
      category.children?.find((c: any) => c.id === filters.subcategoryId)?.name ||
      category.name
    );
  }

  return category.name;
}

// =============================================================================
// Inner Category Page
// =============================================================================

function CategoryPageInner({ slug }: CategoryPageContentProps) {
  const {
    filters,
    category,
    categoryLoading,
    categoryError,
    filterData,
    filtersLoading,
    productsData,
    productsLoading,
    productsFetching,
    sortOptions,
    updateFilters,
    setPage,
    setSort,
    clearFilters,
    toggleAttribute,
    toggleBrand,
    setSubcategory,
  } = useCategoryPage(slug);

  if ((!categoryLoading && !category) || categoryError) {
    notFound();
  }

  if (categoryLoading || !category) {
    return <CategoryPageSkeleton />;
  }

  const activeFilterCount = countActiveCategoryFilters(filters);
  const totalProducts = productsData?.pagination?.total ?? 0;

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb">
        <CategoryBreadcrumb category={category} />
      </nav>

      {/* Banner */}
      <CategoryBanner category={category} productCount={totalProducts} />

      {/* Subcategories */}
      {category.children && category.children.length > 0 && (
        <section aria-label="Subcategories" className="overflow-x-auto pb-2">
          <CategorySubcategories
            children={category.children}
            activeSubcategoryId={filters.subcategoryId}
            onSelect={setSubcategory}
          />
        </section>
      )}

      {/* Active Filters */}
      <ActiveFiltersBar
        activeCount={activeFilterCount}
        onClear={clearFilters}
      />

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8" id="products">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-72 shrink-0" aria-label="Filters">
          <div className="sticky top-24 rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Filters</h2>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                >
                  Reset
                </Button>
              )}
            </div>
            <DynamicCategoryFilters
              facets={filterData?.filters || []}
              filters={filters}
              isLoading={filtersLoading}
              onFilterChange={updateFilters}
              onToggleAttribute={toggleAttribute}
              onToggleBrand={toggleBrand}
              onClear={clearFilters}
            />
          </div>
        </aside>

        {/* Products Area */}
        <main className="flex-1 min-w-0 space-y-6">
          {/* Header - Responsive */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight">
                <PageTitle category={category} filters={filters} />
              </h1>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              {/* Mobile Filters */}
              <MobileFilterSheet activeFilterCount={activeFilterCount}>
                <DynamicCategoryFilters
                  facets={filterData?.filters || []}
                  filters={filters}
                  isLoading={filtersLoading}
                  onFilterChange={updateFilters}
                  onToggleAttribute={toggleAttribute}
                  onToggleBrand={toggleBrand}
                  onClear={clearFilters}
                />
              </MobileFilterSheet>

              {/* Sort Controls */}
              <SortControls
                activeSort={filters.sortBy}
                onChange={setSort}
                options={sortOptions}
              />
            </div>
          </div>

          {/* Product Grid */}
          <ProductGridSection
            isLoading={productsLoading}
            products={productsData?.data || []}
            pagination={productsData?.pagination}
            onPageChange={setPage}
            onClearFilters={clearFilters}
          />
        </main>
      </div>

      {/* Category Description */}
      <CategoryDescription
        name={category.name}
        description={category.description || ''}
      />
    </div>
  );
}

// =============================================================================
// Main Export
// =============================================================================

export function CategoryPageContent({ slug }: CategoryPageContentProps) {
  return (
    <Suspense fallback={<CategoryPageSkeleton />}>
      <CategoryPageInner slug={slug} />
    </Suspense>
  );
}