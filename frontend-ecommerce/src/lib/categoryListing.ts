import type { CategoryListingFilters } from '@/types/category.types';

const DEFAULT_LIMIT = 12;

export const DEFAULT_CATEGORY_LISTING_FILTERS: CategoryListingFilters = {
  page: 1,
  limit: DEFAULT_LIMIT,
  search: '',
  sortBy: 'newest',
  attributes: {},
};

export function parseCategoryListingParams(
  searchParams: URLSearchParams,
): CategoryListingFilters {
  const attributes: Record<string, string[]> = {};

  searchParams.forEach((value, key) => {
    if (key.startsWith('attr.')) {
      const attrKey = key.slice(5);
      attributes[attrKey] = value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
    }
  });

  const subcategory = searchParams.get('subcategory');
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  const inStock = searchParams.get('inStock');
  const minRating = searchParams.get('minRating');
  const brand = searchParams.get('brand');
  const page = searchParams.get('page');
  const limit = searchParams.get('limit');

  return {
    page: page ? Math.max(1, parseInt(page, 10)) : 1,
    limit: limit ? Math.max(1, parseInt(limit, 10)) : DEFAULT_LIMIT,
    search: searchParams.get('q') || searchParams.get('search') || '',
    sortBy: searchParams.get('sort') || 'newest',
    subcategoryId: subcategory ? parseInt(subcategory, 10) : undefined,
    minPrice: minPrice ? parseFloat(minPrice) : undefined,
    maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
    inStock: inStock === 'true' ? true : inStock === 'false' ? false : undefined,
    minRating: minRating ? parseInt(minRating, 10) : undefined,
    brand: brand
      ? brand
          .split(',')
          .map((b) => b.trim())
          .filter(Boolean)
      : undefined,
    attributes,
  };
}

export function buildCategoryListingSearchParams(
  filters: CategoryListingFilters,
): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.search) params.set('q', filters.search);
  if (filters.sortBy && filters.sortBy !== 'newest') params.set('sort', filters.sortBy);
  if (filters.page > 1) params.set('page', String(filters.page));
  if (filters.limit !== DEFAULT_LIMIT) params.set('limit', String(filters.limit));
  if (filters.subcategoryId) params.set('subcategory', String(filters.subcategoryId));
  if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
  if (filters.inStock !== undefined) params.set('inStock', String(filters.inStock));
  if (filters.minRating !== undefined) params.set('minRating', String(filters.minRating));
  if (filters.brand?.length) params.set('brand', filters.brand.join(','));

  Object.entries(filters.attributes).forEach(([key, values]) => {
    if (values.length > 0) {
      params.set(`attr.${key}`, values.join(','));
    }
  });

  return params;
}

export function categoryListingUrl(slug: string, filters: CategoryListingFilters): string {
  const params = buildCategoryListingSearchParams(filters);
  const query = params.toString();
  return query ? `/categories/${slug}?${query}` : `/categories/${slug}`;
}

export function countActiveCategoryFilters(filters: CategoryListingFilters): number {
  let count = 0;
  if (filters.subcategoryId) count += 1;
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) count += 1;
  if (filters.inStock !== undefined) count += 1;
  if (filters.minRating !== undefined) count += 1;
  if (filters.brand?.length) count += 1;
  count += Object.values(filters.attributes).filter((v) => v.length > 0).length;
  return count;
}
