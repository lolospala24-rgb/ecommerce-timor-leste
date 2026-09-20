import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

// Referral codes/rewards are a plain User-level feature (every account
// gets one — customer, seller, or admin), not seller-specific business
// logic — so this hooks into the exact same /referrals and /wallet
// endpoints the customer storefront uses. Nothing here is seller-only.
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
  note: string | null;
  createdAt: string;
}

function unwrap<T>(res: any): T {
  const body = res.data ?? res;
  return (body?.data ?? body) as T;
}

export function useReferralSummary() {
  return useQuery({
    queryKey: ['seller-referral-summary'],
    queryFn: async () => unwrap<ReferralSummary>(await api.get('/referrals/me')),
    staleTime: 30_000,
  });
}

export function useReferralHistory(page = 1, limit = 10) {
  return useQuery({
    queryKey: ['seller-referral-history', page, limit],
    queryFn: async () =>
      unwrap<{ items: ReferralHistoryItem[]; total: number; page: number; limit: number; totalPages: number }>(
        await api.get(`/referrals/me/history?page=${page}&limit=${limit}`),
      ),
  });
}

export function useWalletTransactions(page = 1, limit = 10) {
  return useQuery({
    queryKey: ['seller-wallet-transactions', page, limit],
    queryFn: async () =>
      unwrap<{ items: WalletTransactionItem[]; total: number; page: number; limit: number; totalPages: number }>(
        await api.get(`/wallet/transactions?page=${page}&limit=${limit}`),
      ),
  });
}
