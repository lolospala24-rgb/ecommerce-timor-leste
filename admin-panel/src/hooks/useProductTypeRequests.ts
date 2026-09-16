'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { unwrapApiData } from '@/lib/utils';
import type { ProductType } from './useProductTypes';

export type ProductTypeRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ProductTypeRequest {
  id: number;
  sellerId: number;
  name: string;
  nameTetum: string | null;
  description: string | null;
  fields: Record<string, string> | null;
  specFields: Record<string, string> | null;
  status: ProductTypeRequestStatus;
  reviewedBy: number | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  resultingTypeId: number | null;
  resultingType: { id: number; name: string; slug: string } | null;
  createdAt: string;
  updatedAt: string;
  seller: { id: number; storeName: string };
}

interface Paginated<T> {
  data: T[];
  pagination: { total: number; page: number; limit: number; totalPages: number; hasNext: boolean; hasPrev: boolean };
}

export const useProductTypeRequests = (params: { page?: number; limit?: number; status?: ProductTypeRequestStatus }) => {
  return useQuery({
    queryKey: ['product-type-requests', params],
    queryFn: async () => {
      const response = await api.get('/product-type-requests', { params });
      return response.data as Paginated<ProductTypeRequest>;
    },
  });
};

export const useApproveTypeRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...overrides
    }: {
      id: number;
      name?: string;
      nameTetum?: string;
      description?: string;
      fields?: Record<string, string>;
      specFields?: Record<string, string>;
    }) => {
      const response = await api.post(`/product-type-requests/${id}/approve`, overrides);
      return unwrapApiData<{ type: ProductType; request: ProductTypeRequest }>(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-type-requests'] });
      queryClient.invalidateQueries({ queryKey: ['product-types'] });
      toast.success('Product type request approved');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to approve request');
    },
  });
};

export const useRejectTypeRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const response = await api.post(`/product-type-requests/${id}/reject`, { reason });
      return unwrapApiData<ProductTypeRequest>(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-type-requests'] });
      toast.success('Product type request rejected');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reject request');
    },
  });
};
