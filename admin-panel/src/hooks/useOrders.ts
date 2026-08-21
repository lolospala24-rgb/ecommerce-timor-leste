import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Order {
  id: number;
  orderNumber: string;
  customerId: number;
  sellerId: number;
  subtotal: number;
  shippingCost: number;
  taxAmount?: number;
  serviceFee?: number;
  discountAmount?: number;
  total: number;
  status: string;
  paymentMethod: string;
  trackingNumber: string | null;
  notes: string | null;
  addressId: number;
  createdAt: string;
  updatedAt: string;
  deliveredAt: string | null;
  cancelledAt: string | null;
  couponUsage?: { coupon: { code: string } } | null;
  customer?: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
  };
  seller?: {
    id: number;
    storeName: string;
    storePhone?: string | null;
    storeEmail?: string | null;
  };
  items?: Array<{
    id: number;
    productId: number;
    quantity: number;
    price: number;
    total: number;
    product?: {
      id: number;
      name: string;
      thumbnail: string | null;
      sku?: string;
      slug?: string;
    };
  }>;
  address?: {
    id: number;
    municipality: string;
    postoAdmin: string;
    suco: string;
    village: string | null;
    street: string | null;
    reference: string | null;
    recipientName: string | null;
    phone: string | null;
  };
  payment?: {
    id: number;
    amount: number;
    method: string;
    status: string;
    paidAt: string | null;
    transactionId: string | null;
  };
  timeline?: Array<{
    status: string;
    date: string;
    description: string;
    completed: boolean;
  }>;
}

interface OrdersResponse {
  data: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface OrderFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  sellerId?: number;
}

export const useOrders = (filters?: OrderFilters) => {
  return useQuery({
    queryKey: ['orders', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.search) params.append('search', filters.search);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.sellerId) params.append('sellerId', filters.sellerId.toString());
      
      const response = await api.get(`/orders?${params.toString()}`);
      // Extract data from response properly
      return response.data || response;
    },
  });
};

export const useOrder = (id?: number | null) => {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: async () => {
      if (!id) {
        return null;
      }

      const response = await api.get(`/orders/${id}`);
      // The API returns { data: order } or just order
      const orderData = response.data?.data || response.data || response;
      
      // Ensure timeline exists
      if (orderData && !orderData.timeline) {
        orderData.timeline = [];
      }
      
      return orderData as Order;
    },
    enabled: !!id,
  });
};

export interface InvoiceData {
  id: number;
  orderNumber: string;
  status: string;
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  serviceFee: number;
  discountAmount: number;
  couponUsage: { coupon: { code: string } } | null;
  total: number | null;
  paymentMethod: string | null;
  trackingNumber: string | null;
  notes: string | null;
  createdAt: string;
  customer: { name: string; email: string; phone: string | null };
  seller: { storeName: string; storePhone: string; storeEmail: string | null; storeAddress: string };
  items: Array<{
    id: number;
    quantity: number;
    price: number;
    total: number;
    product: { id: number; name: string; price: number; sku: string | null; thumbnail: string | null };
    variant: { sku: string; attributes: Record<string, string> } | null;
  }>;
  address: {
    street: string | null;
    village: string | null;
    suco: string;
    postoAdmin: string | null;
    municipality: string | null;
    reference: string | null;
    recipientName: string | null;
    phone: string | null;
  };
  payment: {
    method: string;
    status: string;
    amount: number;
    paidAt: string | null;
    transactionId: string | null;
  } | null;
}

// GET /orders/invoice/:id — a distinct, deliberately narrower read than
// useOrder(): no timeline, no seller userId, just what a professional
// invoice document needs (see orders.service.ts#getInvoice).
export const useInvoice = (id?: number | null) => {
  return useQuery({
    queryKey: ['orders', id, 'invoice'],
    queryFn: async () => {
      if (!id) return null;
      const response = await api.get(`/orders/invoice/${id}`);
      const data = response.data?.data || response.data || response;
      return data as InvoiceData;
    },
    enabled: !!id,
  });
};

export const useUserOrders = (filters?: { page?: number; limit?: number; status?: string }) => {
  return useQuery({
    queryKey: ['orders', 'my-orders', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.status) params.append('status', filters.status);
      const response = await api.get(`/orders/my-orders?${params.toString()}`);
      return response.data || response;
    },
  });
};

export const useSellerOrders = (filters?: { page?: number; limit?: number; status?: string }) => {
  return useQuery({
    queryKey: ['orders', 'seller', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.status) params.append('status', filters.status);
      const response = await api.get(`/orders/seller/orders?${params.toString()}`);
      return response.data || response;
    },
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status, trackingNumber }: { id: number; status: string; trackingNumber?: string }) => {
      const response = await api.patch(`/orders/${id}/status`, { status, trackingNumber });
      return response.data?.data || response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', variables.id] });
      toast.success('Order status updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update order status');
    },
  });
};

export const useCancelOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason?: string }) => {
      const response = await api.post(`/orders/${id}/cancel`, { reason });
      return response.data?.data || response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', variables.id] });
      toast.success('Order cancelled successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    },
  });
};

export const useOrderStats = () => {
  return useQuery({
    queryKey: ['orders', 'stats'],
    queryFn: async () => {
      const response = await api.get('/orders/stats');
      return response.data?.data || response.data;
    },
  });
};