import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { unwrapPaginated } from '@/lib/utils';
import type { ProductTypeRequest } from '@/types/product.types';

export interface CreateTypeRequestPayload {
  name: string;
  nameTetum?: string;
  description?: string;
  fields?: Record<string, string>;
  specFields?: Record<string, string>;
}

export function useMyTypeRequests(params: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['my-type-requests', params],
    queryFn: async () => {
      const res = await api.get('/product-type-requests/my-requests', { params });
      return unwrapPaginated<ProductTypeRequest>(res);
    },
  });
}

export function useCreateTypeRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateTypeRequestPayload) => {
      const res: any = await api.post('/product-type-requests', payload);
      return (res.data?.data ?? res.data) as ProductTypeRequest;
    },
    onSuccess: () => {
      toast.success('Request submitted — an admin will review it soon');
      qc.invalidateQueries({ queryKey: ['my-type-requests'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to submit request');
    },
  });
}
