export interface Payment {
  id: number;
  orderId: number;
  amount: number;
  method: 'COD' | 'BANK_TRANSFER' | string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | string;
  transactionId: string | null;
  proofImage: string | null;
  notes: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  order?: {
    id: number;
    orderNumber: string;
    customer?: {
      id: number;
      name: string;
      email: string;
      phone: string | null;
    };
  };
}
