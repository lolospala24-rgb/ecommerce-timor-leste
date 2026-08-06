import { UserSummary } from './user.types';
import { SellerSummary } from './seller.types';
import { ProductSummary } from './product.types';
import { Address } from './user.types';
import { Payment } from './payment.types';

// Order status types
export type OrderStatus = 
  | 'PENDING' 
  | 'PAID' 
  | 'PROCESSING' 
  | 'SHIPPING' 
  | 'DELIVERED' 
  | 'CANCELLED';

// Payment method types
export type PaymentMethod = 'COD' | 'BANK_TRANSFER';

// Order interface
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
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Order with relations
export interface OrderWithRelations extends Order {
  customer?: UserSummary;
  seller?: SellerSummary;
  items?: OrderItem[];
  payment?: Payment;
  address?: Address;
  timeline?: OrderTimelineItem[];
}

// Order item
export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  price: number;
  total: number;
  createdAt: string;
  product?: ProductSummary;
}

// Order summary
export interface OrderSummary {
  id: number;
  orderNumber: string;
  total: number;
  status: OrderStatus;
  createdAt: string;
}

// Create order DTO
export interface CreateOrderDto {
  addressId: number;
  paymentMethod: PaymentMethod;
  notes?: string;
}

// Update order status DTO
export interface UpdateOrderStatusDto {
  status: OrderStatus;
  trackingNumber?: string;
}

// Order filter params
export interface OrderFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: OrderStatus;
  startDate?: string;
  endDate?: string;
  sellerId?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Order timeline item
export interface OrderTimelineItem {
  status: string;
  date: string;
  description: string;
  completed: boolean;
}

// Order statistics
export interface OrderStats {
  total: number;
  pending: number;
  processing: number;
  shipping: number;
  delivered: number;
  cancelled: number;
  totalSpent: number;
  averageOrderValue: number;
}

// Order tracking
export interface OrderTracking {
  order: OrderWithRelations;
  currentStatus: OrderStatus;
  estimatedDelivery: string | null;
  timeline: OrderTimelineItem[];
}

// Invoice data
export interface InvoiceData {
  order: OrderWithRelations;
  storeInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
    taxId?: string;
  };
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
}