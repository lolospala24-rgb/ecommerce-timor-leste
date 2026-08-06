import { create } from 'zustand';

interface UIState {
  theme: 'light' | 'dark' | 'system';
  sidebarOpen: boolean;
  cartOpen: boolean;
  searchOpen: boolean;
  loading: boolean;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleSidebar: () => void;
  toggleCart: () => void;
  setCartOpen: (open: boolean) => void;
  toggleSearch: () => void;
  setLoading: (loading: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: 'system',
  sidebarOpen: false,
  cartOpen: false,
  searchOpen: false,
  loading: false,
  setTheme: (theme) => set({ theme }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleCart: () => set((state) => ({ cartOpen: !state.cartOpen })),
  setCartOpen: (open: boolean) => set({ cartOpen: open }),
  toggleSearch: () => set((state) => ({ searchOpen: !state.searchOpen })),
  setLoading: (loading) => set({ loading }),
}));