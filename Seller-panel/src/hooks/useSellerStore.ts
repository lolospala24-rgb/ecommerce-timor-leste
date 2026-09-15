import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { unwrapApiData } from '@/lib/utils';
import type { SellerStore, UpdateSellerStoreDto } from '@/types/seller.types';

export function useMyStore() {
  return useQuery({
    queryKey: ['my-store'],
    queryFn: async () => {
      const res = await api.get('/sellers/my-store');
      return unwrapApiData<SellerStore>(res);
    },
  });
}

export function useUpdateMyStore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateSellerStoreDto) => {
      const res = await api.patch('/sellers/my-store', payload);
      return unwrapApiData<SellerStore>(res);
    },
    onSuccess: () => {
      toast.success('Store updated');
      qc.invalidateQueries({ queryKey: ['my-store'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update store');
    },
  });
}

export function useUploadStoreLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('logo', file);
      const res = await api.post('/sellers/upload-logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return unwrapApiData<{ logoUrl: string }>(res);
    },
    onSuccess: () => {
      toast.success('Logo updated');
      qc.invalidateQueries({ queryKey: ['my-store'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to upload logo');
    },
  });
}

export function useUploadStoreBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('banner', file);
      const res = await api.post('/sellers/upload-banner', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return unwrapApiData<{ bannerUrl: string }>(res);
    },
    onSuccess: () => {
      toast.success('Banner updated');
      qc.invalidateQueries({ queryKey: ['my-store'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to upload banner');
    },
  });
}
