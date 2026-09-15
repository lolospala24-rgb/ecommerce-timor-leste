import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { unwrapApiData, unwrapPaginated } from '@/lib/utils';
import type {
  CreateProductPayload,
  ProductStatusFilter,
  SellerProduct,
  StockUpdatePayload,
  UpdateProductPayload,
} from '@/types/product.types';

export function useSellerProducts(params: { page?: number; limit?: number; status?: ProductStatusFilter; search?: string }) {
  return useQuery({
    queryKey: ['seller-products', params],
    queryFn: async () => {
      const res = await api.get('/products/my-products', { params });
      return unwrapPaginated<SellerProduct>(res);
    },
  });
}

const EXPORT_PAGE_LIMIT = 100;
const EXPORT_MAX_PAGES = 20; // caps at 2,000 products — generous for a single store's catalog

// Not a hook — a plain fetch-all helper for CSV export. There's no seller-
// facing export endpoint (only admin's `/products/export`), so this pages
// through the seller's own catalog client-side.
export async function fetchAllSellerProducts(status?: ProductStatusFilter): Promise<SellerProduct[]> {
  const all: SellerProduct[] = [];
  let page = 1;
  while (page <= EXPORT_MAX_PAGES) {
    const res = await api.get('/products/my-products', { params: { page, limit: EXPORT_PAGE_LIMIT, status } });
    const body = unwrapPaginated<SellerProduct>(res);
    all.push(...body.data);
    if (!body.pagination?.hasNext) break;
    page += 1;
  }
  return all;
}

export function useSellerProduct(id: number | undefined) {
  return useQuery({
    queryKey: ['seller-product', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get(`/products/${id}`);
      return unwrapApiData<SellerProduct>(res);
    },
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateProductPayload) => {
      const res = await api.post('/products', payload);
      return unwrapApiData<SellerProduct>(res);
    },
    onSuccess: () => {
      toast.success('Product created');
      qc.invalidateQueries({ queryKey: ['seller-products'] });
      qc.invalidateQueries({ queryKey: ['seller-dashboard'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create product');
    },
  });
}

export function useUpdateProduct(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateProductPayload) => {
      const res = await api.patch(`/products/${id}`, payload);
      return unwrapApiData<SellerProduct>(res);
    },
    onSuccess: () => {
      toast.success('Product updated');
      qc.invalidateQueries({ queryKey: ['seller-products'] });
      qc.invalidateQueries({ queryKey: ['seller-product', id] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update product');
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/products/${id}`);
    },
    onSuccess: () => {
      toast.success('Product deleted');
      qc.invalidateQueries({ queryKey: ['seller-products'] });
      qc.invalidateQueries({ queryKey: ['seller-dashboard'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete product — it may have active orders');
    },
  });
}

export function useToggleProductStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await api.post(`/products/${id}/toggle-status`);
      return unwrapApiData<SellerProduct>(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-products'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update status');
    },
  });
}

export function useUpdateStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: StockUpdatePayload & { id: number }) => {
      const res = await api.post(`/products/${id}/stock`, payload);
      return unwrapApiData<SellerProduct>(res);
    },
    onSuccess: () => {
      toast.success('Stock updated');
      qc.invalidateQueries({ queryKey: ['seller-products'] });
      qc.invalidateQueries({ queryKey: ['seller-dashboard'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update stock');
    },
  });
}
