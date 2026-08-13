// placeholder for src/modules/payments/entities/payment.entity.ts
import { Payment, PaymentMethod, PaymentStatus } from '@prisma/client';

export class PaymentEntity implements Payment {
  id: number;
  orderId: number;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  proofImage: string | null;
  transactionId: string | null;
  notes: string | null;
  paidAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<PaymentEntity>) {
    Object.assign(this, partial);
  }

  // Get status color for UI
  getStatusColor(): string {
    const colors: Record<PaymentStatus, string> = {
      PENDING: 'yellow',
      PAID: 'green',
      FAILED: 'red',
      REFUNDED: 'orange',
      PARTIALLY_REFUNDED: 'orange',
    };
    return colors[this.status];
  }

  // Get status label
  getStatusLabel(): string {
    const labels: Record<PaymentStatus, string> = {
      PENDING: 'Pending',
      PAID: 'Paid',
      FAILED: 'Failed',
      REFUNDED: 'Refunded',
      PARTIALLY_REFUNDED: 'Partially Refunded',
    };
    return labels[this.status];
  }

  // Get method label
  getMethodLabel(): string {
    const labels: Record<PaymentMethod, string> = {
      COD: 'Cash on Delivery',
      BANK_TRANSFER: 'Bank Transfer',
    };
    return labels[this.method];
  }

  // Get formatted amount
  getFormattedAmount(): string {
    return `$${this.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // Check if payment is completed
  isCompleted(): boolean {
    return this.status === PaymentStatus.PAID;
  }

  // Check if payment is pending
  isPending(): boolean {
    return this.status === PaymentStatus.PENDING;
  }

  // Check if payment failed
  isFailed(): boolean {
    return this.status === PaymentStatus.FAILED;
  }

  // Check if payment is refunded
  isRefunded(): boolean {
    return this.status === PaymentStatus.REFUNDED;
  }

  // Check if payment requires proof upload
  requiresProofUpload(): boolean {
    return this.method === PaymentMethod.BANK_TRANSFER && this.status === PaymentStatus.PENDING && !this.proofImage;
  }

  // Get payment method icon name
  getMethodIcon(): string {
    const icons: Record<PaymentMethod, string> = {
      COD: 'truck',
      BANK_TRANSFER: 'building-bank',
    };
    return icons[this.method];
  }

  // Check if payment can be confirmed
  canConfirm(): boolean {
    return this.status === PaymentStatus.PENDING;
  }

  // Check if payment can be refunded
  canRefund(): boolean {
    return this.status === PaymentStatus.PAID;
  }
}