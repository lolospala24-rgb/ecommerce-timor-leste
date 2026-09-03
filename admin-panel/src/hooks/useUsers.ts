'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { unwrapApiData } from '@/lib/utils';
import toast from 'react-hot-toast';

interface User {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  seller?: {
    id: number;
    storeName: string;
    storePhone?: string | null;
    storeAddress?: string | null;
    isVerified: boolean;
    _count?: {
      products: number;
    };
  };
  totalSpent?: number;
  _count?: {
    orders: number;
    reviews: number;
    assignedDeliveries?: number;
  };
  orders?: Array<{
    id: number;
    orderNumber: string;
    total: number;
    status: string;
    createdAt: string;
  }>;
  reviews?: Array<{
    id: number;
    rating: number;
    comment: string;
    createdAt: string;
    product: {
      id: number;
      name: string;
    };
  }>;
  customerAddress?: Array<{
    id: number;
    municipality: string;
    postoAdmin: string;
    suco: string;
    isPrimary: boolean;
  }>;
}

interface UsersResponse {
  data: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isActive?: boolean;
}

export const useUsers = (filters?: UserFilters) => {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.search) params.append('search', filters.search);
      if (filters?.role) params.append('role', filters.role);
      if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString());
      
      const response = await api.get<UsersResponse>(`/users?${params.toString()}`);
      return response.data;
    },
  });
};

export const useUser = (id: number) => {
  return useQuery({
    queryKey: ['users', id],
    queryFn: async () => {
      const response = await api.get<User>(`/users/${id}`);
      return unwrapApiData<User>(response.data);
    },
    enabled: !!id,
  });
};

export const useProfile = () => {
  return useQuery({
    queryKey: ['users', 'profile'],
    queryFn: async () => {
      const response = await api.get<User>('/users/profile');
      return unwrapApiData<User>(response.data);
    },
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<User> & { password: string }) => {
      const response = await api.post('/users', data);
      return unwrapApiData<User>(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create user');
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<User> }) => {
      const response = await api.patch(`/users/${id}`, data);
      return unwrapApiData<User>(response.data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['users', 'profile'] });
      toast.success('User updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update user');
    },
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<User>) => {
      const response = await api.patch('/users/profile', data);
      return unwrapApiData<User>(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'profile'] });
      toast.success('Profile updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete user');
    },
  });
};

export const useBlockUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.patch(`/users/${id}/block`);
      return unwrapApiData<User>(response.data);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', id] });
      toast.success('User blocked successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to block user');
    },
  });
};

export const useUnblockUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.patch(`/users/${id}/unblock`);
      return unwrapApiData<User>(response.data);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', id] });
      toast.success('User unblocked successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to unblock user');
    },
  });
};

export const useChangeUserRole = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, role }: { id: number; role: string }) => {
      const response = await api.post(`/users/${id}/role`, { role });
      return unwrapApiData<User>(response.data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', variables.id] });
      toast.success('User role updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to change user role');
    },
  });
};

export const useUserStats = () => {
  return useQuery({
    queryKey: ['users', 'stats'],
    queryFn: async () => {
      const response = await api.get('/users/stats');
      return unwrapApiData(response.data);
    },
  });
};