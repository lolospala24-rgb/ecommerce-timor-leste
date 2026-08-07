import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';
import api from '@/lib/api';

interface User {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  role: 'ADMIN' | 'SELLER' | 'CUSTOMER';
  avatar?: string;
  createdAt: string;
  seller?: {
    id: number;
    storeName: string;
    isVerified: boolean;
  };
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User) => void;
  clearError: () => void;
}

// Non-httpOnly marker cookie read by middleware.ts for a fast, pre-render
// redirect on protected/admin routes. It carries only a role string, never
// the JWT — the real auth token is an httpOnly cookie this code can't see
// and doesn't need to. Anyone could forge this cookie in devtools, but that
// only lets them see the dashboard shell; every API call still needs the
// real httpOnly token, which the backend's RolesGuard verifies server-side.
const SESSION_ROLE_COOKIE = 'session_role';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/auth/login', { email, password });

          // Handle different response formats
          const data = response.data || response;
          const user = data.user;

          if (user?.role) {
            Cookies.set(SESSION_ROLE_COOKIE, user.role, {
              expires: 1,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
            });
          }

          set({
            user,
            isAuthenticated: true,
            isLoading: false
          });
        } catch (error: any) {
          console.error('Login error:', error);
          set({
            error: error.response?.data?.message || 'Login failed',
            isLoading: false
          });
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
        // The access token is an httpOnly cookie now, invisible to this
        // code — the only way to know if a session exists is to ask the
        // backend, which reads the cookie itself.
        set({ isLoading: true });
        try {
          const response = await api.get('/auth/me');

          const data = response.data || response;
          const userData = data.data || data;

          if (userData?.role) {
            Cookies.set(SESSION_ROLE_COOKIE, userData.role, {
              expires: 1,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
            });
          }

          set({
            user: userData,
            isAuthenticated: true,
            isLoading: false
          });
        } catch (error: any) {
          console.error('Check auth error:', error);
          Cookies.remove(SESSION_ROLE_COOKIE);
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false
          });
        }
      },

      setUser: (user: User) => set({ user }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);