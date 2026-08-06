import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface WishlistItem {
  id: number;
  name: string;
  slug: string;
  price: number;
  thumbnail: string | null;
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
          const items = response?.data?.items || [];
          set({ items, isLoading: false });
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
          toast.info('Already in wishlist');
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
            thumbnail: product.thumbnail || null,
          };
          
          set((state) => ({ 
            items: [...state.items, wishlistItem], 
            isLoading: false 
          }));
          toast.success('Added to wishlist');
        } catch (error: any) {
          console.error('Add to wishlist error:', error);
          // Still add locally even if API fails
          const wishlistItem = {
            id: product.id,
            name: product.name,
            slug: product.slug,
            price: product.price,
            thumbnail: product.thumbnail || null,
          };
          set((state) => ({ 
            items: [...state.items, wishlistItem], 
            isLoading: false 
          }));
          toast.success('Added to wishlist');
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
          set((state) => ({ 
            items: state.items.filter(item => item.id !== productId), 
            isLoading: false 
          }));
          toast.success('Removed from wishlist');
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
          set({ items: [], isLoading: false });
          toast.success('Wishlist cleared');
        }
      },
    }),
    {
      name: 'wishlist-storage',
      partialize: (state) => ({ items: state.items }),
    }
  )
);