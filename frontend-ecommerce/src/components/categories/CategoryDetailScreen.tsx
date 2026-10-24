'use client';

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { useCategoryPage } from '@/hooks/useCategoryPage';
import { useCategoryProducts } from '@/hooks/useCategories';
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
      <div className="space-y-5 px-4 pb-4">
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
    clearFilters,
    setSubcategory,
  } = useCategoryPage(slug);

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
      <div className="mx-auto w-full space-y-5 px-4 pb-4 min-[1000px]:max-w-[1200px]">
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
