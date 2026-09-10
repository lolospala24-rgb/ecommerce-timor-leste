'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { unwrapApiData } from '@/lib/product';

export interface MunicipalityData {
  id: number;
  name: string;
  code?: string | null;
  isActive: boolean;
  provinceId: number;
}

// Used purely as the option list for the Local Products Municipality filter
// — it filters on the RESOLVED origin (Product.originMunicipality /
// Seller.originMunicipality, both plain strings), never on this table's id,
// so this stays a display/suggestion source only, not a runtime dependency
// on Shipping's Municipality data.
export function usePublicMunicipalities() {
  return useQuery<MunicipalityData[]>({
    queryKey: ['municipalities', 'public'],
    queryFn: async () => {
      const response = await api.get('/locations/municipalities');
      return unwrapApiData<MunicipalityData[]>(response);
    },
    staleTime: 1000 * 60 * 10,
  });
}
