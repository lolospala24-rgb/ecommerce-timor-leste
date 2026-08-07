'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { unwrapApiData } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Seller {
  id: number;
  userId: number;
  storeName: string;
  storePhone: string;
  storeEmail: string | null;
  storeAddress: string;
  storeLogo: string | null;
  storeBanner: string | null;
  description: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  verifiedBy: number | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    email: string;
    name: string;
    phone: string | null;
  };
  _count?: {
    products: number;
    orders: number;
  };
  rating?: number;
  totalReviews?: number;
  totalRevenue?: number;
  products?: any[];
  orders?: any[];
}

interface SellersResponse {
  data: Seller[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface SellerFilters {
  page?: number;
  limit?: number;
  search?: string;
  isVerified?: boolean;
}

export const useSellers = (filters?: SellerFilters) => {
  return useQuery({
    queryKey: ['sellers', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.search) params.append('search', filters.search);
      if (filters?.isVerified !== undefined) params.append('isVerified', filters.isVerified.toString());
      
      const response = await api.get<SellersResponse>(`/sellers?${params.toString()}`);
      return response.data;
    },
  });
};

export const useSeller = (id: number) => {
  return useQuery({
    queryKey: ['sellers', id],
    queryFn: async () => {
      const response = await api.get<any>(`/sellers/${id}`);
      return unwrapApiData<Seller>(response.data);
    },
    enabled: !!id,
  });
};

export const useMyStore = () => {
  return useQuery({
    queryKey: ['sellers', 'my-store'],
    queryFn: async () => {
      const response = await api.get<Seller>('/sellers/my-store');
      return unwrapApiData<Seller>(response.data);
    },
  });
};

export const usePendingSellers = () => {
  return useQuery({
    queryKey: ['sellers', 'pending'],
    queryFn: async () => {
      const response = await api.get<{ data: Seller[] }>('/sellers/pending');
      const data = unwrapApiData<Seller[]>(response.data);
      return Array.isArray(data) ? data : [];
    },
  });
};

export const useVerifiedSellers = (page: number = 1, limit: number = 10) => {
  return useQuery({
    queryKey: ['sellers', 'verified', page, limit],
    queryFn: async () => {
      const response = await api.get<SellersResponse>(`/sellers/verified?page=${page}&limit=${limit}`);
      return response.data;
    },
  });
};

export const useRegisterSeller = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      email: string;
      password: string;
      name: string;
      phone: string;
      storeName: string;
      storePhone: string;
      storeEmail?: string;
      storeAddress: string;
      storeLogo?: string;
      storeBanner?: string;
      description?: string;
    }) => {
      const response = await api.post('/sellers/register', data);
      return unwrapApiData<Seller>(response.data);
    },
    onSuccess: () => {
      toast.success('Registration submitted. Awaiting admin verification.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Registration failed');
    },
  });
};

export const useUpdateSeller = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Seller> }) => {
      const response = await api.patch(`/sellers/${id}`, data);
      return unwrapApiData<Seller>(response.data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sellers'] });
      queryClient.invalidateQueries({ queryKey: ['sellers', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['sellers', 'my-store'] });
      toast.success('Store updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update store');
    },
  });
};

export const useVerifySeller = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, isApproved, rejectionReason }: { id: number; isApproved: boolean; rejectionReason?: string }) => {
      const response = await api.post(`/sellers/${id}/verify`, { isApproved, rejectionReason });
      return unwrapApiData<Seller>(response.data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sellers'] });
      queryClient.invalidateQueries({ queryKey: ['sellers', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['sellers', 'pending'] });
      toast.success(variables.isApproved ? 'Seller approved successfully' : 'Seller rejected');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Verification failed');
    },
  });
};

export const useDeleteSeller = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/sellers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sellers'] });
      toast.success('Seller deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete seller');
    },
  });
};

export const useUploadStoreLogo = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('logo', file);
      const response = await api.post('/sellers/upload-logo', formData);
      return unwrapApiData(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sellers', 'my-store'] });
      toast.success('Logo uploaded successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to upload logo');
    },
  });
};