'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/constants';
import type {
  Category,
  CategoryFiltersResponse,
  CategoryListingFilters,
  CategoryProductsResponse,
} from '@/types/category.types';

interface CategoryListFilters {
  page?: number;
  limit?: number;
  search?: string;
  parentId?: number;
  includeProducts?: boolean;
}

export const useCategories = (filters?: CategoryListFilters) => {
  return useQuery({
    queryKey: ['categories', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.search) params.append('search', filters.search);
      if (filters?.parentId !== undefined) params.append('parentId', filters.parentId.toString());
      if (filters?.includeProducts) params.append('includeProducts', 'true');

      const response = await api.get(`${API_ENDPOINTS.CATEGORIES.BASE}?${params.toString()}`);
      return response.data;
    },
  });
};

export const useCategoryTree = () => {
  return useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.CATEGORIES.TREE);
      return response.data.data || response.data;
    },
  });
};

export const useCategory = (slug: string) => {
  return useQuery<Category>({
    queryKey: ['categories', 'slug', slug],
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.CATEGORIES.SLUG(slug));
      return response.data.data || response.data;
    },
    enabled: !!slug,
  });
};

export const useCategoryFilters = (slug: string) => {
  return useQuery<CategoryFiltersResponse>({
    queryKey: ['categories', 'slug', slug, 'filters'],
    queryFn: async () => {
      const response = await api.get(`${API_ENDPOINTS.CATEGORIES.SLUG(slug)}/filters`);
      return response.data.data || response.data;
    },
    enabled: !!slug,
    staleTime: 60_000,
  });
};

function buildCategoryProductsParams(filters: CategoryListingFilters): URLSearchParams {
  const params = new URLSearchParams();
  params.set('page', String(filters.page));
  params.set('limit', String(filters.limit));
  if (filters.search) params.set('search', filters.search);
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.subcategoryId) params.set('subcategoryId', String(filters.subcategoryId));
  if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
  if (filters.inStock !== undefined) params.set('inStock', String(filters.inStock));
  if (filters.minRating !== undefined) params.set('minRating', String(filters.minRating));
  if (filters.brand?.length) params.set('brand', filters.brand.join(','));
  if (Object.keys(filters.attributes).length > 0) {
    // Always send arrays — a bare string gets comma-split server-side to
    // support hand-written API calls, which would mangle a spec value that
    // legitimately contains a comma (e.g. "Sizes Available": "P, M, G, GG").
    const attrObj: Record<string, string[]> = {};
    Object.entries(filters.attributes).forEach(([key, values]) => {
      if (values.length > 0) attrObj[key] = values;
    });
    if (Object.keys(attrObj).length > 0) {
      params.set('attributes', JSON.stringify(attrObj));
    }
  }
  return params;
}

export const useCategoryProducts = (slug: string, filters: CategoryListingFilters) => {
  return useQuery<CategoryProductsResponse>({
    queryKey: ['categories', 'slug', slug, 'products', filters],
    queryFn: async () => {
      const params = buildCategoryProductsParams(filters);
      const response = await api.get(
        `${API_ENDPOINTS.CATEGORIES.SLUG(slug)}/products?${params.toString()}`,
      );
      return response.data;
    },
    enabled: !!slug,
    placeholderData: (previous) => previous,
  });
};

export const useFeaturedCategories = () => {
  return useQuery({
    queryKey: ['categories', 'featured'],
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.CATEGORIES.FEATURED);
      return response.data.data || response.data;
    },
  });
};
