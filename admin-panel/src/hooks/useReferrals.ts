'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { unwrapApiData } from '@/lib/utils';
import toast from 'react-hot-toast';

export type ReferralStatus = 'PENDING' | 'QUALIFIED' | 'REWARDED' | 'CAPPED' | 'REVERSED';

// Shared between the referrals list and detail pages.
export const REFERRAL_STATUS_BADGE_VARIANT: Record<
  ReferralStatus,
  'default' | 'secondary' | 'destructive' | 'success' | 'warning'
> = {
  PENDING: 'secondary',
  QUALIFIED: 'warning',
  CAPPED: 'warning',
  REWARDED: 'success',
  REVERSED: 'destructive',
};

export interface AdminReferral {
  id: number;
  status: ReferralStatus;
  referralCodeUsed: string;
  welcomeCreditAmount: number;
  welcomeCreditGrantedAt: string | null;
  rewardAmount: number | null;
  qualifyingOrderId: number | null;
  qualifiedAt: string | null;
  rewardedAt: string | null;
  reversedAt: string | null;
  createdAt: string;
  referrer: { id: number; name: string; email: string };
  referredUser: { id: number; name: string; email: string };
  qualifyingOrder: { id: number; orderNumber: string } | null;
}

export interface AdminReferralDetail extends Omit<AdminReferral, 'qualifyingOrder'> {
  qualifyingOrder: {
    id: number;
    orderNumber: string;
    subtotal: number;
    total: number | null;
    paymentMethod: string | null;
    status: string;
    deliveredAt: string | null;
  } | null;
}

export interface ReferralListResult {
  items: AdminReferral[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReferralStats {
  totalReferrals: number;
  successfulReferrals: number;
  pendingReferrals: number;
  qualifiedReferrals: number;
  cappedReferrals: number;
  reversedReferrals: number;
  rewardsIssued: number;
}

export interface ReferralSettings {
  referralProgramEnabled: boolean;
  referralWelcomeCredit: number;
  referralRewardAmount: number;
  referralHoldDays: number;
  referralMinQualifyingAmount: number;
  referralMonthlyCap: number;
}

export const useAdminReferrals = (params: { page: number; limit: number; status?: ReferralStatus }) => {
  return useQuery({
    queryKey: ['admin-referrals', params],
    queryFn: async () => {
      const search = new URLSearchParams();
      search.set('page', String(params.page));
      search.set('limit', String(params.limit));
      if (params.status) search.set('status', params.status);
      const response = await api.get(`/admin/referrals?${search.toString()}`);
      return unwrapApiData<ReferralListResult>(response.data);
    },
  });
};

export const useAdminReferralDetail = (id: number | null) => {
  return useQuery({
    queryKey: ['admin-referrals', id],
    queryFn: async () => {
      const response = await api.get(`/admin/referrals/${id}`);
      return unwrapApiData<AdminReferralDetail>(response.data);
    },
    enabled: id !== null,
  });
};

export const useAdminReferralStats = () => {
  return useQuery({
    queryKey: ['admin-referrals', 'stats'],
    queryFn: async () => {
      const response = await api.get('/admin/referrals/stats');
      return unwrapApiData<ReferralStats>(response.data);
    },
  });
};

export const useAdminReferralSettings = () => {
  return useQuery({
    queryKey: ['admin-referrals', 'settings'],
    queryFn: async () => {
      const response = await api.get('/admin/referrals/settings');
      return unwrapApiData<ReferralSettings>(response.data);
    },
  });
};

export const useUpdateAdminReferralSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<ReferralSettings>) => {
      const response = await api.patch('/admin/referrals/settings', payload);
      return unwrapApiData<ReferralSettings>(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-referrals', 'settings'] });
      toast.success('Referral settings updated successfully.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update referral settings');
    },
  });
};
