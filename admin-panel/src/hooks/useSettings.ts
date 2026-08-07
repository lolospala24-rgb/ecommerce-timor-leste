'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { unwrapApiData } from '../lib/utils';
import toast from 'react-hot-toast';

export interface Settings {
  // General / store identity
  siteName: string;
  siteDescription: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  currency: string;
  taxRate: number;
  serviceFee: number;

  // System toggles
  maintenanceMode: boolean;
  maintenanceMessage: string;
  registrationOpen: boolean;
  sellerVerificationRequired: boolean;
  enableReviews: boolean;
  requireReviewApproval: boolean;
  maxProductImages: number;

  // Payment methods
  enableCOD: boolean;
  enableBankTransfer: boolean;
  minCODOrderAmount: number;
  maxCODOrderAmount: number;
  autoConfirmBankTransfer: boolean;
  bankName?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  bankIBAN?: string | null;
  bankSWIFT?: string | null;
  bankTransferInstructions?: string | null;

  // Outbound email (SMTP)
  smtpHost?: string | null;
  smtpPort: number;
  smtpUser?: string | null;
  // Never the real secret — either empty (unset) or a masked placeholder.
  smtpPassword?: string | null;
  smtpSecure: boolean;
  fromEmail: string;
  fromName: string;
  sendOrderConfirmation: boolean;
  sendPaymentConfirmation: boolean;
  sendShippingUpdate: boolean;
  sendWelcomeEmail: boolean;
}

// Every field is optional here to match the backend DTO: each Settings tab
// PATCHes only the subset of fields it owns.
export type SettingsUpdate = Partial<Settings>;

const fetchSettings = async (): Promise<Settings> => {
  const response = await apiClient.get<Settings>('/admin/settings');
  return unwrapApiData<Settings>(response.data);
};

export const useSettings = () => {
  const queryClient = useQueryClient();

  const query = useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: fetchSettings,
    staleTime: 1000 * 60 * 5,
  });

  const mutation = useMutation({
    mutationFn: async (settings: SettingsUpdate) => {
      const response = await apiClient.post<Settings>('/admin/settings', settings);
      return unwrapApiData<Settings>(response.data);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['settings'], data);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save settings');
    },
  });

  const clearCache = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/admin/settings/clear-cache');
      return unwrapApiData<{ message: string }>(response.data);
    },
  });

  const clearLogs = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/admin/settings/clear-logs');
      return unwrapApiData<{ message: string }>(response.data);
    },
  });

  const sendTestEmail = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiClient.post('/admin/settings/test-email', { email });
      return unwrapApiData<{ message: string }>(response.data);
    },
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    updateSettings: mutation.mutateAsync,
    clearCache: clearCache.mutateAsync,
    clearLogs: clearLogs.mutateAsync,
    sendTestEmail: sendTestEmail.mutateAsync,
  };
};
