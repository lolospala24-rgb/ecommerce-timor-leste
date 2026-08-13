import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { unwrapApiData } from '@/lib/utils';
import toast from 'react-hot-toast';

export interface ShippingRateData {
  id: number;
  zoneName: string;
  provinceId?: number | null;
  municipalityId?: number | null;
  courierId?: number | null;
  courierServiceId?: number | null;
  courierRateId?: number | null;
  shippingMethod?: string | null;
  shippingCost: number;
  estimatedDeliveryDays?: number | null;
  minimumWeight?: number | null;
  maximumWeight?: number | null;
  status: string;
  priority: number;
  provinceRef?: { id: number; name: string } | null;
  municipalityRef?: { id: number; name: string; isActive: boolean } | null;
  courier?: { id: number; name: string; status: string } | null;
  courierService?: { id: number; name: string; courier: { id: number; name: string } } | null;
}

export interface CreateShippingRatePayload {
  zoneName: string;
  municipalityId?: number;
  provinceId?: number;
  courierId?: number;
  courierServiceId?: number;
  shippingMethod?: string;
  shippingCost: number;
  estimatedDeliveryDays?: number;
  minimumWeight?: number;
  maximumWeight?: number;
  status?: 'ACTIVE' | 'INACTIVE';
  priority?: number;
}

export type UpdateShippingRatePayload = Partial<CreateShippingRatePayload>;

export interface ShippingDashboardData {
  totalCouriers: number;
  activeCouriers: number;
  totalMunicipalities: number;
  activeMunicipalities: number;
  totalShippingZones: number;
  activeShippingZones: number;
  coveredMunicipalities: number;
  uncoveredMunicipalities: number;
}

export function useShippingRates() {
  return useQuery<ShippingRateData[]>({
    queryKey: ['shipping-rates'],
    queryFn: async () => {
      const response = await api.get('/shipping-zones');
      return unwrapApiData<ShippingRateData[]>(response.data);
    },
  });
}

export function useCreateShippingRate() {
  const queryClient = useQueryClient();

  return useMutation<ShippingRateData, unknown, CreateShippingRatePayload>({
    mutationFn: async (payload: CreateShippingRatePayload) => {
      const response = await api.post('/shipping-zones', payload);
      return unwrapApiData<ShippingRateData>(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-rates'] });
      queryClient.invalidateQueries({ queryKey: ['shipping-dashboard'] });
      toast.success('Shipping rate created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create shipping rate');
    },
  });
}

export function useUpdateShippingRate() {
  const queryClient = useQueryClient();

  return useMutation<ShippingRateData, unknown, { id: number; payload: UpdateShippingRatePayload }>({
    mutationFn: async ({ id, payload }) => {
      const response = await api.patch(`/shipping-zones/${id}`, payload);
      return unwrapApiData<ShippingRateData>(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-rates'] });
      queryClient.invalidateQueries({ queryKey: ['shipping-dashboard'] });
      toast.success('Shipping rate updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update shipping rate');
    },
  });
}

export function useToggleShippingRate() {
  const queryClient = useQueryClient();

  return useMutation<ShippingRateData, unknown, number>({
    mutationFn: async (id: number) => {
      const response = await api.patch(`/shipping-zones/${id}/toggle`);
      return unwrapApiData<ShippingRateData>(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-rates'] });
      queryClient.invalidateQueries({ queryKey: ['shipping-dashboard'] });
      toast.success('Shipping rate status updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to toggle shipping rate');
    },
  });
}

export function useDeleteShippingRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/shipping-zones/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-rates'] });
      queryClient.invalidateQueries({ queryKey: ['shipping-dashboard'] });
      toast.success('Shipping rate deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete shipping rate');
    },
  });
}

export function useShippingDashboard() {
  return useQuery<ShippingDashboardData>({
    queryKey: ['shipping-dashboard'],
    queryFn: async () => {
      const response = await api.get('/shipping/dashboard');
      return unwrapApiData<ShippingDashboardData>(response.data);
    },
  });
}
