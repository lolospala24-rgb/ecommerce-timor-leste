'use client';

import { useEffect, useState } from 'react';
import { SlidersHorizontal, Loader2, Search } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { countActiveCategoryFilters } from '@/lib/categoryListing';
import { ProductCard } from '@/components/products/ProductCard';
import { SortTabs } from '@/components/products/list/SortTabs';
import { EmptyState } from '@/components/shared/EmptyState';
import { CategoryFilterSheet } from './CategoryFilterSheet';
import type { Category, CategoryFilterFacet, CategoryListingFilters, CategoryProductsResponse } from '@/types/category.types';

interface CategoryProductSectionProps {
  slug: string;
  filters: CategoryListingFilters;
  productsData?: CategoryProductsResponse;
  productsLoading: boolean;
  productsFetching: boolean;
  facets: CategoryFilterFacet[];
  setSort: (sortBy: string) => void;
  setPage: (page: number) => void;
  updateFilters: (patch: Partial<CategoryListingFilters>) => void;
  clearFilters: () => void;
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 min-[600px]:grid-cols-3 min-[1000px]:grid-cols-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="aspect-square animate-pulse rounded-xl bg-[#F4F6F3]" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-[#F4F6F3]" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-[#F4F6F3]" />
        </div>
      ))}
    </div>
  );
}

export function CategoryProductSection({
  slug,
  filters,
  productsData,
  productsLoading,
  productsFetching,
  facets,
  setSort,
  setPage,
  updateFilters,
  clearFilters,
}: CategoryProductSectionProps) {
  const { t } = useTranslation();
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [allItems, setAllItems] = useState<any[]>([]);

  // Same accumulate-on-page-increment pattern as the All Products redesign:
  // useCategoryPage's updateFilters always resets page to 1 on any real
  // filter/sort/subcategory change, so the page===1 branch below doubles as
  // the reset — no separate "clear accumulator" wiring needed.
  useEffect(() => {
    if (!productsData?.data) return;
    if (filters.page === 1) {
      setAllItems(productsData.data);
    } else {
      setAllItems((prev) => {
        const seen = new Set(prev.map((p: any) => p.id));
        return [...prev, ...productsData.data.filter((p: any) => !seen.has(p.id))];
      });
    }
  }, [productsData, filters.page]);

  const total = productsData?.pagination?.total ?? 0;
  const hasMore = !!productsData?.pagination && filters.page < productsData.pagination.totalPages;
  const activeFilterCount = countActiveCategoryFilters(filters);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-extrabold text-[#142019]">{t('category.productsTitle')}</h2>
          <p className="text-[12px] text-[#56635B]">{t('productList.resultCountAll', { count: total })}</p>
        </div>
        <button
          type="button"
          onClick={() => setFilterSheetOpen(true)}
          className="flex items-center gap-1.5 rounded-[10px] border border-[#17703F] bg-white px-3 py-1.5 text-[13px] font-semibold text-[#17703F] min-h-[32px]"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {t('productList.filterButton')}
          {activeFilterCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#17703F] px-1 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      <SortTabs sortBy={filters.sortBy} onChange={setSort} />

      {productsLoading && allItems.length === 0 ? (
        <ProductGridSkeleton />
      ) : allItems.length === 0 ? (
        <EmptyState
          title={t('category.emptyProducts')}
          icon={<Search className="h-10 w-10 text-muted-foreground" />}
          action={activeFilterCount > 0 ? { label: t('productList.clearFilters'), onClick: clearFilters } : undefined}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 min-[600px]:grid-cols-3 min-[1000px]:grid-cols-4">
            {allItems.map((product, index) => (
              <ProductCard key={product.id} product={product} isLocal={product.isLocallyMade} priority={index < 4} />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => setPage(filters.page + 1)}
                disabled={productsFetching}
                className="flex h-11 items-center gap-2 rounded-2xl border border-[#DDE3DE] bg-white px-6 text-[14px] font-semibold text-[#142019] disabled:opacity-60"
              >
                {productsFetching && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('category.loadMore')}
              </button>
            </div>
          )}
        </>
      )}

      <CategoryFilterSheet
        open={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        slug={slug}
        facets={facets}
        filters={filters}
        onApply={updateFilters}
      />
    </div>
  );
}
