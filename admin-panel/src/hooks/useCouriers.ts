import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export interface CourierData {
  id: number;
  name: string;
  code: string;
  phone?: string;
  website?: string;
  trackingUrl?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCourierPayload {
  name: string;
  code: string;
  phone?: string;
  website?: string;
  trackingUrl?: string;
  status?: string;
}

export function useCouriers() {
  return useQuery<CourierData[]>({
    queryKey: ['couriers'],
    queryFn: async () => {
      const { data } = await api.get('/couriers');
      return data;
    },
  });
}

export function useCreateCourier() {
  const queryClient = useQueryClient();

  return useMutation<CourierData, unknown, CreateCourierPayload>({
    mutationFn: async (payload: CreateCourierPayload) => {
      const { data } = await api.post('/couriers', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couriers'] });
      toast.success('Courier created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create courier');
    },
  });
}

export function useUpdateCourier() {
  const queryClient = useQueryClient();

  return useMutation<CourierData, unknown, { id: number; payload: Partial<CreateCourierPayload> }>({
    mutationFn: async ({ id, payload }) => {
      const { data } = await api.patch(`/couriers/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couriers'] });
      toast.success('Courier updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update courier');
    },
  });
}

export function useDeleteCourier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/couriers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couriers'] });
      toast.success('Courier deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete courier');
    },
  });
}
