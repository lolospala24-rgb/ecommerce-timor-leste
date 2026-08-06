'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';

export const useAuth = () => {
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    checkAuth,
    clearError,
  } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const requireAuth = (redirectTo: string = '/login') => {
    if (!isLoading && !isAuthenticated) {
      router.push(redirectTo);
      return false;
    }
    return true;
  };

  const requireGuest = (redirectTo: string = '/') => {
    if (!isLoading && isAuthenticated) {
      router.push(redirectTo);
      return false;
    }
    return true;
  };

  const requireRole = (roles: string[], redirectTo: string = '/unauthorized') => {
    if (!isLoading && isAuthenticated && user) {
      if (!roles.includes(user.role)) {
        router.push(redirectTo);
        return false;
      }
    }
    return true;
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    checkAuth,
    clearError,
    requireAuth,
    requireGuest,
    requireRole,
    isAdmin: user?.role === 'ADMIN',
    isSeller: user?.role === 'SELLER',
    isCustomer: user?.role === 'CUSTOMER',
  };
};