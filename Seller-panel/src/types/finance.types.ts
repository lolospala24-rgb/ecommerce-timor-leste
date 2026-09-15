export interface SellerBalance {
  sellerId: number;
  pendingAmount: number;
  availableAmount: number;
  processingAmount: number;
  paidOutAmount: number;
  refundedAmount: number;
}

export type LedgerEntryType = 'SALE' | 'COMMISSION' | 'RELEASE' | 'REFUND' | 'COMMISSION_REVERSAL' | 'PAYOUT';

export interface SellerLedgerEntry {
  id: number;
  sellerId: number;
  orderId: number | null;
  payoutId: number | null;
  refundId: number | null;
  type: LedgerEntryType;
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
  order: { orderNumber: string } | null;
}

export type PayoutStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';

export interface Payout {
  id: number;
  sellerId: number;
  amount: number;
  status: PayoutStatus;
  bankName: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  requestedAt: string;
  processedAt: string | null;
  processedBy: number | null;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
}
