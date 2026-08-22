import { Order, OrderStatus, PaymentMethod, ShippingStatus } from '@prisma/client';

export class OrderEntity implements Order {
  id: number;
  orderNumber: string;
  customerId: number;
  sellerId: number;
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  serviceFee: number;
  discountAmount: number;
  couponUsageId: number | null;
  commissionRate: number | null;
  commissionAmount: number | null;
  sellerNetAmount: number | null;
  total: number | null;
  status: OrderStatus;
  paymentMethod: PaymentMethod | null;
  shippingMethod: string | null;
  courier: string | null;
  shippingStatus: ShippingStatus;
  estimatedDeliveryDate: Date | null;
  trackingNumber: string | null;
  notes: string | null;
  addressId: number;
  shippingZoneId: number | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deliveryRecipientName: string | null;
  deliveryPhone: string | null;
  deliveryMunicipality: string | null;
  deliveryPostoAdmin: string | null;
  deliverySuco: string | null;
  deliveryVillage: string | null;
  deliveryStreet: string | null;
  deliveryReference: string | null;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;

  // Additional fields
  items?: any[];
  customer?: any;
  seller?: any;
  payment?: any;
  timeline?: any[];
  couponUsage?: any;

  constructor(partial: Partial<OrderEntity>) {
    Object.assign(this, partial);
  }

  // Get formatted order number for display
  getDisplayOrderNumber(): string {
    return this.orderNumber;
  }

  // Get status color for UI
  getStatusColor(): string {
    const colors: Record<OrderStatus, string> = {
      PENDING: 'yellow',
      PAID: 'blue',
      PROCESSING: 'purple',
      SHIPPING: 'indigo',
      DELIVERED: 'green',
      CANCELLED: 'red',
    };
    return colors[this.status];
  }

  // Get status label
  getStatusLabel(): string {
    const labels: Record<OrderStatus, string> = {
      PENDING: 'Pending',
      PAID: 'Paid',
      PROCESSING: 'Processing',
      SHIPPING: 'Shipping',
      DELIVERED: 'Delivered',
      CANCELLED: 'Cancelled',
    };
    return labels[this.status];
  }

  // Check if order can be cancelled
  canCancel(): boolean {
    return this.status === OrderStatus.PENDING || this.status === OrderStatus.PAID;
  }

  // Check if order can be refunded
  canRefund(): boolean {
    if (this.status !== OrderStatus.DELIVERED) return false;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return this.deliveredAt !== null && this.deliveredAt > sevenDaysAgo;
  }

  // Get formatted total
  getFormattedTotal(): string {
    return `$${this.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // Get formatted subtotal
  getFormattedSubtotal(): string {
    return `$${this.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // Get formatted shipping cost
  getFormattedShippingCost(): string {
    return `$${this.shippingCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // Get item count
  getItemCount(): number {
    return this.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  }

  // Check if order is completed
  isCompleted(): boolean {
    return this.status === OrderStatus.DELIVERED;
  }

  // Check if order is cancelled
  isCancelled(): boolean {
    return this.status === OrderStatus.CANCELLED;
  }

  // Get days since order placed
  getDaysSincePlaced(): number {
    const diff = new Date().getTime() - this.createdAt.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  // Get estimated delivery date (if shipped)
  getEstimatedDeliveryDate(): Date | null {
    if (this.status === OrderStatus.SHIPPING && this.shippedAt) {
      const estimated = new Date(this.shippedAt);
      estimated.setDate(estimated.getDate() + 7); // 7 days shipping estimate
      return estimated;
    }
    return null;
  }
}