'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { unwrapApiData } from '@/lib/utils';
import toast from 'react-hot-toast';

export type QuickMenuIconType = 'LIBRARY' | 'UPLOAD';
export type QuickMenuLinkType = 'INTERNAL' | 'EXTERNAL';

export interface QuickMenuItem {
  id: number;
  title: string;
  subtitle: string | null;
  iconType: QuickMenuIconType;
  iconKey: string | null;
  iconUrl: string | null;
  linkType: QuickMenuLinkType;
  link: string;
  displayOrder: number;
  isActive: boolean;
  badge: string | null;
  openInNewTab: boolean;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuickMenuItemPayload {
  title: string;
  subtitle?: string;
  iconType?: QuickMenuIconType;
  iconKey?: string;
  iconUrl?: string;
  linkType?: QuickMenuLinkType;
  link: string;
  displayOrder?: number;
  isActive?: boolean;
  badge?: string;
  openInNewTab?: boolean;
  startDate?: string;
  endDate?: string;
}

export type UpdateQuickMenuItemPayload = Partial<QuickMenuItemPayload>;

export const useQuickMenuItems = () => {
  return useQuery({
    queryKey: ['quick-menu', 'admin'],
    queryFn: async () => {
      const response = await api.get('/quick-menu/admin');
      return unwrapApiData<QuickMenuItem[]>(response.data);
    },
  });
};

export const useCreateQuickMenuItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: QuickMenuItemPayload) => {
      const response = await api.post('/quick-menu', payload);
      return unwrapApiData<QuickMenuItem>(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-menu'] });
      toast.success('Quick Menu item created');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create Quick Menu item');
    },
  });
};

export const useUpdateQuickMenuItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateQuickMenuItemPayload }) => {
      const response = await api.patch(`/quick-menu/${id}`, data);
      return unwrapApiData<QuickMenuItem>(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-menu'] });
      toast.success('Quick Menu item updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update Quick Menu item');
    },
  });
};

export const useDeleteQuickMenuItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/quick-menu/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-menu'] });
      toast.success('Quick Menu item deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete Quick Menu item');
    },
  });
};

export const useReorderQuickMenuItems = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (items: { id: number; displayOrder: number }[]) => {
      const response = await api.patch('/quick-menu/reorder', { items });
      return unwrapApiData<QuickMenuItem[]>(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-menu'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reorder Quick Menu items');
    },
  });
};

export const useUploadQuickMenuIcon = () => {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('icon', file);
      const response = await api.post('/quick-menu/upload-icon', formData);
      return unwrapApiData<{ url: string }>(response.data);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to upload icon');
    },
  });
};
