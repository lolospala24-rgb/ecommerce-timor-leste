'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { unwrapApiData } from '@/lib/utils';
import toast from 'react-hot-toast';

export interface Refund {
  id: number;
  paymentId: number;
  orderId: number;
  amount: number;
  reason: string;
  type: 'FULL' | 'PARTIAL';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedBy: number;
  requestedAt: string;
  processedBy?: number | null;
  processedAt?: string | null;
  adminNote?: string | null;
  order?: { orderNumber: string; total: number; seller?: { storeName: string } };
  payment?: { amount: number; method: string; status: string };
  requester?: { id: number; name: string; email: string } | null;
}

export interface Payout {
  id: number;
  sellerId: number;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  requestedAt: string;
  processedAt?: string | null;
  adminNote?: string | null;
  seller?: { storeName: string };
}

interface Paginated<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// --- Refunds (admin) ---

export function useAdminRefunds(status?: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: ['refunds', 'admin', status, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (status && status !== 'all') params.append('status', status);
      const response = await api.get(`/refunds/admin?${params.toString()}`);
      // Single .data access, not unwrapApiData: RefundsController returns
      // the paginate() result directly, so after the interceptor this
      // response is { status, data: { data: Refund[], pagination } } — one
      // unwrap lands exactly on { data, pagination }. The recursive
      // unwrapApiData helper would keep descending into the inner `data`
      // array and discard `pagination` entirely (see admin-panel's
      // established reviews-list bug fix for the same class of issue).
      return (response as any).data as Paginated<Refund>;
    },
  });
}

export function useApproveRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, adminNote }: { id: number; adminNote?: string }) => {
      const response = await api.post(`/refunds/${id}/approve`, { adminNote });
      return unwrapApiData<Refund>(response);
    },
    onSuccess: () => {
      toast.success('Refund approved');
      queryClient.invalidateQueries({ queryKey: ['refunds'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['sellers'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to approve refund');
    },
  });
}

export function useRejectRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const response = await api.post(`/refunds/${id}/reject`, { reason });
      return unwrapApiData<Refund>(response);
    },
    onSuccess: () => {
      toast.success('Refund rejected');
      queryClient.invalidateQueries({ queryKey: ['refunds'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reject refund');
    },
  });
}

// --- Payouts (admin) ---

export function useAdminPayouts(status?: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: ['payouts', 'admin', status, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (status && status !== 'all') params.append('status', status);
      const response = await api.get(`/payouts/admin?${params.toString()}`);
      // Same single-.data unwrap as useAdminRefunds above.
      return (response as any).data as Paginated<Payout>;
    },
  });
}

export function useApprovePayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, adminNote }: { id: number; adminNote?: string }) => {
      const response = await api.post(`/payouts/${id}/approve`, { adminNote });
      return unwrapApiData<Payout>(response);
    },
    onSuccess: () => {
      toast.success('Payout approved');
      queryClient.invalidateQueries({ queryKey: ['payouts'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to approve payout');
    },
  });
}

export function useRejectPayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const response = await api.post(`/payouts/${id}/reject`, { reason });
      return unwrapApiData<Payout>(response);
    },
    onSuccess: () => {
      toast.success('Payout rejected — funds returned to seller balance');
      queryClient.invalidateQueries({ queryKey: ['payouts'] });
      queryClient.invalidateQueries({ queryKey: ['sellers'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reject payout');
    },
  });
}

export function useMarkPayoutPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post(`/payouts/${id}/mark-paid`, {});
      return unwrapApiData<Payout>(response);
    },
    onSuccess: () => {
      toast.success('Payout marked as paid');
      queryClient.invalidateQueries({ queryKey: ['payouts'] });
      queryClient.invalidateQueries({ queryKey: ['sellers'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update payout');
    },
  });
}

// --- Per-seller finance (admin viewing/managing one seller — this is the
// centralized replacement for what would otherwise be a seller-facing
// dashboard: admin can see the balance/ledger and trigger a payout here) ---

export interface SellerBalance {
  pendingAmount: number;
  availableAmount: number;
  processingAmount: number;
  paidOutAmount: number;
  refundedAmount: number;
}

export interface LedgerEntry {
  id: number;
  sellerId: number;
  seller?: { storeName: string };
  type: string;
  // Never sum these for display — a pure transfer between two buckets
  // (RELEASE, PAYOUT) sets both an outgoing and incoming delta on the same
  // row, which nets to zero even though real money moved. Show each
  // nonzero bucket individually instead.
  pendingDelta: number;
  availableDelta: number;
  processingDelta: number;
  paidOutDelta: number;
  refundedDelta: number;
  pendingBalanceAfter: number;
  availableBalanceAfter: number;
  processingBalanceAfter: number;
  paidOutBalanceAfter: number;
  refundedBalanceAfter: number;
  note: string | null;
  createdAt: string;
  order?: { orderNumber: string } | null;
}

export function useSellerBalanceAdmin(sellerId?: number | null) {
  return useQuery({
    queryKey: ['sellers', sellerId, 'balance'],
    queryFn: async () => {
      const response = await api.get(`/payouts/admin/${sellerId}/balance`);
      return unwrapApiData<SellerBalance>(response);
    },
    enabled: !!sellerId,
  });
}

export function useSellerLedgerAdmin(sellerId?: number | null, page = 1, limit = 10) {
  return useQuery({
    queryKey: ['sellers', sellerId, 'ledger', page, limit],
    queryFn: async () => {
      const response = await api.get(`/payouts/admin/${sellerId}/ledger?page=${page}&limit=${limit}`);
      return (response as any).data as Paginated<LedgerEntry>;
    },
    enabled: !!sellerId,
  });
}

// --- Admin Financial Command Center ---
// Every hook here reads from /finance/*, which is itself just querying the
// same Order/SellerBalance/SellerLedgerEntry/Refund tables the payment,
// payout, and refund flows already write to — no second calculation path.

export interface FinanceOverview {
  period: { startDate: string; endDate: string } | null;
  sales: { grossSales: number; netSales: number; orderCount: number };
  commission: { platformCommission: number; commissionRefundedPortion: number; note: string };
  sellerEarnings: {
    total: number;
    pending: number;
    available: number;
    processing: number;
    paidOut: number;
    refunded: number;
  };
  refunds: { total: number };
  platformRevenue: { gross: number; net: number };
  // Collected THIS PERIOD — separate from platformBalance below, which is
  // the current running total across all time.
  shippingTax: { shippingCollected: number; taxCollected: number };
  // Where shipping/tax money currently sits: held (collected, not yet
  // remitted) vs remitted (paid out to a courier / tax authority).
  platformBalance: {
    commissionRevenue: number;
    shippingHeld: number;
    shippingRemitted: number;
    taxHeld: number;
    taxRemitted: number;
  };
}

export interface PlatformLedgerEntry {
  id: number;
  orderId: number | null;
  refundId: number | null;
  type: string;
  commissionDelta: number;
  shippingHeldDelta: number;
  shippingRemittedDelta: number;
  taxHeldDelta: number;
  taxRemittedDelta: number;
  commissionBalanceAfter: number;
  shippingHeldBalanceAfter: number;
  shippingRemittedBalanceAfter: number;
  taxHeldBalanceAfter: number;
  taxRemittedBalanceAfter: number;
  note: string | null;
  createdAt: string;
  order?: { orderNumber: string } | null;
}

export interface PlatformBalance {
  commissionRevenue: number;
  shippingHeld: number;
  shippingRemitted: number;
  taxHeld: number;
  taxRemitted: number;
  updatedAt: string;
}

export function useFinanceOverview(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['finance', 'overview', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const response = await api.get(`/finance/overview?${params.toString()}`);
      return unwrapApiData<FinanceOverview>(response);
    },
  });
}

export function useGlobalLedger(sellerId?: number, type?: string, page = 1, limit = 25) {
  return useQuery({
    queryKey: ['finance', 'ledger', sellerId, type, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (sellerId) params.append('sellerId', String(sellerId));
      if (type && type !== 'all') params.append('type', type);
      const response = await api.get(`/finance/ledger?${params.toString()}`);
      return (response as any).data as Paginated<LedgerEntry>;
    },
  });
}

export interface ReconciliationResult {
  sellersChecked: number;
  balanceMismatches: Array<{
    sellerId: number;
    storeName: string;
    storedBalance: Record<string, number>;
    ledgerSum: Record<string, number>;
    diffs: Record<string, number>;
  }>;
  missingSaleLedgerEntries: Array<{ id: number; orderNumber: string; sellerId: number }>;
  missingRefundLedgerEntries: Array<{ id: number; orderId: number; amount: number }>;
  status: 'CLEAN' | 'ISSUES_FOUND';
}

export function useReconciliation() {
  return useQuery({
    queryKey: ['finance', 'reconciliation'],
    queryFn: async () => {
      const response = await api.get('/finance/reconciliation');
      return unwrapApiData<ReconciliationResult>(response);
    },
  });
}

export function useCreateAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      sellerId: number;
      bucket: 'pending' | 'available' | 'paidOut' | 'refunded';
      amount: number;
      reason: string;
    }) => {
      const response = await api.post('/finance/adjustments', data);
      return unwrapApiData<LedgerEntry>(response);
    },
    onSuccess: (_data, variables) => {
      toast.success('Adjustment recorded');
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      queryClient.invalidateQueries({ queryKey: ['sellers', variables.sellerId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create adjustment');
    },
  });
}

export function useResyncBalance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      sellerId: number;
      bucket: 'pending' | 'available' | 'paidOut' | 'refunded';
      reason: string;
      confirm: true;
    }) => {
      const response = await api.post('/finance/resync', data);
      return unwrapApiData<LedgerEntry>(response);
    },
    onSuccess: (_data, variables) => {
      toast.success('Balance resynced to ledger-implied value');
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      queryClient.invalidateQueries({ queryKey: ['sellers', variables.sellerId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to resync balance');
    },
  });
}

export function useNegativeBalanceSellers() {
  return useQuery({
    queryKey: ['finance', 'negative-balances'],
    queryFn: async () => {
      const response = await api.get('/finance/negative-balances');
      return unwrapApiData<Array<{ sellerId: number; storeName: string; availableAmount: number }>>(response);
    },
  });
}

export function useAdminCreatePayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sellerId, amount }: { sellerId: number; amount: number }) => {
      const response = await api.post(`/payouts/admin/${sellerId}`, { amount });
      return unwrapApiData<Payout>(response);
    },
    onSuccess: (_data, variables) => {
      toast.success('Payout created for seller');
      queryClient.invalidateQueries({ queryKey: ['sellers', variables.sellerId, 'balance'] });
      queryClient.invalidateQueries({ queryKey: ['sellers', variables.sellerId, 'ledger'] });
      queryClient.invalidateQueries({ queryKey: ['payouts'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create payout');
    },
  });
}

// --- Platform Ledger (commission revenue, shipping, tax) ---
// Where shipping/tax collected from customers actually goes — see
// FinanceService.creditPlatformOnSale / reversePlatformOnRefund. Mirrors
// the seller ledger hooks above, one level up (platform-wide, not per-seller).

export function usePlatformBalance() {
  return useQuery({
    queryKey: ['finance', 'platform-balance'],
    queryFn: async () => {
      const response = await api.get('/finance/platform-balance');
      return unwrapApiData<PlatformBalance>(response);
    },
  });
}

export function usePlatformLedger(type?: string, page = 1, limit = 25) {
  return useQuery({
    queryKey: ['finance', 'platform-ledger', type, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (type && type !== 'all') params.append('type', type);
      const response = await api.get(`/finance/platform-ledger?${params.toString()}`);
      return (response as any).data as Paginated<PlatformLedgerEntry>;
    },
  });
}

export function useRecordRemittance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { bucket: 'shipping' | 'tax'; amount: number; reason: string }) => {
      const response = await api.post('/finance/platform-remittance', data);
      return unwrapApiData<PlatformLedgerEntry>(response);
    },
    onSuccess: () => {
      toast.success('Remittance recorded');
      queryClient.invalidateQueries({ queryKey: ['finance'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to record remittance');
    },
  });
}

export function useCreatePlatformAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      bucket: 'commission' | 'shippingHeld' | 'shippingRemitted' | 'taxHeld' | 'taxRemitted';
      amount: number;
      reason: string;
    }) => {
      const response = await api.post('/finance/platform-adjustments', data);
      return unwrapApiData<PlatformLedgerEntry>(response);
    },
    onSuccess: () => {
      toast.success('Platform adjustment recorded');
      queryClient.invalidateQueries({ queryKey: ['finance'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create platform adjustment');
    },
  });
}
