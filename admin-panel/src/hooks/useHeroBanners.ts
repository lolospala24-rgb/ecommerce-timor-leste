'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { unwrapApiData } from '@/lib/utils';
import toast from 'react-hot-toast';

export interface HeroBanner {
  id: number;
  badge: string | null;
  title: string;
  subtitle: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
  desktopImage: string;
  mobileImage: string | null;
  position: number;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HeroBannerPayload {
  badge?: string;
  title: string;
  subtitle?: string;
  buttonText?: string;
  buttonUrl?: string;
  desktopImage: string;
  mobileImage?: string;
  position?: number;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
}

export type UpdateHeroBannerPayload = Partial<HeroBannerPayload>;

export const useHeroBanners = () => {
  return useQuery({
    queryKey: ['hero-banners', 'admin'],
    queryFn: async () => {
      const response = await api.get('/hero-banners/admin');
      return unwrapApiData<HeroBanner[]>(response.data);
    },
  });
};

export const useHeroBanner = (id: number | null) => {
  return useQuery({
    queryKey: ['hero-banners', 'admin', id],
    queryFn: async () => {
      const response = await api.get(`/hero-banners/admin/${id}`);
      return unwrapApiData<HeroBanner>(response.data);
    },
    enabled: id !== null,
  });
};

export const useCreateHeroBanner = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: HeroBannerPayload) => {
      const response = await api.post('/hero-banners', payload);
      return unwrapApiData<HeroBanner>(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hero-banners'] });
      toast.success('Hero banner created');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create hero banner');
    },
  });
};

export const useUpdateHeroBanner = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateHeroBannerPayload }) => {
      const response = await api.patch(`/hero-banners/${id}`, data);
      return unwrapApiData<HeroBanner>(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hero-banners'] });
      toast.success('Hero banner updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update hero banner');
    },
  });
};

export const useDeleteHeroBanner = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/hero-banners/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hero-banners'] });
      toast.success('Hero banner deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete hero banner');
    },
  });
};

export const useReorderHeroBanners = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (banners: { id: number; position: number }[]) => {
      const response = await api.patch('/hero-banners/reorder', { banners });
      return unwrapApiData<HeroBanner[]>(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hero-banners'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reorder hero banners');
    },
  });
};

export const useUploadHeroImage = () => {
  return useMutation({
    mutationFn: async ({ file, type }: { file: File; type: 'desktop' | 'mobile' }) => {
      const formData = new FormData();
      formData.append('image', file);
      const response = await api.post(`/hero-banners/upload-image?type=${type}`, formData);
      return unwrapApiData<{ url: string }>(response.data);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to upload image');
    },
  });
};
