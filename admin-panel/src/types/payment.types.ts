export interface Payment {
  id: number;
  orderId: number;
  amount: number;
  method: 'COD' | 'BANK_TRANSFER' | string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | string;
  transactionId: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}
