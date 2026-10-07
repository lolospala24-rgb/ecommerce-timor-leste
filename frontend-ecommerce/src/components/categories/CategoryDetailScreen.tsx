'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Search, ShoppingCart, X } from 'lucide-react';
import { useCategoryPage } from '@/hooks/useCategoryPage';
import { useCategoryProducts } from '@/hooks/useCategories';
import { useCartStore } from '@/stores/cartStore';
import { useDebounce } from '@/hooks/useDebounce';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { getProductPricing } from '@/lib/pricing';
import { CategoryHero } from './CategoryHero';
import { SubCategorySelector } from './SubCategorySelector';
import { DealCarousel } from './DealCarousel';
import { CategoryProductSection } from './CategoryProductSection';

interface CategoryDetailScreenProps {
  slug: string;
}

function CategoryDetailSkeleton() {
  return (
    <div className="min-h-screen bg-[#F4F6F3] pb-6">
      <div className="h-[60px] border-b border-[#EEF1EE] bg-white" />
      <div className="space-y-5 px-4 py-4">
        <div className="h-40 animate-pulse rounded-[20px] bg-[#F4F6F3]" />
        <div className="flex gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-[60px] w-[60px] shrink-0 animate-pulse rounded-full bg-[#F4F6F3]" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-xl bg-[#F4F6F3]" />
          ))}
        </div>
      </div>
    </div>
  );
}

function CategoryDetailInner({ slug }: CategoryDetailScreenProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const cartCount = useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 400);

  const {
    filters,
    category,
    categoryLoading,
    categoryError,
    filterData,
    productsData,
    productsLoading,
    productsFetching,
    updateFilters,
    setPage,
    setSort,
    setSearch,
    clearFilters,
    setSubcategory,
  } = useCategoryPage(slug);

  useEffect(() => {
    if (debouncedSearch !== filters.search) setSearch(debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Small, separate "newest 20" fetch scoped to the active subcategory (or
  // the whole category) — each product already carries real promotion/
  // comparePrice fields (same ones ProductCard's own badge reads), so the
  // "on sale right now" subset is derived here, never fabricated. Returns
  // nothing (DealCarousel hides itself) when no product is actually promoted.
  const { data: dealsData } = useCategoryProducts(slug, {
    page: 1,
    limit: 20,
    search: '',
    sortBy: 'newest',
    subcategoryId: filters.subcategoryId,
    attributes: {},
  });
  const dealProducts = ((dealsData?.data as any[] | undefined) ?? [])
    .filter((p) => getProductPricing(p).discountPercent > 0)
    .slice(0, 10);
  const maxDiscount = dealProducts.reduce((max, p) => Math.max(max, getProductPricing(p).discountPercent), 0);

  if ((!categoryLoading && !category) || categoryError) {
    notFound();
  }
  if (categoryLoading || !category) {
    return <CategoryDetailSkeleton />;
  }

  const children = category.children ?? [];
  const activeSubcategory = children.find((c) => c.id === filters.subcategoryId);
  const sectionName = activeSubcategory?.name || category.name;
  const totalProducts = productsData?.pagination?.total ?? category.productCount ?? 0;

  return (
    <div className="min-h-screen bg-[#F4F6F3] pb-6">
      <div className="flex items-center gap-2 border-b border-[#EEF1EE] bg-white px-4 py-3">
        {searchOpen ? (
          <>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#56635B]" />
              <input
                autoFocus
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={category.name}
                className="h-11 w-full rounded-full border border-[#DDE3DE] bg-[#F4F6F3] pl-9 pr-4 text-[14px] text-[#142019] outline-none focus:border-[#17703F]"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchOpen(false);
                setSearchInput('');
              }}
              aria-label={t('productList.close')}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F4F6F3] text-[#142019]"
            >
              <X className="h-5 w-5" />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => router.back()}
              aria-label={t('category.backAria')}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F4F6F3] text-[#142019]"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="flex-1 truncate text-[17px] font-extrabold text-[#142019]">{category.name}</h1>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label={t('category.searchAria')}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F4F6F3] text-[#142019]"
            >
              <Search className="h-5 w-5" />
            </button>
            <Link
              href="/cart"
              aria-label={t('category.cartAria')}
              className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F4F6F3] text-[#142019]"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#B4410F] px-1 text-[10px] font-semibold text-white">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>
          </>
        )}
      </div>

      <div className="mx-auto w-full space-y-5 px-4 py-4 min-[1000px]:max-w-[1200px]">
        <CategoryHero category={category} productCount={totalProducts} maxDiscountPercent={maxDiscount} />

        <SubCategorySelector
          category={category}
          children={children}
          activeSubcategoryId={filters.subcategoryId}
          onSelect={setSubcategory}
        />

        <DealCarousel sectionName={sectionName} products={dealProducts} />

        <CategoryProductSection
          slug={slug}
          filters={filters}
          productsData={productsData}
          productsLoading={productsLoading}
          productsFetching={productsFetching}
          facets={filterData?.filters ?? []}
          setSort={setSort}
          setPage={setPage}
          updateFilters={updateFilters}
          clearFilters={clearFilters}
        />
      </div>
    </div>
  );
}

export function CategoryDetailScreen({ slug }: CategoryDetailScreenProps) {
  return (
    <Suspense fallback={<CategoryDetailSkeleton />}>
      <CategoryDetailInner slug={slug} />
    </Suspense>
  );
}
