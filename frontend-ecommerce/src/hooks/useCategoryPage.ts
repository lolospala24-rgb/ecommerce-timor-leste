'use client';

import { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  buildCategoryListingSearchParams,
  DEFAULT_CATEGORY_LISTING_FILTERS,
  parseCategoryListingParams,
} from '@/lib/categoryListing';
import { useCategory, useCategoryFilters, useCategoryProducts } from '@/hooks/useCategories';
import type { CategoryListingFilters } from '@/types/category.types';

export function useCategoryPage(slug: string) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => parseCategoryListingParams(searchParams),
    [searchParams],
  );

  const { data: category, isLoading: categoryLoading, isError: categoryError } = useCategory(slug);
  const { data: filterData, isLoading: filtersLoading } = useCategoryFilters(slug);
  const {
    data: productsData,
    isLoading: productsLoading,
    isFetching: productsFetching,
  } = useCategoryProducts(slug, filters);

  const updateFilters = useCallback(
    (patch: Partial<CategoryListingFilters>, resetPage = true) => {
      const next: CategoryListingFilters = {
        ...filters,
        ...patch,
        page: resetPage ? 1 : patch.page ?? filters.page,
      };
      const params = buildCategoryListingSearchParams(next);
      const query = params.toString();
      router.push(query ? `/categories/${slug}?${query}` : `/categories/${slug}`, {
        scroll: false,
      });
    },
    [filters, router, slug],
  );

  const setPage = useCallback(
    (page: number) => {
      updateFilters({ page }, false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [updateFilters],
  );

  const setSort = useCallback(
    (sortBy: string) => updateFilters({ sortBy }),
    [updateFilters],
  );

  const setSearch = useCallback(
    (search: string) => updateFilters({ search }),
    [updateFilters],
  );

  const clearFilters = useCallback(() => {
    router.push(`/categories/${slug}`);
  }, [router, slug]);

  const toggleAttribute = useCallback(
    (key: string, value: string) => {
      const current = filters.attributes[key] || [];
      const exists = current.includes(value);
      const nextValues = exists
        ? current.filter((v) => v !== value)
        : [...current, value];

      updateFilters({
        attributes: {
          ...filters.attributes,
          [key]: nextValues,
        },
      });
    },
    [filters.attributes, updateFilters],
  );

  const toggleBrand = useCallback(
    (brand: string) => {
      const current = filters.brand || [];
      const exists = current.includes(brand);
      const next = exists ? current.filter((b) => b !== brand) : [...current, brand];
      updateFilters({ brand: next.length > 0 ? next : undefined });
    },
    [filters.brand, updateFilters],
  );

  const setSubcategory = useCallback(
    (subcategoryId?: number) => updateFilters({ subcategoryId }),
    [updateFilters],
  );

  return {
    slug,
    filters,
    category,
    categoryLoading,
    categoryError,
    filterData,
    filtersLoading,
    productsData,
    productsLoading,
    productsFetching,
    sortOptions: filterData?.sortOptions ?? [],
    updateFilters,
    setPage,
    setSort,
    setSearch,
    clearFilters,
    toggleAttribute,
    toggleBrand,
    setSubcategory,
    defaultFilters: DEFAULT_CATEGORY_LISTING_FILTERS,
  };
}
