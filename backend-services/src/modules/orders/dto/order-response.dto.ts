// placeholder for src/modules/orders/dto/order-response.dto.ts
import { OrderStatus, PaymentMethod } from '@prisma/client';

export class OrderResponseDto {
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
  createdAt: Date;
  updatedAt: Date;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
  
  // Relations
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
  items?: OrderItemDto[];
  payment?: PaymentDto;
  address?: AddressDto;
  timeline?: TimelineItemDto[];
}

export class OrderItemDto {
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

export class PaymentDto {
  id: number;
  amount: number;
  method: PaymentMethod;
  status: string;
  paidAt: Date | null;
}

export class AddressDto {
  id: number;
  municipality: string;
  postoAdmin: string;
  suco: string;
  village: string | null;
  street: string | null;
  reference: string | null;
  phone: string;
}

export class TimelineItemDto {
  status: string;
  date: Date;
  description: string;
  completed: boolean;
}