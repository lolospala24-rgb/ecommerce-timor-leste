'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useWishlistStore } from '@/stores/wishlistStore';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heart, ShoppingCart, Trash2, MoveRight } from 'lucide-react';
import { useCartStore } from '@/stores/cartStore';
import toast from 'react-hot-toast';

export default function WishlistPage() {
  const { isAuthenticated } = useAuthStore();
  const { items, removeItem, clearWishlist } = useWishlistStore();
  const { addItem, items: cartItems } = useCartStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleAddToCart = async (product: any) => {
    try {
      await addItem(product, 1);
      toast.success('Added to cart');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to add to cart');
    }
  };

  const handleRemove = (productId: number) => {
    removeItem(productId);
    toast.success('Removed from wishlist');
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold">Sign in to view wishlist</h2>
        <p className="text-muted-foreground mt-2">Save your favorite items</p>
        <Button className="mt-4" asChild>
          <Link href="/login?redirect=/account/wishlist">Sign In</Link>
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold">Your Wishlist is Empty</h2>
        <p className="text-muted-foreground mt-2">Save your favorite items here</p>
        <Button className="mt-4" asChild>
          <Link href="/products">Browse Products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">My Wishlist</h1>
          <p className="text-muted-foreground">{items.length} items saved</p>
        </div>
        <Button variant="destructive" size="sm" onClick={clearWishlist}>
          <Trash2 className="mr-2 h-4 w-4" />
          Clear All
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((product: any) => (
          <Card key={product.id} className="overflow-hidden group">
            <div className="relative aspect-square overflow-hidden bg-gray-100">
              <Link href={`/products/${product.slug}`}>
                <Image
                  src={product.thumbnail || '/images/placeholder.png'}
                  alt={product.name}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                />
              </Link>
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemove(product.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 space-y-2">
              <Link href={`/products/${product.slug}`} className="hover:text-primary">
                <h3 className="font-medium line-clamp-1">{product.name}</h3>
              </Link>
              <p className="text-lg font-bold text-primary">${product.price.toFixed(2)}</p>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => handleAddToCart(product)}
                disabled={
                  (cartItems?.find((it) => it.productId === product.id)?.quantity ?? 0) >= Math.min(product.stock, 99) ||
                  product.stock === 0
                }
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                Add to Cart
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}