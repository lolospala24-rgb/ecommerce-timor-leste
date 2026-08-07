'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { unwrapApiData } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Category {
  id: number;
  name: string;
  nameTetum: string | null;
  description: string | null;
  image: string | null;
  slug: string;
  parentId: number | null;
  isActive: boolean;
  isFeatured: boolean;
  order: number;
  productCount?: number;
  children?: Category[];
  createdAt: string;
  updatedAt: string;
}

interface CategoriesResponse {
  data: Category[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface CategoryFilters {
  page?: number;
  limit?: number;
  search?: string;
  parentId?: number;
  includeProducts?: boolean;
}

export const useCategories = (filters?: CategoryFilters) => {
  return useQuery({
    queryKey: ['categories', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.search) params.append('search', filters.search);
      if (filters?.parentId !== undefined) params.append('parentId', filters.parentId.toString());
      if (filters?.includeProducts) params.append('includeProducts', 'true');
      
      const response = await api.get<CategoriesResponse>(`/categories?${params.toString()}`);
      return response.data;
    },
  });
};

export const useCategoryTree = () => {
  return useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: async () => {
      const response = await api.get<Category[]>('/categories/tree');
      return unwrapApiData<Category[]>(response.data);
    },
  });
};

export const useFeaturedCategories = () => {
  return useQuery({
    queryKey: ['categories', 'featured'],
    queryFn: async () => {
      const response = await api.get<Category[]>('/categories/featured');
      return unwrapApiData<Category[]>(response.data);
    },
  });
};

export const useCategory = (id: number) => {
  return useQuery({
    queryKey: ['categories', id],
    queryFn: async () => {
      const response = await api.get<Category>(`/categories/${id}`);
      return unwrapApiData<Category>(response.data);
    },
    enabled: !!id,
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<Category>) => {
      const response = await api.post('/categories', data);
      return unwrapApiData<Category>(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories', 'tree'] });
      toast.success('Category created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create category');
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Category> }) => {
      const response = await api.patch(`/categories/${id}`, data);
      return unwrapApiData<Category>(response.data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories', 'tree'] });
      queryClient.invalidateQueries({ queryKey: ['categories', variables.id] });
      toast.success('Category updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update category');
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories', 'tree'] });
      toast.success('Category deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete category');
    },
  });
};

export const useToggleCategoryFeatured = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, isFeatured }: { id: number; isFeatured: boolean }) => {
      const response = await api.post(`/categories/${id}/featured`, { isFeatured });
      return unwrapApiData<Category>(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories', 'featured'] });
      toast.success('Category featured status updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update featured status');
    },
  });
};