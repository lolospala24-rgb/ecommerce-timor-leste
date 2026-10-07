'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ProductCard } from '@/components/products/ProductCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useLocalOriginMunicipalities } from '@/hooks/useLocalOriginMunicipalities';
import { useCartStore } from '@/stores/cartStore';
import { useDebounce } from '@/hooks/useDebounce';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { CategoryChipBar } from '@/components/products/list/CategoryChipBar';
import { SortTabs } from '@/components/products/list/SortTabs';
import { QuickFilterBar } from '@/components/products/list/QuickFilterBar';
import { ViewModeToggle, type ViewMode } from '@/components/products/list/ViewModeToggle';
import { ProductListTile } from '@/components/products/list/ProductListTile';
import {
  FilterSheet,
  FilterFields,
  EMPTY_PRODUCT_LIST_FILTERS,
  type ProductListFilterValues,
} from '@/components/products/list/FilterSheet';
import { ArrowLeft, ArrowUp, Loader2, Search, ShoppingCart, SlidersHorizontal } from 'lucide-react';

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsPageSkeleton mode="grid" />}>
      <ProductsPageContent />
    </Suspense>
  );
}

function ProductsPageSkeleton({ mode }: { mode: ViewMode }) {
  if (mode === 'list') {
    return (
      <div className="space-y-3 px-4 py-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex gap-3 rounded-2xl border border-[#DDE3DE] bg-white p-3">
            <div className="h-[120px] w-[120px] shrink-0 animate-pulse rounded-xl bg-[#F4F6F3]" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 w-3/4 animate-pulse rounded bg-[#F4F6F3]" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-[#F4F6F3]" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-[#F4F6F3]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 px-4 py-4 min-[600px]:grid-cols-3 min-[1000px]:grid-cols-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="aspect-square animate-pulse rounded-xl bg-[#F4F6F3]" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-[#F4F6F3]" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-[#F4F6F3]" />
        </div>
      ))}
    </div>
  );
}

// Mirrors ProductSort's own option list — validated against this so an
// arbitrary/unexpected ?sortBy= value in a shared link can't silently pass
// through as-is; anything unrecognized just falls back to "newest".
const VALID_SORT_VALUES = new Set([
  'relevance',
  'featured',
  'newest',
  'best_selling',
  'rating',
  'price_asc',
  'price_desc',
  'name_asc',
  'name_desc',
]);

const PAGE_SIZE = 20;
const BACK_TO_TOP_THRESHOLD = 600;

function toFilterValues(filters: {
  minPrice?: number;
  maxPrice?: number;
  originMunicipality?: string;
  minRating?: number;
  inStock?: boolean;
  isLocallyMade?: boolean;
}): ProductListFilterValues {
  return {
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    originMunicipality: filters.originMunicipality,
    minRating: filters.minRating,
    inStock: filters.inStock,
    isLocallyMade: filters.isLocallyMade,
  };
}

function ProductsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const sortFromUrl = searchParams.get('sortBy');
  const initialSortBy = sortFromUrl && VALID_SORT_VALUES.has(sortFromUrl) ? sortFromUrl : 'newest';

  const [filters, setFilters] = useState({
    page: 1,
    limit: PAGE_SIZE,
    search: searchParams.get('q') || '',
    categoryId: searchParams.get('category') ? parseInt(searchParams.get('category')!) : undefined,
    minPrice: searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined,
    maxPrice: searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined,
    sortBy: initialSortBy,
    inStock: undefined as boolean | undefined,
    minRating: undefined as number | undefined,
    isLocallyMade: undefined as boolean | undefined,
    originMunicipality: undefined as string | undefined,
  });

  const [searchInput, setSearchInput] = useState(filters.search);
  const debouncedSearch = useDebounce(searchInput, 400);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isFetching, isError, refetch } = useProducts(filters);
  const { data: categories } = useCategories({ limit: 100 });
  const { data: municipalities } = useLocalOriginMunicipalities();
  const cartCount = useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));

  // Update filters when URL params change (shared links, header search bar).
  useEffect(() => {
    const category = searchParams.get('category');
    const q = searchParams.get('q');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const sortBy = searchParams.get('sortBy');

    setFilters((prev) => ({
      ...prev,
      search: q || '',
      categoryId: category ? parseInt(category) : undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      sortBy: sortBy && VALID_SORT_VALUES.has(sortBy) ? sortBy : prev.sortBy,
      page: 1,
    }));
    setSearchInput(q || '');
    setAllItems([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Debounced in-page search box — separate from the URL-driven ?q= sync
  // above so typing here doesn't fight that effect.
  useEffect(() => {
    if (debouncedSearch === filters.search) return;
    setFilters((prev) => ({ ...prev, search: debouncedSearch, page: 1 }));
    setAllItems([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const handleSortChange = (sortBy: string) => {
    setFilters((prev) => ({ ...prev, sortBy, page: 1 }));
    setAllItems([]);
  };

  const handleCategorySelect = (categoryId: number | undefined) => {
    setFilters((prev) => ({ ...prev, categoryId, page: 1 }));
    setAllItems([]);
  };

  const handleMunicipalityQuickToggle = (municipality: string) => {
    setFilters((prev) => ({
      ...prev,
      originMunicipality: prev.originMunicipality === municipality ? undefined : municipality,
      page: 1,
    }));
    setAllItems([]);
  };

  const handleFilterApply = (values: ProductListFilterValues) => {
    setFilters((prev) => ({ ...prev, ...values, page: 1 }));
    setAllItems([]);
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: PAGE_SIZE,
      search: '',
      categoryId: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      sortBy: 'newest',
      inStock: undefined,
      minRating: undefined,
      isLocallyMade: undefined,
      originMunicipality: undefined,
    });
    setSearchInput('');
    setAllItems([]);
    router.push('/products');
  };

  const hasActiveFilters =
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.inStock !== undefined ||
    filters.minRating !== undefined ||
    filters.isLocallyMade !== undefined ||
    filters.originMunicipality !== undefined;

  const activeFilterCount = [
    filters.minPrice !== undefined || filters.maxPrice !== undefined,
    filters.inStock !== undefined,
    filters.minRating !== undefined,
    filters.isLocallyMade !== undefined,
    filters.originMunicipality !== undefined,
  ].filter(Boolean).length;

  // Accumulate pages client-side for infinite scroll; each fetch still goes
  // through the exact same useProducts(filters)/page param the old
  // page-click pagination used, just appended instead of replaced.
  useEffect(() => {
    if (!data?.data) return;
    if (filters.page === 1) {
      setAllItems(data.data);
    } else {
      setAllItems((prev) => {
        const seen = new Set(prev.map((p: any) => p.id));
        return [...prev, ...data.data.filter((p: any) => !seen.has(p.id))];
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const pagination = data?.pagination;
  const hasMore = !!pagination && filters.page < pagination.totalPages;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetching) {
          setFilters((prev) => ({ ...prev, page: prev.page + 1 }));
        }
      },
      { rootMargin: '600px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isFetching]);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > BACK_TO_TOP_THRESHOLD);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const categoryList = categories?.data || [];
  const municipalityList = municipalities || [];
  const activeCategoryName = categoryList.find((c: any) => c.id === filters.categoryId)?.name;

  const resultLabel = filters.search
    ? t('productList.resultCountSearch', { count: pagination?.total ?? 0, query: filters.search })
    : activeCategoryName
      ? t('productList.resultCountCategory', { count: pagination?.total ?? 0, category: activeCategoryName })
      : t('productList.resultCountAll', { count: pagination?.total ?? 0 });

  const sheetFilterValues = toFilterValues(filters);

  // The >=1000px sidebar applies live (no "show results" tap like the mobile
  // sheet), so its own local draft is debounced before writing into
  // `filters` — otherwise every keystroke in the price inputs would refetch.
  const [desktopDraft, setDesktopDraft] = useState<ProductListFilterValues>(sheetFilterValues);
  const debouncedDesktopDraft = useDebounce(desktopDraft, 400);
  useEffect(() => {
    setDesktopDraft(sheetFilterValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.minPrice, filters.maxPrice, filters.originMunicipality, filters.minRating, filters.isLocallyMade, filters.inStock]);
  useEffect(() => {
    const current = toFilterValues(filters);
    const changed =
      debouncedDesktopDraft.minPrice !== current.minPrice ||
      debouncedDesktopDraft.maxPrice !== current.maxPrice ||
      debouncedDesktopDraft.originMunicipality !== current.originMunicipality ||
      debouncedDesktopDraft.minRating !== current.minRating ||
      debouncedDesktopDraft.isLocallyMade !== current.isLocallyMade ||
      debouncedDesktopDraft.inStock !== current.inStock;
    if (!changed) return;
    setFilters((prev) => ({ ...prev, ...debouncedDesktopDraft, page: 1 }));
    setAllItems([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedDesktopDraft]);

  return (
    <div className="min-h-screen bg-[#F4F6F3] pb-6">
      <div className="flex items-center gap-2 border-b border-[#EEF1EE] bg-white px-4 py-3">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label={t('productList.close')}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F4F6F3] text-[#142019]"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#56635B]" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('productList.searchPlaceholder')}
            className="h-11 w-full rounded-full border border-[#DDE3DE] bg-[#F4F6F3] pl-9 pr-4 text-[14px] text-[#142019] outline-none focus:border-[#17703F]"
          />
        </div>
        <Link
          href="/cart"
          aria-label="Karreta"
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F4F6F3] text-[#142019]"
        >
          <ShoppingCart className="h-5 w-5" />
          {cartCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#B4410F] px-1 text-[10px] font-semibold text-white">
              {cartCount > 9 ? '9+' : cartCount}
            </span>
          )}
        </Link>
      </div>

      <div className="bg-white">
        <CategoryChipBar categories={categoryList} selectedId={filters.categoryId} onSelect={handleCategorySelect} />
      </div>

      <SortTabs sortBy={filters.sortBy} onChange={handleSortChange} />

      <div className="flex items-center gap-2 border-b border-[#EEF1EE] bg-white px-4 py-2">
        <button
          type="button"
          onClick={() => setFilterSheetOpen(true)}
          className="flex min-[1000px]:hidden items-center gap-1.5 rounded-[10px] border border-[#DDE3DE] bg-white px-3 py-1.5 text-[13px] font-semibold text-[#142019] min-h-[32px]"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {t('productList.filterButton')}
          {activeFilterCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#17703F] px-1 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <QuickFilterBar
            municipalities={municipalityList}
            selected={filters.originMunicipality}
            onToggle={handleMunicipalityQuickToggle}
          />
        </div>
      </div>

      <div className="mx-auto w-full min-[1000px]:flex min-[1000px]:max-w-[1200px] min-[1000px]:gap-6 min-[1000px]:px-6 min-[1000px]:py-5">
        <aside className="hidden w-[280px] shrink-0 min-[1000px]:block">
          <div className="sticky top-5 rounded-2xl border border-[#DDE3DE] bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[15px] font-bold text-[#142019]">{t('productList.filterButton')}</p>
              <button
                type="button"
                onClick={() => setDesktopDraft(EMPTY_PRODUCT_LIST_FILTERS)}
                className="text-[13px] font-semibold text-[#17703F]"
              >
                {t('productList.resetAll')}
              </button>
            </div>
            <FilterFields draft={desktopDraft} onDraftChange={setDesktopDraft} municipalities={municipalityList} />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between px-4 py-3 min-[1000px]:px-0">
            <p className="text-[13px] font-medium text-[#56635B]">{resultLabel}</p>
            <ViewModeToggle mode={viewMode} onChange={setViewMode} />
          </div>

          {isLoading && allItems.length === 0 ? (
            <ProductsPageSkeleton mode={viewMode} />
          ) : isError ? (
            <div className="px-4">
              <EmptyState
                title={t('productList.errorTitle')}
                icon={<Search className="h-10 w-10 text-muted-foreground" />}
                action={{ label: t('productList.tryAgain'), onClick: () => refetch() }}
              />
            </div>
          ) : allItems.length === 0 ? (
            <div className="px-4">
              <EmptyState
                title={t('productList.empty')}
                icon={<Search className="h-10 w-10 text-muted-foreground" />}
                action={{ label: t('productList.clearFilters'), onClick: clearFilters }}
              />
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 gap-3 px-4 py-1 min-[600px]:grid-cols-3 min-[1000px]:grid-cols-4 min-[1000px]:px-0">
              {allItems.map((product, index) => (
                <ProductCard key={product.id} product={product} isLocal={product.isLocallyMade} priority={index < 4} />
              ))}
            </div>
          ) : (
            <div className="space-y-3 px-4 py-1 min-[1000px]:px-0">
              {allItems.map((product) => (
                <ProductListTile key={product.id} product={product} />
              ))}
            </div>
          )}

          {!isLoading && allItems.length > 0 && (
            <div ref={sentinelRef} className="flex items-center justify-center py-6">
              {isFetching && filters.page > 1 && (
                <span className="flex items-center gap-2 text-[13px] text-[#56635B]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('productList.loadingMore')}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {showBackToTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label={t('productList.backToTop')}
          className="fixed bottom-24 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#142019] shadow-[0_2px_10px_rgba(0,0,0,0.15)] min-[1000px]:bottom-8"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}

      <FilterSheet
        open={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        filters={sheetFilterValues}
        baseFilters={{ search: filters.search, categoryId: filters.categoryId, sortBy: filters.sortBy }}
        municipalities={municipalityList}
        onApply={handleFilterApply}
      />
    </div>
  );
}
