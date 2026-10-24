'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface PhoneVerificationStatus {
  verifiedPhone: string | null;
  phoneVerifiedAt: string | null;
}

const unwrapApiResponse = (response: any) => response?.data ?? response;

export const usePhoneVerificationStatus = () => {
  return useQuery({
    queryKey: ['phone-verification-status'],
    queryFn: async () => {
      const response = await api.get('/account/phone/status');
      const data = unwrapApiResponse(response);
      return (data?.data ?? data) as PhoneVerificationStatus;
    },
  });
};

export const useRequestPhoneCode = () => {
  return useMutation({
    mutationFn: async (phone: string) => {
      const response = await api.post('/account/phone/request-code', { phone });
      return unwrapApiResponse(response);
    },
  });
};

export const useVerifyPhoneCode = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const response = await api.post('/account/phone/verify', { code });
      return unwrapApiResponse(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phone-verification-status'] });
      // The referrer's dashboard pill ("Hein belun verifika telefone")
      // depends on the referred user's status too, but that's a
      // different account's query cache — nothing to invalidate here for
      // that side; it naturally reflects the new status next time that
      // referrer's own session re-fetches.
      queryClient.invalidateQueries({ queryKey: ['referral-history'] });
      queryClient.invalidateQueries({ queryKey: ['referral-detail'] });
    },
  });
};
