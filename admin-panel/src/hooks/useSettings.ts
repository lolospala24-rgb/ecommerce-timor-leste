'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import toast from 'react-hot-toast';

export interface Settings {
  siteName: string;
  siteDescription: string;
  siteLogo?: string | null;
  siteFavicon?: string | null;
  contactEmail: string;
  contactPhone: string;
  address: string;
  currency: string;
  timezone?: string;
  dateFormat?: string;
  timeFormat?: string;
  taxRate: number;
  serviceFee: number;
  shippingCost: number;
  freeShippingThreshold: number;
  maintenanceMode: boolean;
  registrationOpen: boolean;
  sellerVerificationRequired: boolean;
  maxProductImages: number;
  allowedImageTypes: string[];
  maxFileSize: number;
}

const fetchSettings = async (): Promise<Settings> => {
  const response = await apiClient.get<Settings>('/admin/settings');
  return response.data;
};

export const useSettings = () => {
  const queryClient = useQueryClient();

  const query = useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: fetchSettings,
    staleTime: 1000 * 60 * 5,
  });

  const mutation = useMutation({
    mutationFn: async (settings: Settings) => {
      const response = await apiClient.post<Settings>('/admin/settings', settings);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['settings'], data);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Settings saved successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save settings');
    },
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    updateSettings: mutation.mutateAsync,
  };
};
