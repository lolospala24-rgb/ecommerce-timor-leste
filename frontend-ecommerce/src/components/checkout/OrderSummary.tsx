'use client';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { CheckCircle, Lock, Truck, Shield, CreditCard } from 'lucide-react';
import { getCartItemKey } from '@/lib/cart';

interface OrderSummaryProps {
  items: any[];
  subtotal: number;
  shipping: number;
  total: number;
  isSubmitting: boolean;
  hasAddress: boolean;
}

export function OrderSummary({ 
  items, 
  subtotal, 
  shipping, 
  total, 
  isSubmitting, 
  hasAddress 
}: OrderSummaryProps) {
  return (
    <Card className="sticky top-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-primary" />
          Order Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Items Preview */}
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {items.slice(0, 3).map((item: any) => (
            <div key={getCartItemKey(item)} className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{item.quantity}x</span>
              <span className="flex-1 truncate">{item.name}</span>
              <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          {items.length > 3 && (
            <p className="text-sm text-muted-foreground">
              +{items.length - 3} more items
            </p>
          )}
        </div>

        <Separator />

        {/* Totals */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Shipping</span>
            <span>${shipping.toFixed(2)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-medium">
            <span>Total</span>
            <span className="text-lg font-bold text-primary">${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span>Secure payment</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Truck className="h-3 w-3" />
            <span>Free shipping on orders over $50</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" />
            <span>100% buyer protection</span>
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <Button 
          type="submit" 
          className="w-full" 
          size="lg"
          disabled={isSubmitting || !hasAddress}
        >
          {isSubmitting ? (
            'Placing Order...'
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Place Order
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}