'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface EmailOtpStatus {
  verified: boolean;
  verifiedAt: string | null;
  email: string | null;
}

const unwrapApiResponse = (response: any) => response?.data ?? response;

export const useEmailOtpStatus = () => {
  return useQuery({
    queryKey: ['email-otp-status'],
    queryFn: async () => {
      const response = await api.get('/account/email-otp/status');
      const data = unwrapApiResponse(response);
      return (data?.data ?? data) as EmailOtpStatus;
    },
  });
};

export const useRequestEmailOtpCode = () => {
  return useMutation({
    mutationFn: async () => {
      const response = await api.post('/account/email-otp/request-code');
      return unwrapApiResponse(response);
    },
  });
};

export const useVerifyEmailOtpCode = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const response = await api.post('/account/email-otp/verify', { code });
      return unwrapApiResponse(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-otp-status'] });
      // The referrer's dashboard pill ("Hein belun verifika email")
      // depends on the referred user's status too, but that's a
      // different account's query cache — nothing to invalidate here for
      // that side; it naturally reflects the new status next time that
      // referrer's own session re-fetches.
      queryClient.invalidateQueries({ queryKey: ['referral-history'] });
      queryClient.invalidateQueries({ queryKey: ['referral-detail'] });
    },
  });
};
