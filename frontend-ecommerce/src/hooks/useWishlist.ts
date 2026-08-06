'use client';

import { useWishlistStore } from '@/stores/wishlistStore';
import { useAuthStore } from '@/stores/authStore';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

export const useWishlist = () => {
  const {
    items,
    isLoading,
    addItem,
    removeItem,
    toggleItem,
    isInWishlist,
    clearWishlist,
    fetchWishlist,
  } = useWishlistStore();

  const { isAuthenticated } = useAuthStore();

  // Fetch wishlist when user logs in
  useEffect(() => {
    if (isAuthenticated) {
      fetchWishlist();
    }
  }, [isAuthenticated, fetchWishlist]);

  const toggleWishlist = async (product: any) => {
    if (!isAuthenticated) {
      toast.error('Please login to add to wishlist');
      return;
    }
    await toggleItem(product);
  };

  return {
    items,
    totalItems: items.length,
    isLoading,
    addItem,
    removeItem,
    toggleWishlist,
    isInWishlist,
    clearWishlist,
    fetchWishlist,
    isWishlistEmpty: items.length === 0,
  };
};