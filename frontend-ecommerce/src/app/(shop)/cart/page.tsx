'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, ShoppingCart, ArrowRight, X, Plus, Minus, Truck, Shield, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCartItemKey } from '@/lib/cart';

export default function CartPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { items, isLoading, removeItem, updateQuantity, clearCart, fetchCart } = useCartStore();
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch cart when component mounts
  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    }
  }, [isAuthenticated, fetchCart]);

  const handleQuantityChange = async (
    productId: number,
    quantity: number,
    variantId?: number | null,
  ) => {
    if (quantity < 1) {
      await handleRemoveItem(productId, variantId);
      return;
    }
    setIsUpdating(true);
    try {
      await updateQuantity(productId, quantity, variantId);
    } catch (error) {
      // Error already handled in store
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveItem = async (productId: number, variantId?: number | null) => {
    setIsUpdating(true);
    try {
      await removeItem(productId, variantId);
      toast.success('Item removed from cart');
    } catch (error) {
      // Error already handled in store
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClearCart = async () => {
    if (items.length === 0) return;
    if (confirm('Are you sure you want to clear your cart?')) {
      await clearCart();
      toast.success('Cart cleared');
    }
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      toast.error('Please login to checkout');
      router.push('/login?redirect=/checkout');
      return;
    }
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    router.push('/checkout');
  };

  // Safe values with defaults
  const safeItems = Array.isArray(items) ? items : [];
  const safeSubtotal = safeItems.reduce((sum, item) => sum + (item?.price || 0) * (item?.quantity || 0), 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Shopping Cart</h1>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (safeItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-6 mb-4">
          <ShoppingCart className="h-12 w-12 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold">Your Cart is Empty</h2>
        <p className="text-muted-foreground mt-2 max-w-md">
          Looks like you haven't added any items to your cart yet.
          Start shopping to fill it up!
        </p>
        <Button className="mt-6" asChild>
          <Link href="/products">Continue Shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Shopping Cart</h1>
        <Button variant="ghost" size="sm" onClick={handleClearCart}>
          <Trash2 className="mr-2 h-4 w-4" />
          Clear Cart
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {safeItems.map((item) => (
            <CartItem
              key={getCartItemKey(item)}
              item={item}
              onQuantityChange={handleQuantityChange}
              onRemove={handleRemoveItem}
              isUpdating={isUpdating}
            />
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">${safeSubtotal.toFixed(2)}</span>
                </div>
                <Separator />
                <p className="text-xs text-muted-foreground">
                  Shipping, tax, and any service fee are calculated at checkout based on your delivery address.
                </p>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckout}
                disabled={safeItems.length === 0}
              >
                <ArrowRight className="mr-2 h-4 w-4" />
                Proceed to Checkout
              </Button>

              {/* Trust Badges */}
              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span>Secure Checkout</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Truck className="h-4 w-4" />
                  <span>Free shipping on orders over $50</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CreditCard className="h-4 w-4" />
                  <span>Multiple payment methods</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Cart Item Component with safe data access
function CartItem({ item, onQuantityChange, onRemove, isUpdating }: any) {
  // Safe access with defaults
  const productId = item?.productId || 0;
  const variantId = item?.variantId ?? null;
  const name = item?.name || 'Product';
  const nameTetum = item?.nameTetum || null;
  const slug = item?.slug || '#';
  const price = typeof item?.price === 'number' ? item.price : 0;
  const comparePrice = typeof item?.comparePrice === 'number' ? item.comparePrice : null;
  const thumbnail = item?.thumbnail || null;
  const quantity = typeof item?.quantity === 'number' ? item.quantity : 1;
  const stock = typeof item?.stock === 'number' ? item.stock : 0;

  const discount = comparePrice ? Math.round(((comparePrice - price) / comparePrice) * 100) : 0;
  const itemTotal = price * quantity;

  return (
    <div className="flex gap-4 rounded-lg border p-4 transition-all hover:shadow-sm">
      {/* Product Image */}
      <Link
        href={`/products/${slug}`}
        className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md bg-gray-100"
      >
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={name}
            fill
            className="object-cover"
            sizes="96px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-400">
            <ShoppingCart className="h-8 w-8" />
          </div>
        )}
        {discount > 0 && (
          <span className="absolute top-1 left-1 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            -{discount}%
          </span>
        )}
      </Link>

      {/* Product Details */}
      <div className="flex-1 min-w-0">
        <Link href={`/products/${slug}`} className="hover:text-primary">
          <h3 className="font-medium line-clamp-1">{name}</h3>
        </Link>
        {nameTetum && (
          <p className="text-sm text-muted-foreground line-clamp-1">{nameTetum}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="font-semibold text-primary">${price.toFixed(2)}</span>
          {comparePrice && comparePrice > price && (
            <span className="text-sm text-muted-foreground line-through">
              ${comparePrice.toFixed(2)}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Stock: {stock} units available
        </p>
      </div>

      {/* Quantity & Actions */}
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onQuantityChange(productId, quantity - 1, variantId)}
            disabled={quantity <= 1 || isUpdating}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-8 text-center text-sm font-medium">{quantity}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onQuantityChange(productId, quantity + 1, variantId)}
            disabled={quantity >= stock || isUpdating}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            ${itemTotal.toFixed(2)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(productId, variantId)}
            disabled={isUpdating}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}