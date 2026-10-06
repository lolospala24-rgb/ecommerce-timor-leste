import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartSelectionState {
  selectedKeys: string[];
  knownKeys: string[];
  /** Call whenever the cart's item list changes. Any key never seen before
   *  is selected by default (newly added items start checked); keys that
   *  no longer exist (removed items) are dropped so these arrays don't
   *  grow unbounded. */
  syncKeys: (allKeys: string[]) => void;
  toggle: (key: string) => void;
  setMany: (keys: string[], selected: boolean) => void;
  isSelected: (key: string) => boolean;
}

// Local-only, UI-level concern — which cart lines the shopper wants to
// check out right now. Never sent to the backend on its own; checkout
// reads this to decide which cart items to actually process. Persisted so
// the selection survives the navigation from /cart to /checkout.
export const useCartSelectionStore = create<CartSelectionState>()(
  persist(
    (set, get) => ({
      selectedKeys: [],
      knownKeys: [],

      syncKeys: (allKeys) => {
        const { selectedKeys, knownKeys } = get();
        const allSet = new Set(allKeys);
        const knownSet = new Set(knownKeys);
        const newKeys = allKeys.filter((k) => !knownSet.has(k));
        const nextSelected = [...selectedKeys.filter((k) => allSet.has(k)), ...newKeys];
        const nextKnown = [...knownKeys.filter((k) => allSet.has(k)), ...newKeys];
        set({ selectedKeys: nextSelected, knownKeys: nextKnown });
      },

      toggle: (key) => {
        const { selectedKeys } = get();
        set({
          selectedKeys: selectedKeys.includes(key)
            ? selectedKeys.filter((k) => k !== key)
            : [...selectedKeys, key],
        });
      },

      setMany: (keys, selected) => {
        const { selectedKeys } = get();
        const keySet = new Set(keys);
        if (selected) {
          const merged = new Set([...selectedKeys, ...keys]);
          set({ selectedKeys: Array.from(merged) });
        } else {
          set({ selectedKeys: selectedKeys.filter((k) => !keySet.has(k)) });
        }
      },

      isSelected: (key) => get().selectedKeys.includes(key),
    }),
    {
      name: 'cart-selection-storage',
    },
  ),
);
