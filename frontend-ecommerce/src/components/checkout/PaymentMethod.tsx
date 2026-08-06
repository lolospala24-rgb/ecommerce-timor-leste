'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Truck, Building2, CreditCard, Shield } from 'lucide-react';

interface PaymentMethodProps {
  value: 'COD' | 'BANK_TRANSFER';
  onChange: (value: 'COD' | 'BANK_TRANSFER') => void;
}

export function PaymentMethod({ value, onChange }: PaymentMethodProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Method</CardTitle>
        <CardDescription>Select how you want to pay</CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup value={value} onValueChange={onChange} className="space-y-4">
          <div className="flex items-start space-x-3 space-y-0 rounded-lg border p-4 hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="COD" id="cod" />
            <Label htmlFor="cod" className="cursor-pointer flex-1">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                <span className="font-medium">Cash on Delivery</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Pay when your order arrives at your doorstep
              </p>
              <ul className="mt-2 text-xs text-muted-foreground space-y-1">
                <li>✓ No advance payment required</li>
                <li>✓ Pay cash to the delivery person</li>
                <li>✓ Available for orders under $100</li>
              </ul>
            </Label>
          </div>

          <div className="flex items-start space-x-3 space-y-0 rounded-lg border p-4 hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="BANK_TRANSFER" id="bank" />
            <Label htmlFor="bank" className="cursor-pointer flex-1">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <span className="font-medium">Bank Transfer</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Transfer payment to our bank account
              </p>
              <ul className="mt-2 text-xs text-muted-foreground space-y-1">
                <li>✓ Secure bank transfer</li>
                <li>✓ Upload payment proof for confirmation</li>
                <li>✓ No transaction fees</li>
              </ul>
            </Label>
          </div>
        </RadioGroup>

        {/* Security Note */}
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground border-t pt-4">
          <Shield className="h-4 w-4" />
          <span>Your payment information is secure and encrypted</span>
        </div>
      </CardContent>
    </Card>
  );
}