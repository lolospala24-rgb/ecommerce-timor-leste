'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Product } from '@/types/product.types';

export interface FlashSaleCategory {
  id: number;
  name: string;
  slug: string;
}

export interface FlashSaleResponse {
  data: Product[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  categories: FlashSaleCategory[];
  endsAt: string | null;
  startsAt: string | null;
}

interface FlashSaleFilters {
  page?: number;
  limit?: number;
  category?: string;
}

// The controller wraps its return as `{ data: <service result> }`, and the
// global response interceptor wraps THAT again as `{ status, data: ... }`
// (axios's own interceptor already strips axios's transport wrapper, see
// lib/api.ts) — so after both server-side wraps, `response.data` is the
// service's result object directly (the one with `.data`/`.pagination`/
// `.categories`). Defensive fallback in case either wrap is ever flattened.
function unwrap(response: any): FlashSaleResponse {
  const candidate = response?.data;
  const payload = candidate && Array.isArray(candidate.data) ? candidate : (response?.data?.data ?? response);
  return {
    data: payload?.data ?? [],
    pagination: payload?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 1 },
    categories: payload?.categories ?? [],
    endsAt: payload?.endsAt ?? null,
    startsAt: payload?.startsAt ?? null,
  };
}

// Active campaigns — GET /promotions/flash-sale (public, see
// PromotionsService.getFlashSaleProducts). Real data only: stock is the
// product's actual remaining stock, salesCount is units actually sold
// through this specific promotion (DELIVERED order lines), categories are
// only the ones genuinely represented among currently-active items.
export function useFlashSaleActive(filters?: FlashSaleFilters) {
  return useQuery({
    queryKey: ['flash-sale', 'active', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(filters?.page ?? 1));
      params.set('limit', String(filters?.limit ?? 20));
      if (filters?.category) params.set('category', filters.category);
      const response = await api.get(`/promotions/flash-sale?${params.toString()}`);
      return unwrap(response);
    },
    // Short staleTime — a countdown-driven page should reflect quota/sold
    // movement reasonably promptly, but not refetch on every render.
    staleTime: 15_000,
  });
}

// Scheduled campaigns — GET /promotions/flash-sale/upcoming.
export function useFlashSaleUpcoming(filters?: FlashSaleFilters) {
  return useQuery({
    queryKey: ['flash-sale', 'upcoming', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(filters?.page ?? 1));
      params.set('limit', String(filters?.limit ?? 20));
      if (filters?.category) params.set('category', filters.category);
      const response = await api.get(`/promotions/flash-sale/upcoming?${params.toString()}`);
      return unwrap(response);
    },
    staleTime: 30_000,
  });
}

// Product Detail's flash-sale block — real units sold through this specific
// promotion. Only fetched when a product actually has an active promotion.
export function usePromotionSoldCount(promotionId?: number | null) {
  return useQuery({
    queryKey: ['promotions', promotionId, 'sold-count'],
    queryFn: async () => {
      const response = await api.get(`/promotions/${promotionId}/sold-count`);
      const payload = response?.data?.data ?? response?.data ?? response;
      return (payload?.soldCount as number) ?? 0;
    },
    enabled: !!promotionId,
    staleTime: 15_000,
  });
}
