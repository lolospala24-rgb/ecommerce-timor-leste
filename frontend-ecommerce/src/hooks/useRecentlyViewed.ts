'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'recentlyViewedProducts';
const MAX_ITEMS = 12;

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

  return { ids, addProduct };
}
