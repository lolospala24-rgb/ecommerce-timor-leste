'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { unwrapApiData } from '@/lib/utils';
import toast from 'react-hot-toast';

export type HomepageSectionRule =
  | 'MANUAL'
  | 'NEWEST'
  | 'POPULAR'
  | 'BEST_SELLING'
  | 'LOCAL'
  | 'ON_SALE'
  | 'LIMITED_STOCK'
  | 'CATEGORY';

export interface HomepageSectionProductInput {
  productId: number;
  position?: number;
}

export interface HomepageSectionListItem {
  id: number;
  name: string;
  title: string;
  subtitle: string | null;
  type: string;
  rule: HomepageSectionRule;
  config: Record<string, unknown>;
  sort: string | null;
  productLimit: number;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { products: number };
}

export interface HomepageSectionDetail extends Omit<HomepageSectionListItem, '_count'> {
  products: {
    id: number;
    productId: number;
    position: number;
    product: { id: number; name: string; slug: string; thumbnail: string | null; price: number; isActive: boolean };
  }[];
  previewProducts: { id: number; name: string; thumbnail: string | null; price: number }[];
}

export interface CreateSectionPayload {
  name: string;
  title: string;
  subtitle?: string;
  rule: HomepageSectionRule;
  config?: Record<string, unknown>;
  sort?: string;
  productLimit?: number;
  displayOrder?: number;
  isActive?: boolean;
  products?: HomepageSectionProductInput[];
}

export type UpdateSectionPayload = Partial<CreateSectionPayload>;

export const useHomepageSections = () => {
  return useQuery({
    queryKey: ['homepage-sections', 'admin'],
    queryFn: async () => {
      const response = await api.get('/homepage/sections/admin');
      return unwrapApiData<HomepageSectionListItem[]>(response.data);
    },
  });
};

export const useHomepageSection = (id: number | null) => {
  return useQuery({
    queryKey: ['homepage-sections', 'admin', id],
    queryFn: async () => {
      const response = await api.get(`/homepage/sections/admin/${id}`);
      return unwrapApiData<HomepageSectionDetail>(response.data);
    },
    enabled: id !== null,
  });
};

export const useCreateHomepageSection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateSectionPayload) => {
      const response = await api.post('/homepage/sections', payload);
      return unwrapApiData(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepage-sections'] });
      toast.success('Section created');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create section');
    },
  });
};

export const useUpdateHomepageSection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateSectionPayload }) => {
      const response = await api.patch(`/homepage/sections/${id}`, data);
      return unwrapApiData(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepage-sections'] });
      toast.success('Section updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update section');
    },
  });
};

export const useDeleteHomepageSection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/homepage/sections/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepage-sections'] });
      toast.success('Section deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete section');
    },
  });
};

export const useReorderHomepageSections = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sections: { id: number; displayOrder: number }[]) => {
      const response = await api.patch('/homepage/sections/reorder', { sections });
      return unwrapApiData(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepage-sections'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reorder sections');
    },
  });
};
