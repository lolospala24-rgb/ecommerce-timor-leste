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
          const { access_token, refresh_token, user } = data;
          
          if (access_token) {
            Cookies.set('access_token', access_token, { 
              expires: 1, // 1 day
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
            });
          }
          
          if (refresh_token) {
            Cookies.set('refresh_token', refresh_token, { 
              expires: 7, // 7 days
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
            });
          }
          
          set({ 
            user: user || data.user, 
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
          const token = Cookies.get('access_token');
          if (token) {
            await api.post('/auth/logout', {}, {
              headers: { Authorization: `Bearer ${token}` }
            });
          }
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          Cookies.remove('access_token');
          Cookies.remove('refresh_token');
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      checkAuth: async () => {
        const token = Cookies.get('access_token');
        
        if (!token) {
          set({ isAuthenticated: false, user: null });
          return;
        }

        set({ isLoading: true });
        try {
          const response = await api.get('/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          const data = response.data || response;
          const userData = data.data || data;
          
          set({ 
            user: userData, 
            isAuthenticated: true, 
            isLoading: false 
          });
        } catch (error: any) {
          console.error('Check auth error:', error);
          // Token invalid or expired
          Cookies.remove('access_token');
          Cookies.remove('refresh_token');
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