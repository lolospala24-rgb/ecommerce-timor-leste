'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import api from '@/lib/api';
import { normalizeProduct, unwrapApiData } from '@/lib/product';

const STORAGE_KEY = 'recentlyViewedProducts';
const MAX_ITEMS = 20;

function readIds(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'number') : [];
  } catch {
    return [];
  }
}

function writeIds(ids: number[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Storage full or unavailable (e.g. private browsing) — recently
    // viewed is a nice-to-have, so just silently skip persisting it.
  }
}

// Purely client-side (localStorage) — per-browser, not tied to a user
// account, no backend involved. Starts empty on the server render and
// hydrates from storage after mount to avoid an SSR/client markup mismatch.
export function useRecentlyViewed() {
  const [ids, setIds] = useState<number[]>([]);

  useEffect(() => {
    setIds(readIds());
  }, []);

  const addProduct = useCallback((id: number) => {
    setIds((prev) => {
      const next = [id, ...prev.filter((existing) => existing !== id)].slice(0, MAX_ITEMS);
      writeIds(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    writeIds([]);
    setIds([]);
  }, []);

  return { ids, addProduct, clearAll };
}

// Hydrates the stored ids into real product records. Shared by the
// homepage/product-detail "Recently Viewed" widget and the full
// /account/recently-viewed page so the fetch-and-normalize logic (and the
// "a viewed product may since have been deleted/deactivated" handling)
// exists in exactly one place.
export function useRecentlyViewedProducts(options?: { excludeId?: number; limit?: number }) {
  const { ids, clearAll } = useRecentlyViewed();
  const displayIds = ids.filter((id) => id !== options?.excludeId).slice(0, options?.limit ?? MAX_ITEMS);

  const results = useQueries({
    queries: displayIds.map((id) => ({
      queryKey: ['products', id],
      queryFn: async () => {
        const response = await api.get(`/products/${id}`);
        return normalizeProduct(unwrapApiData(response));
      },
      staleTime: 60_000,
    })),
  });

  const isLoading = displayIds.length > 0 && results.some((r) => r.isLoading);
  // A product can 404 (deleted/deactivated since it was viewed) — drop it
  // rather than showing a broken card.
  const products = results
    .map((r) => r.data)
    .filter((p): p is NonNullable<typeof p> => !!p && (p as any).id);

  return { products, isLoading, hasAny: ids.length > 0, clearAll };
}
