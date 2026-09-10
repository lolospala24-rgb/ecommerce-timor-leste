'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { unwrapApiData } from '@/lib/product';

// Option list for the Local Products Municipality filter. Deliberately NOT
// Shipping's Municipality table (GET /locations/municipalities) — Seller/
// Product Origin is independent free text, so a fixed Shipping-sourced list
// could offer options nothing actually matches (or miss real ones sellers
// typed differently). This instead comes straight from GET
// /products/local-municipalities, which returns the distinct resolved
// origins of real active local products — every option shown here is
// guaranteed to actually filter to something.
export function useLocalOriginMunicipalities() {
  return useQuery<string[]>({
    queryKey: ['products', 'local-municipalities'],
    queryFn: async () => {
      const response = await api.get('/products/local-municipalities');
      return unwrapApiData<string[]>(response);
    },
    staleTime: 1000 * 60 * 5,
  });
}
