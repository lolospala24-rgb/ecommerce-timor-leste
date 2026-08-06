'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface ProductType {
  id: number;
  name: string;
  description: string | null;
  fields?: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const useProductTypes = () => {
  return useQuery<ProductType[]>({
    queryKey: ['product-types'],
    queryFn: async () => {
      const response = await api.get<{ data: ProductType[] } | ProductType[]>('/products/types');
      const data = response.data as unknown;
      if (Array.isArray(data)) {
        return data;
      }
      return Array.isArray((data as any)?.data) ? (data as any).data : [];
    },
  });
};
