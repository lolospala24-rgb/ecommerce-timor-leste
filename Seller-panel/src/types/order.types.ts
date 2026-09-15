export type OrderStatus = 'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED';
export type ShippingStatus = 'PENDING' | 'BOOKED' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED';

export interface OrderCustomer {
  id: number;
  name: string;
  email: string;
  phone: string | null;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  variantId: number | null;
  quantity: number;
  price: number;
  total: number;
  createdAt: string;
  product: {
    id: number;
    name: string;
    thumbnail: string | null;
    price: number;
  };
}

export interface SellerOrder {
  id: number;
  orderNumber: string;
  customerId: number;
  sellerId: number;
  subtotal: number;
  total: number;
  shippingCost: number;
  taxAmount: number;
  serviceFee: number;
  discountAmount: number;
  commissionRate: number | null;
  commissionAmount: number | null;
  sellerNetAmount: number | null;
  paymentMethod: 'COD' | 'BANK_TRANSFER';
  status: OrderStatus;
  shippingMethod: string | null;
  courier: string | null;
  shippingStatus: ShippingStatus;
  estimatedDeliveryDate: string | null;
  trackingNumber: string | null;
  notes: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  deliveryRecipientName: string | null;
  deliveryPhone: string | null;
  deliveryMunicipality: string | null;
  deliveryPostoAdmin: string | null;
  deliverySuco: string | null;
  deliveryVillage: string | null;
  deliveryStreet: string | null;
  deliveryReference: string | null;
  assignedDriverId: number | null;
  customer: OrderCustomer;
  items: OrderItem[];
  payment: Record<string, unknown> | null;
  address: Record<string, unknown> | null;
}

export interface OrderTimelineStep {
  status: string;
  date: string | null;
  description: string;
  completed: boolean;
}

export interface SellerOrderDetail extends SellerOrder {
  timeline: OrderTimelineStep[];
}

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PAID', 'PROCESSING', 'CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'New',
  PAID: 'Paid',
  PROCESSING: 'Processing',
  SHIPPING: 'Shipped',
  DELIVERED: 'Completed',
  CANCELLED: 'Cancelled',
};
