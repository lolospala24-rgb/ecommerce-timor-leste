import type { Address } from './address.types';

export type OrderStatus = 'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED';
export type PaymentMethod = 'COD' | 'BANK_TRANSFER';

export interface Order {
  id: number;
  orderNumber: string;
  customerId: number;
  sellerId: number;
  subtotal: number;
  shippingCost: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  trackingNumber: string | null;
  notes: string | null;
  addressId: number;
  createdAt: string;
  updatedAt: string;
  deliveredAt: string | null;
  cancelledAt: string | null;
  customer?: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
  };
  seller?: {
    id: number;
    storeName: string;
  };
  items?: OrderItem[];
  address?: Address;
  payment?: Payment;
  timeline?: TimelineItem[];
}

export interface OrderItem {
  id: number;
  productId: number;
  quantity: number;
  price: number;
  total: number;
  product?: {
    id: number;
    name: string;
    thumbnail: string | null;
  };
}

export interface Payment {
  id: number;
  amount: number;
  method: PaymentMethod;
  status: string;
  paidAt: string | null;
  transactionId: string | null;
}

export interface TimelineItem {
  status: string;
  date: string;
  description: string;
  completed: boolean;
}