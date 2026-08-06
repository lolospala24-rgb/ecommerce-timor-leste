'use client';

import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { productToCartItem } from '@/lib/cart';
import { useEffect } from 'react';

export const useCart = () => {
  const {
    items,
    isLoading,
    error,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    fetchCart,
    mergeGuestCart,
    applyCoupon,
    removeCoupon,
  } = useCartStore();

  const { isAuthenticated } = useAuthStore();

  // Fetch cart when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    }
  }, [isAuthenticated, fetchCart]);

  // Merge guest cart when user logs in
  useEffect(() => {
    if (isAuthenticated) {
      const guestCart = localStorage.getItem('guest_cart');
      if (guestCart) {
        const items = JSON.parse(guestCart);
        if (items.length > 0) {
          mergeGuestCart(items);
          localStorage.removeItem('guest_cart');
        }
      }
    }
  }, [isAuthenticated, mergeGuestCart]);

  // Computed summary values (derived from items)
  const totalItems = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
  const shipping = subtotal > 50 ? 0 : 2.5;
  const total = subtotal + shipping;

  const addToCart = async (product: any, quantity: number = 1) => {
    if (!isAuthenticated) {
      // Save to local storage for guest users
      const guestCart = JSON.parse(localStorage.getItem('guest_cart') || '[]');
      const existing = guestCart.find((item: any) => item.productId === product.id);
      if (existing) {
        existing.quantity += quantity;
      } else {
        guestCart.push(productToCartItem(product, quantity));
      }
      localStorage.setItem('guest_cart', JSON.stringify(guestCart));
      return;
    }

    await addItem(product, quantity);
  };

  return {
    items,
    totalItems,
    subtotal,
    shipping,
    total,
    isLoading,
    error,
    addToCart,
    removeItem,
    updateQuantity,
    clearCart,
    fetchCart,
    applyCoupon,
    removeCoupon,
    isCartEmpty: items.length === 0,
  };
};