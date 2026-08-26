'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { useCouponStore } from '@/stores/couponStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { Trash2, ShoppingCart, ArrowRight, X, Plus, Minus, Truck, Shield, CreditCard, TicketPercent, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { getCartItemKey } from '@/lib/cart';
import { useShippingSettings } from '@/hooks/useShippingSettings';
import { useValidateCoupon, useAvailableCoupons, type AvailableCoupon } from '@/hooks/useCoupons';

export default function CartPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { items, isLoading, error, removeItem, updateQuantity, clearCart, fetchCart } = useCartStore();
  const { data: shippingSettings } = useShippingSettings();
  const { appliedCoupon, setAppliedCoupon, clearCoupon } = useCouponStore();
  const validateCoupon = useValidateCoupon();
  const [isUpdating, setIsUpdating] = useState(false);
  const [couponInput, setCouponInput] = useState('');

  // Fetch cart when component mounts
  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    }
  }, [isAuthenticated, fetchCart]);

  // An emptied cart can no longer have a coupon meaningfully "applied" —
  // drop it rather than carrying a stale discount into whatever the
  // customer adds next.
  useEffect(() => {
    if (!isLoading && items.length === 0 && appliedCoupon) {
      clearCoupon();
    }
  }, [isLoading, items.length, appliedCoupon, clearCoupon]);

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

  const handleApplyCoupon = async (codeOverride?: string) => {
    const code = (codeOverride ?? couponInput).trim();
    if (!code) {
      toast.error('Please enter a coupon code');
      return;
    }
    try {
      const result = await validateCoupon.mutateAsync({ code, subtotal: safeSubtotal });
      setAppliedCoupon({
        code: result.code,
        discountType: result.discountType,
        discountValue: result.discountValue,
        discountAmount: result.discountAmount,
      });
      setCouponInput('');
      toast.success(`Coupon "${result.code}" applied`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Invalid coupon code');
    }
  };

  const handleRemoveCoupon = () => {
    clearCoupon();
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

  const freeShippingEnabled = !!shippingSettings?.enableFreeShipping;
  const freeShippingThreshold = shippingSettings?.freeShippingThreshold ?? 0;
  const qualifiesForFreeShipping =
    freeShippingEnabled && freeShippingThreshold > 0 && safeSubtotal >= freeShippingThreshold;
  const amountToFreeShipping = freeShippingThreshold - safeSubtotal;

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

  if (safeItems.length === 0 && error) {
    return (
      <EmptyState
        title="Couldn't load your cart"
        description={error}
        icon={<AlertCircle className="h-10 w-10 text-muted-foreground" />}
        action={{ label: 'Try again', onClick: () => fetchCart() }}
      />
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
                {appliedCoupon && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Coupon ({appliedCoupon.code})</span>
                    <span>-${appliedCoupon.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <p className="text-xs text-muted-foreground">
                  Shipping, tax, and any service fee are calculated at checkout based on your delivery address.
                </p>
              </div>

              {/* Coupon — validated against the real backend on Apply;
                  final discount is re-validated again at order placement,
                  this is only a preview. */}
              <div className="space-y-2">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                    <div className="flex items-center gap-2 text-sm">
                      <TicketPercent className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-700">{appliedCoupon.code}</span>
                      <span className="text-xs text-green-600">
                        {appliedCoupon.discountType === 'PERCENTAGE'
                          ? `-${appliedCoupon.discountValue}%`
                          : `-$${appliedCoupon.discountValue.toFixed(2)}`}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                      onClick={handleRemoveCoupon}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Coupon code"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      disabled={validateCoupon.isPending}
                      className="h-9 flex-1 font-mono text-sm uppercase"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleApplyCoupon()}
                      disabled={validateCoupon.isPending}
                      className="h-9"
                    >
                      {validateCoupon.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                    </Button>
                  </div>
                )}

                {!appliedCoupon && (
                  <AvailableCouponsList
                    subtotal={safeSubtotal}
                    onUse={(code) => handleApplyCoupon(code)}
                    isApplying={validateCoupon.isPending}
                  />
                )}
              </div>

              {/* Free shipping progress — only shown when the promotion is
                  actually enabled, using the real admin-configured
                  threshold rather than a guessed number. */}
              {freeShippingEnabled && freeShippingThreshold > 0 && !qualifiesForFreeShipping && safeSubtotal > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Add ${amountToFreeShipping.toFixed(2)} more for free shipping</span>
                    <span>{Math.round((safeSubtotal / freeShippingThreshold) * 100)}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.min((safeSubtotal / freeShippingThreshold) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}

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
                {freeShippingEnabled && freeShippingThreshold > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Truck className="h-4 w-4" />
                    <span>
                      {qualifiesForFreeShipping
                        ? 'You qualify for free shipping'
                        : `Free shipping on orders over $${freeShippingThreshold.toFixed(2)}`}
                    </span>
                  </div>
                )}
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

// Coupons a customer could plausibly use, so they aren't limited to
// blindly typing a code they'd have to already know from somewhere else
// (an email, a social post) — matches the "browse available vouchers"
// pattern of Shopee/Tokopedia. Coupons the cart hasn't reached the minimum
// purchase for yet are shown, not hidden, with a clear "spend $X more" so
// the customer knows they exist and how to unlock them.
function AvailableCouponsList({
  subtotal,
  onUse,
  isApplying,
}: {
  subtotal: number;
  onUse: (code: string) => void;
  isApplying: boolean;
}) {
  const { data: coupons, isLoading } = useAvailableCoupons(subtotal);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
    );
  }

  if (!coupons || coupons.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Available Coupons
      </p>
      <div className="max-h-56 space-y-2 overflow-y-auto pr-0.5">
        {coupons.map((coupon: AvailableCoupon) => (
          <div
            key={coupon.code}
            className={cn(
              'flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors',
              coupon.meetsMinimum
                ? 'border-primary/20 bg-primary/5'
                : 'border-dashed bg-muted/30',
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                  coupon.meetsMinimum ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                )}
              >
                <TicketPercent className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-sm font-semibold">{coupon.code}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {coupon.discountType === 'PERCENTAGE'
                    ? `${coupon.discountValue}% off`
                    : `$${coupon.discountValue.toFixed(2)} off`}
                  {coupon.maxDiscountAmount ? ` (up to $${coupon.maxDiscountAmount.toFixed(2)})` : ''}
                </p>
                {!coupon.meetsMinimum && coupon.minPurchaseAmount != null && (
                  <p className="text-xs font-medium text-amber-600">
                    Spend ${(coupon.minPurchaseAmount - subtotal).toFixed(2)} more to unlock
                  </p>
                )}
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant={coupon.meetsMinimum ? 'default' : 'outline'}
              disabled={!coupon.meetsMinimum || isApplying}
              onClick={() => onUse(coupon.code)}
              className="h-8 shrink-0 px-3 text-xs"
            >
              Use
            </Button>
          </div>
        ))}
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
        className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md bg-slate-100"
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
          <div className="flex h-full w-full items-center justify-center text-slate-400">
            <ShoppingCart className="h-8 w-8" />
          </div>
        )}
        {discount > 0 && (
          <span className="absolute top-1 left-1 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
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
            aria-label="Decrease quantity"
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
            aria-label="Increase quantity"
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
            aria-label="Remove item"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}