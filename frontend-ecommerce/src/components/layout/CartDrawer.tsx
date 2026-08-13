'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShoppingCart, Trash2, Plus, Minus, X, ArrowRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCartItemKey } from '@/lib/cart';

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const { items, isLoading, removeItem, updateQuantity, clearCart, fetchCart } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch cart when drawer opens
  useEffect(() => {
    if (open && isAuthenticated) {
      fetchCart();
    }
  }, [open, isAuthenticated, fetchCart]);

  // Check if cart has items
  const hasItems = items && items.length > 0;

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
    if (!hasItems) return;
    if (confirm('Are you sure you want to clear your cart?')) {
      await clearCart();
      toast.success('Cart cleared');
    }
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      toast.error('Please login to checkout');
      onOpenChange(false);
      return;
    }
    if (!hasItems) {
      toast.error('Your cart is empty');
      return;
    }
    onOpenChange(false);
    window.location.href = '/checkout';
  };

  // Safe values with fallbacks
  const safeTotalItems = items.reduce((sum, item) => sum + (item?.quantity || 0), 0);
  const safeSubtotal = items.reduce((sum, item) => sum + (item?.price || 0) * (item?.quantity || 0), 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col w-full max-w-md">
        <SheetHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Your Cart
              {safeTotalItems > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({safeTotalItems} item{safeTotalItems !== 1 ? 's' : ''})
                </span>
              )}
            </SheetTitle>
            {hasItems && (
              <Button variant="ghost" size="sm" onClick={handleClearCart} disabled={isLoading}>
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-sm text-muted-foreground">Loading cart...</p>
          </div>
        ) : !hasItems ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <ShoppingCart className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">Your cart is empty</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Looks like you haven't added any items yet.
            </p>
            <Button className="mt-4" asChild>
              <Link href="/products" onClick={() => onOpenChange(false)}>
                Start Shopping
              </Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <ScrollArea className="flex-1 pr-4 -mr-4">
              <div className="space-y-4 py-4">
                {items.map((item) => {
                  // Safe access with default values for each item
                  const productId = item?.productId || 0;
                  const variantId = item?.variantId ?? null;
                  const name = item?.name || 'Product';
                  const price = typeof item?.price === 'number' ? item.price : 0;
                  const quantity = typeof item?.quantity === 'number' ? item.quantity : 0;
                  const thumbnail = item?.thumbnail || null;
                  const slug = item?.slug || '#';
                  const stock = typeof item?.stock === 'number' ? item.stock : 0;
                  const comparePrice = typeof item?.comparePrice === 'number' ? item.comparePrice : null;

                  // Calculate item total
                  const itemTotal = price * quantity;

                  return (
                    <div key={getCartItemKey(item)} className="flex gap-3">
                      <Link
                        href={`/products/${slug}`}
                        className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-slate-100"
                        onClick={() => onOpenChange(false)}
                      >
                        {thumbnail ? (
                          <Image
                            src={thumbnail}
                            alt={name}
                            fill
                            className="object-cover"
                            sizes="64px"
                            onError={(e) => {
                              // Fallback on image error
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-400">
                            <ShoppingCart className="h-6 w-6" />
                          </div>
                        )}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <Link
                            href={`/products/${slug}`}
                            className="hover:text-primary"
                            onClick={() => onOpenChange(false)}
                          >
                            <h4 className="font-medium text-sm line-clamp-1">{name}</h4>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveItem(productId, variantId)}
                            disabled={isUpdating}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-primary font-semibold">
                            ${price.toFixed(2)}
                          </span>
                          {comparePrice && comparePrice > price && (
                            <span className="text-xs text-muted-foreground line-through">
                              ${comparePrice.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleQuantityChange(productId, quantity - 1, variantId)}
                            disabled={quantity <= 1 || isUpdating}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center text-xs font-medium">
                            {quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleQuantityChange(productId, quantity + 1, variantId)}
                            disabled={quantity >= stock || isUpdating}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Summary */}
            <div className="border-t pt-4 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-muted-foreground font-normal">Subtotal</span>
                  <span>${safeSubtotal.toFixed(2)}</span>
                </div>
                <Separator />
                <p className="text-xs text-muted-foreground">
                  Shipping and tax are calculated at checkout.
                </p>
              </div>

              <SheetFooter className="flex flex-col gap-2">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleCheckout}
                  disabled={!hasItems || isLoading}
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Proceed to Checkout
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  asChild
                >
                  <Link href="/cart" onClick={() => onOpenChange(false)}>
                    View Full Cart
                  </Link>
                </Button>
              </SheetFooter>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}