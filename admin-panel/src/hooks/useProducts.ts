'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Product {
  id: number;
  name: string;
  nameTetum: string | null;
  description: string;
  descriptionTetum: string | null;
  price: number;
  comparePrice: number | null;
  cost: number | null;
  stock: number;
  sku: string | null;
  barcode: string | null;
  images: string[];
  thumbnail: string | null;
  weight: number | null;
  slug: string;
  sellerId: number;
  categoryId: number;
  typeId?: number | null;
  isActive: boolean;
  isFeatured: boolean;
  hasVariants?: boolean;
  variants?: any[];
  type?: {
    id: number;
    name: string;
    nameTetum?: string | null;
    description?: string | null;
    slug?: string;
    fields?: Record<string, any>;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
  };
  totalRevenue?: number;
  createdAt: string;
  updatedAt: string;
  seller?: {
    id: number;
    storeName: string;
  };
  category?: {
    id: number;
    name: string;
    slug: string;
  };
  rating?: number;
  totalReviews?: number;
  _count?: {
    orderItems: number;
    reviews: number;
  };
}

interface ProductsResponse {
  data: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

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
      if (filters?.sortBy) params.append('sortBy', filters.sortBy);
      if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
      if (filters?.inStock !== undefined) params.append('inStock', filters.inStock.toString());
      if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString());
      if (filters?.minRating) params.append('minRating', filters.minRating.toString());
      
      const response = await api.get<ProductsResponse>(`/products?${params.toString()}`);
      return response.data;
    },
  });
};

export const useProduct = (id: number) => {
  return useQuery({
    queryKey: ['products', id],
    queryFn: async () => {
      const response = await api.get<Product>(`/products/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useFeaturedProducts = (limit: number = 10) => {
  return useQuery({
    queryKey: ['products', 'featured', limit],
    queryFn: async () => {
      const response = await api.get<Product[]>(`/products/featured?limit=${limit}`);
      return response.data;
    },
  });
};

export const useNewArrivals = (limit: number = 10) => {
  return useQuery({
    queryKey: ['products', 'new-arrivals', limit],
    queryFn: async () => {
      const response = await api.get<Product[]>(`/products/new-arrivals?limit=${limit}`);
      return response.data;
    },
  });
};

export const useBestSellers = (limit: number = 10) => {
  return useQuery({
    queryKey: ['products', 'best-sellers', limit],
    queryFn: async () => {
      const response = await api.get<Product[]>(`/products/best-sellers?limit=${limit}`);
      return response.data;
    },
  });
};

export const useSellerProducts = (filters?: { page?: number; limit?: number; status?: string }) => {
  return useQuery({
    queryKey: ['products', 'my-products', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.status) params.append('status', filters.status);
      const response = await api.get<ProductsResponse>(`/products/my-products?${params.toString()}`);
      return response.data;
    },
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: FormData) => {
      const response = await api.post('/products', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create product');
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FormData }) => {
      const response = await api.patch(`/products/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products', variables.id] });
      toast.success('Product updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update product');
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete product');
    },
  });
};

export const useToggleProductStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post(`/products/${id}/toggle-status`);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products', id] });
      toast.success('Product status updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update product status');
    },
  });
};

export const useCloneProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post(`/products/${id}/clone`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product cloned successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to clone product');
    },
  });
};