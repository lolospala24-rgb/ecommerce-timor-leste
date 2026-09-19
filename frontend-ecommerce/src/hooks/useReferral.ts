'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface ReferralSummary {
  referralCode: string | null;
  referralLink: string | null;
  walletCredit: number;
  totalReferred: number;
  totalRewarded: number;
  pendingCount: number;
}

export interface ReferralHistoryItem {
  id: number;
  status: 'PENDING' | 'REWARDED';
  rewardAmount: number | null;
  welcomeCreditAmount: number;
  qualifyingOrderId: number | null;
  rewardedAt: string | null;
  createdAt: string;
  referredUser: { id: number; name: string; email: string };
}

export interface WalletTransactionItem {
  id: number;
  type: 'REFERRAL_WELCOME' | 'REFERRAL_REWARD' | 'CHECKOUT_REDEMPTION' | 'ADMIN_ADJUSTMENT';
  amount: number;
  balanceAfter: number;
  referralId: number | null;
  orderId: number | null;
  note: string | null;
  createdAt: string;
}

const unwrapApiResponse = (response: any) => response?.data ?? response;

export const useReferralSummary = () => {
  return useQuery({
    queryKey: ['referral-summary'],
    queryFn: async () => {
      const response = await api.get('/referrals/me');
      const data = unwrapApiResponse(response);
      return (data?.data ?? data) as ReferralSummary;
    },
    staleTime: 30_000,
  });
};

export const useReferralHistory = (page = 1, limit = 20) => {
  return useQuery({
    queryKey: ['referral-history', page, limit],
    queryFn: async () => {
      const response = await api.get(`/referrals/me/history?page=${page}&limit=${limit}`);
      const data = unwrapApiResponse(response);
      return (data?.data ?? data) as {
        items: ReferralHistoryItem[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    },
  });
};

export const useReferralDetail = (id?: number | null) => {
  return useQuery({
    queryKey: ['referral-detail', id],
    queryFn: async () => {
      const response = await api.get(`/referrals/me/${id}`);
      const data = unwrapApiResponse(response);
      return data?.data ?? data;
    },
    enabled: !!id,
  });
};

export const useWalletTransactions = (page = 1, limit = 20) => {
  return useQuery({
    queryKey: ['wallet-transactions', page, limit],
    queryFn: async () => {
      const response = await api.get(`/wallet/transactions?page=${page}&limit=${limit}`);
      const data = unwrapApiResponse(response);
      return (data?.data ?? data) as {
        items: WalletTransactionItem[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    },
  });
};
