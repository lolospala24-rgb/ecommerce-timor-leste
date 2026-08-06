'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowRight, Truck, Shield, CreditCard, Loader2, Gift } from 'lucide-react';

interface CartSummaryProps {
  subtotal: number;
  shipping: number;
  total: number;
  itemCount: number;
  onApplyCoupon?: (code: string) => Promise<void>;
  onCheckout: () => void;
  isLoading?: boolean;
  couponApplied?: {
    code: string;
    discount: number;
    type: 'percentage' | 'fixed';
    value: number;
  } | null;
  freeShippingThreshold?: number;
}

export function CartSummary({
  subtotal,
  shipping,
  total,
  itemCount,
  onApplyCoupon,
  onCheckout,
  isLoading = false,
  couponApplied = null,
  freeShippingThreshold = 50,
}: CartSummaryProps) {
  const router = useRouter();
  const [couponCode, setCouponCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [couponError, setCouponError] = useState('');

  const isFreeShipping = freeShippingThreshold > 0 && subtotal >= freeShippingThreshold;
  const actualShipping = isFreeShipping ? 0 : shipping;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }
    if (!onApplyCoupon) return;

    setIsApplying(true);
    setCouponError('');
    try {
      await onApplyCoupon(couponCode);
      setCouponCode('');
    } catch (error: any) {
      setCouponError(error.message || 'Invalid coupon code');
    } finally {
      setIsApplying(false);
    }
  };

  const handleRemoveCoupon = () => {
    // This would call a remove coupon function
    // For now, just refresh the page
    router.refresh();
  };

  return (
    <Card className="sticky top-20">
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Item Count */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {itemCount} item{itemCount !== 1 ? 's' : ''}
          </span>
          <span>${subtotal.toFixed(2)}</span>
        </div>

        {/* Subtotal */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>

        {/* Shipping */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Shipping</span>
          <div className="text-right">
            {isFreeShipping ? (
              <span className="text-green-600 font-medium">Free</span>
            ) : (
              <span>${shipping.toFixed(2)}</span>
            )}
          </div>
        </div>

        {/* Free Shipping Progress */}
        {freeShippingThreshold > 0 && subtotal < freeShippingThreshold && subtotal > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Add ${(freeShippingThreshold - subtotal).toFixed(2)} more for free shipping</span>
              <span>{Math.round((subtotal / freeShippingThreshold) * 100)}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min((subtotal / freeShippingThreshold) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Coupon */}
        {onApplyCoupon && (
          <div className="space-y-2">
            <Label htmlFor="coupon" className="text-xs font-medium uppercase text-muted-foreground">
              Coupon Code
            </Label>
            <div className="flex gap-2">
              <Input
                id="coupon"
                placeholder="Enter code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                disabled={!!couponApplied || isApplying}
                className="flex-1 h-9 text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleApplyCoupon}
                disabled={!!couponApplied || isApplying}
                className="h-9"
              >
                {isApplying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Apply'
                )}
              </Button>
            </div>
            {couponError && (
              <p className="text-xs text-destructive">{couponError}</p>
            )}
          </div>
        )}

        {/* Applied Coupon */}
        {couponApplied && (
          <div className="flex items-center justify-between rounded-lg bg-green-50 p-2 text-sm">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-700">{couponApplied.code}</span>
              <span className="text-xs text-green-600">
                {couponApplied.type === 'percentage' 
                  ? `-${couponApplied.value}%` 
                  : `-$${couponApplied.discount.toFixed(2)}`}
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
        )}

        <Separator />

        {/* Total */}
        <div className="flex justify-between font-medium">
          <span>Total</span>
          <span className="text-lg font-bold text-primary">
            ${total.toFixed(2)}
          </span>
        </div>

        {/* Trust Badges */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" />
            <span>Secure Checkout</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Truck className="h-3 w-3" />
            <span>Free shipping on orders over ${freeShippingThreshold}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CreditCard className="h-3 w-3" />
            <span>Multiple payment methods</span>
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          size="lg"
          onClick={onCheckout}
          disabled={isLoading || itemCount === 0}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Proceed to Checkout
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}