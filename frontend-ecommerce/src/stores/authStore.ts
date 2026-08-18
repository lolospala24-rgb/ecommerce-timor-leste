import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';

interface User {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  role: 'ADMIN' | 'SELLER' | 'CUSTOMER';
  avatar?: string;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User) => void;
  clearError: () => void;
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
          const response = await api.post('/auth/login', { email, password });
          // Tokens are set by the backend as httpOnly cookies — nothing to
          // store client-side beyond the user object for UI state.
          const { user } = response.data;
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Login failed', isLoading: false });
          throw error;
        }
      },

      loginWithGoogle: async (idToken: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/auth/google', { idToken });
          const { user } = response.data;
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Google sign-in failed', isLoading: false });
          throw error;
        }
      },

      register: async (data: any) => {
        set({ isLoading: true, error: null });
        try {
          await api.post('/auth/register', data);
          set({ isLoading: false });
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Registration failed', isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await api.post('/auth/logout');
        } catch {
          // Ignore logout errors — the backend clears the cookies either way
        } finally {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      checkAuth: async () => {
        // The access token is an httpOnly cookie now, invisible to this
        // code — the only way to know if a session exists is to ask the
        // backend, which reads the cookie itself.
        try {
          const response = await api.get('/auth/me');
          set({ user: response.data, isAuthenticated: true });
        } catch {
          set({ user: null, isAuthenticated: false });
        }
      },

      setUser: (user: User) => set({ user }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);