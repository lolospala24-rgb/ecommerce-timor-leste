import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { unwrapApiData, unwrapPaginated } from '@/lib/utils';
import type {
  CreatePromotionPayload,
  Promotion,
  PromotionConflict,
  PromotionDetail,
  PromotionStatus,
  UpdatePromotionPayload,
} from '@/types/promotion.types';

export function usePromotions(params: { page?: number; limit?: number; status?: PromotionStatus }) {
  return useQuery({
    queryKey: ['promotions', params],
    queryFn: async () => {
      const res = await api.get('/promotions/mine', { params });
      return unwrapPaginated<Promotion>(res);
    },
  });
}

export function usePromotion(id: number | undefined) {
  return useQuery({
    queryKey: ['promotion', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get(`/promotions/${id}`);
      return unwrapApiData<PromotionDetail>(res);
    },
  });
}

export function useCreatePromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePromotionPayload) => {
      const res = await api.post('/promotions', payload);
      return unwrapApiData<PromotionDetail>(res);
    },
    onSuccess: () => {
      toast.success('Promotion created');
      qc.invalidateQueries({ queryKey: ['promotions'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create promotion');
    },
  });
}

export function useUpdatePromotion(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdatePromotionPayload) => {
      const res = await api.patch(`/promotions/${id}`, payload);
      return unwrapApiData<PromotionDetail>(res);
    },
    onSuccess: () => {
      toast.success('Promotion updated');
      qc.invalidateQueries({ queryKey: ['promotions'] });
      qc.invalidateQueries({ queryKey: ['promotion', id] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update promotion');
    },
  });
}

export function useDeactivatePromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.patch(`/promotions/${id}/deactivate`);
    },
    onSuccess: () => {
      toast.success('Promotion deactivated');
      qc.invalidateQueries({ queryKey: ['promotions'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to deactivate promotion');
    },
  });
}

export function useDeletePromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/promotions/${id}`);
    },
    onSuccess: () => {
      toast.success('Promotion deleted');
      qc.invalidateQueries({ queryKey: ['promotions'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete promotion');
    },
  });
}

// Not a react-query hook — called imperatively (debounced) from the create/
// edit form to preview conflicts before submit. The backend re-checks this
// for real at create/update time regardless, so a failed/slow preview call
// here is only a missed convenience, never a security gap.
export async function checkPromotionConflicts(params: {
  productIds: number[];
  startAt: string;
  endAt: string;
  excludeId?: number;
}): Promise<{ hasConflicts: boolean; conflicts: PromotionConflict[] }> {
  if (params.productIds.length === 0 || !params.startAt || !params.endAt) {
    return { hasConflicts: false, conflicts: [] };
  }
  const res = await api.get('/promotions/conflicts', {
    params: {
      productIds: params.productIds.join(','),
      startAt: params.startAt,
      endAt: params.endAt,
      excludeId: params.excludeId,
    },
  });
  return unwrapApiData(res);
}
