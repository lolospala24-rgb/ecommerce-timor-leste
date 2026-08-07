import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';
import {
  normalizeCartItems,
  productToCartItem,
} from '@/lib/cart';
import type { CartItem } from '@/types/cart.types';
import toast from 'react-hot-toast';

interface CartState {
  items: CartItem[];
  isLoading: boolean;
  error: string | null;
  fetchCart: () => Promise<void>;
  addItem: (product: any, quantity: number, variant?: any | null) => Promise<void>;
  removeItem: (productId: number, variantId?: number | null) => Promise<void>;
  updateQuantity: (productId: number, quantity: number, variantId?: number | null) => Promise<void>;
  clearCart: () => Promise<void>;
  mergeGuestCart: (items: CartItem[]) => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
}

const defaultState = {
  items: [],
  isLoading: false,
  error: null,
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      ...defaultState,

      fetchCart: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.get('/carts');
          const cartData = response?.data?.data || response?.data || {};
          const items = normalizeCartItems(cartData.items);
          set({ items, isLoading: false });
        } catch (error: any) {
          console.error('Fetch cart error:', error);
          set({ 
            error: error.response?.data?.message || 'Failed to fetch cart', 
            isLoading: false 
          });
        }
      },

      addItem: async (product: any, quantity: number, variant?: any | null) => {
        if (!product || !product.id) {
          toast.error('Invalid product');
          return;
        }

        set({ isLoading: true, error: null });
        const previousItems = get().items;
        try {
          const variantId = variant?.id ?? null;
          const payload: { productId: number; quantity: number; variantId?: number } = {
            productId: product.id,
            quantity: quantity || 1,
          };
          if (variantId) {
            payload.variantId = variantId;
          }

          const qty = quantity || 1;
          const existing = previousItems.find(
            (i) => i.productId === product.id && (i.variantId ?? null) === variantId
          );
          const optimisticItem = productToCartItem(
            product,
            (existing?.quantity ?? 0) + qty,
            variant
          );
          const optimisticItems = existing
            ? previousItems.map((i) =>
                i.productId === product.id && (i.variantId ?? null) === variantId ? optimisticItem : i
              )
            : [...previousItems, optimisticItem];
          set({ items: optimisticItems });

          await api.post('/carts/add', payload);
          await get().fetchCart();
          set({ isLoading: false });
          toast.success(`${product.name || 'Product'} added to cart!`);
        } catch (error: any) {
          console.error('Add to cart error:', error);
          set({ items: previousItems });
          const errorMessage = error.response?.data?.message || 'Failed to add item to cart';
          set({ error: errorMessage, isLoading: false });
          toast.error(errorMessage);
          throw error;
        }
      },

      removeItem: async (productId: number, variantId?: number | null) => {
        if (!productId) return;
        
        set({ isLoading: true, error: null });
        try {
          await api.delete(`/carts/item/${productId}`, {
            data: variantId !== undefined && variantId !== null ? { variantId } : undefined,
          });
          await get().fetchCart();
          set({ isLoading: false });
          toast.success('Item removed from cart');
        } catch (error: any) {
          console.error('Remove item error:', error);
          const errorMessage = error.response?.data?.message || 'Failed to remove item';
          set({ error: errorMessage, isLoading: false });
          toast.error(errorMessage);
          throw error;
        }
      },

      updateQuantity: async (productId: number, quantity: number, variantId?: number | null) => {
        if (!productId) return;
        
        set({ isLoading: true, error: null });
        try {
          if (quantity < 1) {
            await get().removeItem(productId, variantId);
            return;
          }

          await api.patch('/carts/update', { productId, quantity, variantId });
          await get().fetchCart();
          set({ isLoading: false });
        } catch (error: any) {
          console.error('Update quantity error:', error);
          const errorMessage = error.response?.data?.message || 'Failed to update quantity';
          set({ error: errorMessage, isLoading: false });
          toast.error(errorMessage);
          throw error;
        }
      },

      clearCart: async () => {
        set({ isLoading: true, error: null });
        try {
          await api.delete('/carts/clear');
          set({ items: [], isLoading: false });
          toast.success('Cart cleared');
        } catch (error: any) {
          console.error('Clear cart error:', error);
          const errorMessage = error.response?.data?.message || 'Failed to clear cart';
          set({ error: errorMessage, isLoading: false });
          toast.error(errorMessage);
          throw error;
        }
      },

      mergeGuestCart: async (guestItems: CartItem[]) => {
        if (!guestItems || guestItems.length === 0) return;
        
        set({ isLoading: true, error: null });
        try {
            // Validate guest items against product stock to avoid backend 400 errors
            const uniqueIds = Array.from(new Set(guestItems.map((i) => i.productId)));
            const products = await Promise.all(
              uniqueIds.map((id) =>
                api
                  .get(`/products/${id}`)
                  .then((res) => res?.data?.data ?? res?.data)
                  .catch(() => null),
              ),
            );

            const stockMap = new Map<number, any>();
            products.forEach((p) => {
              if (p && p.id) stockMap.set(p.id, p);
            });

            // Fetch current user cart to account for existing quantities
            const existingCartResp = await api.get('/carts');
            const existingCart = existingCartResp?.data?.data ?? existingCartResp?.data ?? {};
            const existingItems = Array.isArray(existingCart.items) ? existingCart.items : [];

            const existingQtyMap = new Map<string, number>();
            for (const ei of existingItems) {
              const key = `${ei.productId}-${ei.variantId ?? 'null'}`;
              existingQtyMap.set(key, (existingQtyMap.get(key) ?? 0) + (ei.quantity ?? 0));
            }

            const adjusted = guestItems
              .map((it) => {
                const prod = stockMap.get(it.productId);
                const available = prod?.stock ?? it.stock ?? 0;
                const existingQty = existingQtyMap.get(`${it.productId}-${it.variantId ?? 'null'}`) ?? 0;
                const allowed = Math.max(0, Number(available) - existingQty);
                const qty = Math.min(it.quantity || 0, allowed);
                return { ...it, quantity: qty };
              })
              .filter((it) => it.quantity > 0);

            const reduced = guestItems.filter((g) => {
              const adj = adjusted.find((a) => a.productId === g.productId && (a.variantId ?? null) === (g.variantId ?? null));
              return !adj || adj.quantity < g.quantity;
            });

            if (adjusted.length === 0) {
              toast.error('No guest cart items are available to merge (out of stock)');
              set({ isLoading: false });
              return;
            }

            if (reduced.length > 0) {
              toast('Some items were adjusted due to stock limits', { icon: '⚠️' });
            }

            await api.post('/carts/merge', { items: adjusted });
          await get().fetchCart();
          set({ isLoading: false });
        } catch (error: any) {
          console.error('Merge cart error:', error);
          const errorMessage = error.response?.data?.message || 'Failed to merge cart';
          set({ error: errorMessage, isLoading: false });
          toast.error(errorMessage);
          return;
        }
      },

      applyCoupon: async (code: string) => {
        if (!code) {
          toast.error('Please enter a coupon code');
          return;
        }
        
        set({ isLoading: true, error: null });
        try {
          await api.post('/carts/apply-coupon', { code });
          await get().fetchCart();
          set({ isLoading: false });
          toast.success('Coupon applied successfully');
        } catch (error: any) {
          console.error('Apply coupon error:', error);
          const errorMessage = error.response?.data?.message || 'Invalid coupon';
          set({ error: errorMessage, isLoading: false });
          toast.error(errorMessage);
          throw error;
        }
      },

      removeCoupon: async () => {
        set({ isLoading: true, error: null });
        try {
          await api.delete('/carts/remove-coupon');
          await get().fetchCart();
          set({ isLoading: false });
          toast.success('Coupon removed');
        } catch (error: any) {
          console.error('Remove coupon error:', error);
          const errorMessage = error.response?.data?.message || 'Failed to remove coupon';
          set({ error: errorMessage, isLoading: false });
          toast.error(errorMessage);
          throw error;
        }
      },
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({ items: state.items || [] }),
      onRehydrateStorage: () => (state) => {
        if (state?.items?.length) {
          state.items = normalizeCartItems(state.items);
        }
      },
    }
  )
);

// Computed values with safe defaults
export const useCart = () => {
  const { items } = useCartStore();
  
  // Safe array access
  const safeItems = Array.isArray(items) ? items : [];
  
  const totalItems = safeItems.reduce((sum, item) => sum + (item?.quantity || 0), 0);
  const subtotal = safeItems.reduce((sum, item) => sum + ((item?.price || 0) * (item?.quantity || 0)), 0);
  const shipping = subtotal > 50 ? 0 : 2.5;
  const total = subtotal + shipping;

  return { totalItems, subtotal, shipping, total };
};