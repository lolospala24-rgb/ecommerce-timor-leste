import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { unwrapApiData, unwrapPaginated } from '@/lib/utils';
import type { Payout, SellerBalance, SellerLedgerEntry } from '@/types/finance.types';

export function useSellerBalance() {
  return useQuery({
    queryKey: ['seller-balance'],
    queryFn: async () => {
      const res = await api.get('/payouts/my-balance');
      return unwrapApiData<SellerBalance>(res);
    },
  });
}

export function useSellerLedger(params: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['seller-ledger', params],
    queryFn: async () => {
      const res = await api.get('/payouts/my-ledger', { params });
      return unwrapPaginated<SellerLedgerEntry>(res);
    },
  });
}

export function useSellerPayouts(params: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['seller-payouts', params],
    queryFn: async () => {
      const res = await api.get('/payouts/my-payouts', { params });
      return unwrapPaginated<Payout>(res);
    },
  });
}

export function useRequestPayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (amount: number) => {
      const res = await api.post('/payouts/request', { amount });
      return unwrapApiData<Payout>(res);
    },
    onSuccess: () => {
      toast.success('Payout requested');
      qc.invalidateQueries({ queryKey: ['seller-balance'] });
      qc.invalidateQueries({ queryKey: ['seller-payouts'] });
      qc.invalidateQueries({ queryKey: ['seller-ledger'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to request payout');
    },
  });
}
