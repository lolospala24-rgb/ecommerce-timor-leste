"use client";

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface Payment {
  id: number;
  orderId?: number;
  amount: number;
  method: string;
  status: string;
  paidAt?: string | null;
  transactionId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  // additional relations
  customer?: {
    id: number;
    name: string;
    email: string;
  };
}

interface PaymentsResponse {
  data: Payment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface PaymentFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  method?: string;
  startDate?: string;
  endDate?: string;
}

export const usePayments = (filters?: PaymentFilters) => {
  return useQuery({
    queryKey: ['payments', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.search) params.append('search', filters.search);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.method) params.append('method', filters.method);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);

      const response = await api.get<PaymentsResponse>(`/payments?${params.toString()}`);
      return response.data;
    },
  });
};

export const usePayment = (id?: number | null) => {
  return useQuery({
    queryKey: ['payments', id],
    queryFn: async () => {
      const response = await api.get<Payment>(`/payments/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

export default usePayments;
