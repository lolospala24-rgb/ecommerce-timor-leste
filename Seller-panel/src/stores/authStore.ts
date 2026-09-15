import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';
import api from '@/lib/api';

export interface SellerUser {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  role: 'ADMIN' | 'SELLER' | 'CUSTOMER';
  avatar?: string | null;
  createdAt: string;
  seller?: {
    id: number;
    storeName: string;
    isVerified: boolean;
    storeLogo?: string | null;
  } | null;
}

interface AuthState {
  user: SellerUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: SellerUser) => void;
  clearError: () => void;
}

// Same non-httpOnly marker-cookie pattern used by admin-panel — read only by
// middleware.ts for a fast pre-render redirect. Never the real security
// boundary; the backend's RolesGuard is what actually enforces SELLER-only
// access on every API call using the real httpOnly token.
const SESSION_ROLE_COOKIE = 'session_role';

function setRoleCookie(role: string) {
  Cookies.set(SESSION_ROLE_COOKIE, role, {
    expires: 1,
    secure: process.env.NEXT_PUBLIC_COOKIE_SECURE !== 'false',
    sameSite: 'lax',
  });
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response: any = await api.post('/auth/login', { email, password });
          const data = response.data || response;
          const user = data.user as SellerUser;

          // This is a seller-only application — a customer or admin
          // account can authenticate against the shared backend but has
          // no business landing in this dashboard.
          if (user?.role !== 'SELLER') {
            set({ isLoading: false, error: 'This dashboard is for sellers only.' });
            throw new Error('NOT_A_SELLER');
          }

          setRoleCookie(user.role);
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error: any) {
          if (error?.message !== 'NOT_A_SELLER') {
            set({
              error: error.response?.data?.message || 'Login failed',
              isLoading: false,
            });
          }
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await api.post('/auth/logout');
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          Cookies.remove(SESSION_ROLE_COOKIE);
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      checkAuth: async () => {
        set({ isLoading: true });
        try {
          const response: any = await api.get('/auth/me');
          const data = response.data || response;
          const userData = (data.data || data) as SellerUser;

          if (userData?.role !== 'SELLER') {
            Cookies.remove(SESSION_ROLE_COOKIE);
            set({ user: null, isAuthenticated: false, isLoading: false });
            return;
          }

          setRoleCookie(userData.role);
          set({ user: userData, isAuthenticated: true, isLoading: false });
        } catch (error: any) {
          if (error?.response?.status !== 401) {
            console.error('Check auth error:', error);
          }
          Cookies.remove(SESSION_ROLE_COOKIE);
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      setUser: (user: SellerUser) => set({ user }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'seller-auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
);
