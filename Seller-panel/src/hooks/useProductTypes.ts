import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { unwrapApiData } from '@/lib/utils';
import type { ProductType } from '@/types/product.types';

// Product Types are admin-managed (creating/editing one is admin-only, per
// the backend RBAC map) — sellers only ever read the list to pick one for
// their own product and get its suggested Variant/Specification fields.
export function useProductTypes() {
  return useQuery({
    queryKey: ['product-types'],
    queryFn: async () => {
      const res = await api.get('/products/types', { params: { limit: 200 } });
      return unwrapApiData<ProductType[]>(res);
    },
    select: (data) => data.filter((t) => t.isActive),
    staleTime: 5 * 60_000,
  });
}
