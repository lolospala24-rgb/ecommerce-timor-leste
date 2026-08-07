'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/constants';
import { normalizeProduct, unwrapApiData } from '@/lib/product';
import toast from 'react-hot-toast';

interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: number;
  sellerId?: number;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  inStock?: boolean;
  isActive?: boolean;
  minRating?: number;
}

// The backend (`ProductsService.mapProductSort`) already understands these
// semantic sort keys directly — including 'rating'/'best_selling'/
// 'popularity', which trigger a post-query re-sort it can't do from a plain
// Prisma `orderBy` — so the frontend must pass them through unchanged
// rather than pre-translating to column names. Re-mapping here previously
// mangled the signal (e.g. 'rating' became 'createdAt'), silently turning
// "Top Rated" and "Best Selling" into a plain newest-first sort.
// 'relevance' has no backend equivalent (no text-search ranking exists),
// so it's treated as "no explicit sort" rather than sent as a literal value
// the backend wouldn't recognize.
export const mapProductSortParams = (sortBy?: string, sortOrder?: 'asc' | 'desc') => {
  if (!sortBy || sortBy === 'relevance') {
    return { sortBy: undefined, sortOrder: undefined };
  }
  return { sortBy, sortOrder };
};

export const useProducts = (filters?: ProductFilters) => {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.search) params.append('search', filters.search);
      if (filters?.categoryId) params.append('categoryId', filters.categoryId.toString());
      if (filters?.sellerId) params.append('sellerId', filters.sellerId.toString());
      if (filters?.minPrice) params.append('minPrice', filters.minPrice.toString());
      if (filters?.maxPrice) params.append('maxPrice', filters.maxPrice.toString());

      const mappedSort = mapProductSortParams(filters?.sortBy, filters?.sortOrder);
      if (mappedSort.sortBy) params.append('sortBy', mappedSort.sortBy);
      if (mappedSort.sortOrder) params.append('sortOrder', mappedSort.sortOrder);

      if (filters?.inStock !== undefined) params.append('inStock', filters.inStock.toString());
      if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString());
      if (filters?.minRating) params.append('minRating', filters.minRating.toString());

      const response = await api.get(`/products?${params.toString()}`);
      return response.data;
    },
  });
};

export const useProduct = <T = any>(id: number | string) => {
  return useQuery<T>({
    queryKey: ['products', id],
    queryFn: async () => {
      const isSlug = typeof id === 'string' && isNaN(Number(id));
      const endpoint = isSlug 
        ? `/products/slug/${id}`
        : `/products/${id}`;
      const response = await api.get(endpoint);
      let product = normalizeProduct(unwrapApiData(response));

      if (
        product.id &&
        product.hasVariants &&
        (!Array.isArray(product.variants) || product.variants.length === 0)
      ) {
        try {
          const variantsResponse = await api.get(`/products/${product.id}/variants`);
          const variantsRaw = unwrapApiData<unknown[]>(variantsResponse);
          if (Array.isArray(variantsRaw) && variantsRaw.length > 0) {
            product = normalizeProduct({
              ...product,
              variants: variantsRaw,
            });
          }
        } catch {
          // Keep base product if variant fallback fails
        }
      }

      return product as T;
    },
    enabled: !!id,
  });
};

export const useProductBySlug = (slug: string) => {
  return useProduct(slug);
};

export const useRelatedProducts = (productId?: number, limit: number = 4) => {
  return useQuery({
    queryKey: ['products', 'related', productId, limit],
    queryFn: async () => {
      const response = await api.get(`/products/${productId}/related?limit=${limit}`);
      return response.data.data || response.data;
    },
    enabled: !!productId,
  });
};

export const useFeaturedProducts = (limit: number = 10) => {
  return useQuery({
    queryKey: ['products', 'featured', limit],
    queryFn: async () => {
      const response = await api.get(`/products/featured?limit=${limit}`);
      return response.data.data || response.data;
    },
  });
};

export const useNewArrivals = (limit: number = 10) => {
  return useQuery({
    queryKey: ['products', 'new-arrivals', limit],
    queryFn: async () => {
      const response = await api.get(`/products/new-arrivals?limit=${limit}`);
      const raw = unwrapApiData<unknown[]>(response);
      return Array.isArray(raw) ? raw.map(normalizeProduct) : [];
    },
  });
};

export const usePopularProducts = (limit: number = 10) => {
  return useQuery({
    queryKey: ['products', 'popular', limit],
    queryFn: async () => {
      const response = await api.get(`/products/popular?limit=${limit}`);
      const raw = unwrapApiData<unknown[]>(response);
      return Array.isArray(raw) ? raw.map(normalizeProduct) : [];
    },
  });
};

export interface LocalProductsResult {
  category: {
    id: number;
    name: string;
    nameTetum?: string | null;
    description?: string | null;
    slug: string;
  } | null;
  products: ReturnType<typeof normalizeProduct>[];
}

export const useLocalProducts = (limit: number = 8) => {
  return useQuery<LocalProductsResult>({
    queryKey: ['products', 'local', limit],
    queryFn: async () => {
      const response = await api.get(`${API_ENDPOINTS.PRODUCTS.LOCAL}?limit=${limit}`);
      const payload = unwrapApiData<unknown>(response);
      const responseObject = typeof payload === 'object' && payload !== null ? payload as Record<string, unknown> : {};

      const productsRaw = Array.isArray(payload)
        ? payload
        : Array.isArray(responseObject.products)
          ? responseObject.products
          : [];

      const category = responseObject.category as LocalProductsResult['category'] || null;
      const isLocalCategory = !!category && [category.name, category.nameTetum, category.slug]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes('local') || value!.toLowerCase().includes('produtu'));

      return {
        category: isLocalCategory ? category : null,
        products: isLocalCategory && Array.isArray(productsRaw)
          ? productsRaw.map(normalizeProduct)
          : [],
      };
    },
  });
};

export const useBestSellers = (limit: number = 10) => {
  return useQuery({
    queryKey: ['products', 'best-sellers', limit],
    queryFn: async () => {
      const response = await api.get(`/products/best-sellers?limit=${limit}`);
      return response.data.data || response.data;
    },
  });
};

export const useSellerProducts = (
  sellerId: number,
  filters?: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' },
) => {
  return useQuery({
    queryKey: ['products', 'seller', sellerId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const mappedSort = mapProductSortParams(filters?.sortBy, filters?.sortOrder);
      if (mappedSort.sortBy) params.append('sortBy', mappedSort.sortBy);
      if (mappedSort.sortOrder) params.append('sortOrder', mappedSort.sortOrder);

      const response = await api.get(`/products/seller/${sellerId}?${params.toString()}`);
      return response.data;
    },
    enabled: !!sellerId,
  });
};

export const useSearchProducts = (query: string, limit: number = 20) => {
  return useQuery({
    queryKey: ['products', 'search', query, limit],
    queryFn: async () => {
      const response = await api.get(`/products/search?q=${encodeURIComponent(query)}&limit=${limit}`);
      return response.data.data || response.data;
    },
    enabled: query.length >= 2,
  });
};