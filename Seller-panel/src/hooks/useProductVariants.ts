import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { unwrapApiData } from '@/lib/utils';
import type { ProductVariant } from '@/types/product.types';

export interface VariantPayload {
  sku?: string;
  price: number;
  comparePrice?: number;
  cost?: number;
  stock: number;
  attributes?: Record<string, string>;
  images?: string[];
  isActive?: boolean;
}

export function useProductVariants(productId: number | undefined) {
  return useQuery({
    queryKey: ['product-variants', productId],
    enabled: !!productId,
    queryFn: async () => {
      const res = await api.get(`/products/${productId}/variants`);
      return unwrapApiData<ProductVariant[]>(res);
    },
  });
}

export function useCreateVariant(productId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: VariantPayload) => {
      const res = await api.post(`/products/${productId}/variants`, payload);
      return unwrapApiData<ProductVariant>(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product-variants', productId] });
      qc.invalidateQueries({ queryKey: ['seller-product', productId] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create variant');
    },
  });
}

export function useUpdateVariant(productId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ variantId, ...payload }: Partial<VariantPayload> & { variantId: number }) => {
      const res = await api.patch(`/products/${productId}/variants/${variantId}`, payload);
      return unwrapApiData<ProductVariant>(res);
    },
    onSuccess: () => {
      toast.success('Variant updated');
      qc.invalidateQueries({ queryKey: ['product-variants', productId] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update variant');
    },
  });
}

export function useDeleteVariant(productId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (variantId: number) => {
      await api.delete(`/products/${productId}/variants/${variantId}`);
    },
    onSuccess: () => {
      toast.success('Variant deleted');
      qc.invalidateQueries({ queryKey: ['product-variants', productId] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete variant — it may have order history');
    },
  });
}

export function useToggleVariantStatus(productId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (variantId: number) => {
      const res = await api.post(`/products/${productId}/variants/${variantId}/toggle-status`);
      return unwrapApiData<ProductVariant>(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product-variants', productId] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update variant status');
    },
  });
}
