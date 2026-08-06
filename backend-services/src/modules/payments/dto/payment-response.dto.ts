// placeholder for src/modules/payments/dto/payment-response.dto.ts
import { PaymentMethod, PaymentStatus } from '@prisma/client';

export class PaymentResponseDto {
  id: number;
  orderId: number;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  proofImage: string | null;
  transactionId: string | null;
  notes: string | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  order?: {
    id: number;
    orderNumber: string;
    total: number;
    customer?: {
      id: number;
      name: string;
      email: string;
    };
    seller?: {
      id: number;
      storeName: string;
    };
  };
}