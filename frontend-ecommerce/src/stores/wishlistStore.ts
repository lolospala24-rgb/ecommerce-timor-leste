import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';
import { unwrapApiData } from '@/lib/product';
import toast from 'react-hot-toast';

interface WishlistItem {
  id: number;
  name: string;
  slug: string;
  price: number;
  comparePrice?: number | null;
  thumbnail: string | null;
  stock?: number;
  isActive?: boolean;
}

interface WishlistState {
  items: WishlistItem[];
  isLoading: boolean;
  error: string | null;
  fetchWishlist: () => Promise<void>;
  addItem: (product: any) => Promise<void>;
  removeItem: (productId: number) => Promise<void>;
  toggleItem: (product: any) => Promise<void>;
  isInWishlist: (productId: number) => boolean;
  clearWishlist: () => Promise<void>;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,
      error: null,

      fetchWishlist: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.get('/wishlist');
          const wishlist = unwrapApiData<{ items: WishlistItem[] }>(response?.data);
          set({ items: wishlist?.items || [], isLoading: false });
        } catch (error: any) {
          console.warn('Fetch wishlist error:', error.message);
          set({ isLoading: false });
        }
      },

      addItem: async (product: any) => {
        if (!product || !product.id) {
          toast.error('Invalid product');
          return;
        }

        if (get().isInWishlist(product.id)) {
          toast('Already in wishlist', { icon: 'ℹ️' });
          return;
        }

        set({ isLoading: true, error: null });
        try {
          await api.post('/wishlist', { productId: product.id });

          const wishlistItem = {
            id: product.id,
            name: product.name,
            slug: product.slug,
            price: product.price,
            comparePrice: product.comparePrice ?? null,
            thumbnail: product.thumbnail || null,
            stock: product.stock,
            isActive: product.isActive,
          };

          set((state) => ({
            items: [...state.items, wishlistItem],
            isLoading: false
          }));
          toast.success('Added to wishlist');
        } catch (error: any) {
          console.error('Add to wishlist error:', error);
          set({ isLoading: false, error: error.message || 'Failed to add to wishlist' });
          toast.error('Failed to add to wishlist. Please try again.');
        }
      },

      removeItem: async (productId: number) => {
        if (!productId) return;

        set({ isLoading: true, error: null });
        try {
          await api.delete(`/wishlist?productId=${productId}`);
          set((state) => ({
            items: state.items.filter(item => item.id !== productId),
            isLoading: false
          }));
          toast.success('Removed from wishlist');
        } catch (error: any) {
          console.error('Remove from wishlist error:', error);
          set({ isLoading: false, error: error.message || 'Failed to remove from wishlist' });
          toast.error('Failed to remove from wishlist. Please try again.');
        }
      },

      toggleItem: async (product: any) => {
        if (!product || !product.id) {
          toast.error('Invalid product');
          return;
        }
        
        const { isInWishlist, addItem, removeItem } = get();
        if (isInWishlist(product.id)) {
          await removeItem(product.id);
        } else {
          await addItem(product);
        }
      },

      isInWishlist: (productId: number) => {
        return get().items.some(item => item.id === productId);
      },

      clearWishlist: async () => {
        set({ isLoading: true, error: null });
        try {
          await api.delete('/wishlist/clear');
          set({ items: [], isLoading: false });
          toast.success('Wishlist cleared');
        } catch (error: any) {
          console.error('Clear wishlist error:', error);
          set({ isLoading: false, error: error.message || 'Failed to clear wishlist' });
          toast.error('Failed to clear wishlist. Please try again.');
        }
      },
    }),
    {
      name: 'wishlist-storage',
      partialize: (state) => ({ items: state.items }),
    }
  )
);