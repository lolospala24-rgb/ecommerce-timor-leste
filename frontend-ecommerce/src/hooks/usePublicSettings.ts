'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { unwrapApiData } from '@/lib/product';

export interface PublicSettings {
  siteName: string;
  siteDescription: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  currency: string;
  taxRate: number;
  serviceFee: number;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  enableReviews: boolean;
  enableCOD: boolean;
  enableBankTransfer: boolean;
  minCODOrderAmount: number;
  maxCODOrderAmount: number;
  bankName: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankIBAN: string | null;
  bankSWIFT: string | null;
  bankTransferInstructions: string | null;
}

// Store-wide config set by the admin (contact info, payment method
// availability, bank transfer details, maintenance mode, etc). Barely
// changes, so a long staleTime avoids re-fetching on every mount.
export function usePublicSettings() {
  return useQuery<PublicSettings>({
    queryKey: ['settings', 'public'],
    queryFn: async () => {
      const response = await api.get('/settings/public');
      return unwrapApiData<PublicSettings>(response.data ?? response);
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
