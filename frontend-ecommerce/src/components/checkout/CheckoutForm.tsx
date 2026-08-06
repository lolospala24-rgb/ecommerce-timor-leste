'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCart } from '@/hooks/useCart';
import { useAuthStore } from '@/stores/authStore';
import { useAddresses } from '@/hooks/useAddresses';
import { useCreateOrder } from '@/hooks/useOrders';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Truck, Building2, CheckCircle, ArrowLeft, Plus } from 'lucide-react';
import { AddressForm } from './AddressForm';
import { PaymentMethod } from './PaymentMethod';
import { OrderSummary } from './OrderSummary';
import toast from 'react-hot-toast';

const checkoutSchema = z.object({
  addressId: z.number().min(1, 'Please select a delivery address'),
  paymentMethod: z.enum(['COD', 'BANK_TRANSFER'], {
    required_error: 'Please select a payment method',
  }),
  notes: z.string().optional(),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

interface CheckoutFormProps {
  onSuccess?: (orderId: number) => void;
}

export function CheckoutForm({ onSuccess }: CheckoutFormProps) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { items, subtotal, shipping, total, clearCart, isLoading: cartLoading } = useCart();
  const { addresses, isLoading: addressesLoading, refetch: refetchAddresses } = useAddresses();
  const { mutateAsync: createOrder, isLoading: orderLoading } = useCreateOrder();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<number | undefined>(undefined);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'BANK_TRANSFER'>('COD');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      paymentMethod: 'COD',
    },
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/checkout');
    }
    if (!cartLoading && items.length === 0) {
      router.push('/cart');
    }
  }, [isAuthenticated, router, items, cartLoading]);

  // Auto-select primary address
  useEffect(() => {
    if (addresses && addresses.length > 0 && !selectedAddressId) {
      const primary = addresses.find((a: any) => a.isPrimary);
      if (primary) {
        setSelectedAddressId(primary.id);
        setValue('addressId', primary.id);
      } else {
        setSelectedAddressId(addresses[0].id);
        setValue('addressId', addresses[0].id);
      }
    }
  }, [addresses, setValue, selectedAddressId]);

  const onSubmit = async (data: CheckoutFormData) => {
    setIsSubmitting(true);
    try {
      const order = await createOrder({
        addressId: data.addressId,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
      });
      
      toast.success('Order placed successfully!');
      clearCart();
      
      if (onSuccess) {
        onSuccess(order.id);
      } else {
        router.push(`/orders/${order.id}`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddressAdded = () => {
    refetchAddresses();
    setShowAddressForm(false);
  };

  if (cartLoading || addressesLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-muted rounded mb-4" />
          <div className="h-64 bg-muted rounded" />
          <div className="h-64 bg-muted rounded mt-4" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }
  const hasAddresses = addresses && addresses.length > 0;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Checkout Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Address Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Delivery Address</CardTitle>
              <CardDescription>
                Select a delivery address or add a new one
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasAddresses ? (
                <RadioGroup
                  value={selectedAddressId?.toString()}
                  onValueChange={(value) => {
                    const id = parseInt(value);
                    setSelectedAddressId(id);
                    setValue('addressId', id);
                  }}
                  className="space-y-3"
                >
                  {addresses.map((address: any) => (
                    <div key={address.id} className="flex items-start space-x-3 space-y-0">
                      <RadioGroupItem value={address.id.toString()} id={`address-${address.id}`} />
                      <Label htmlFor={`address-${address.id}`} className="cursor-pointer flex-1">
                        <div>
                          <p className="font-medium">
                            {address.label || 'Address'}
                            {address.isPrimary && (
                              <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                Primary
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {address.street && `${address.street}, `}
                            {address.village && `${address.village}, `}
                            {address.suco}, {address.postoAdmin}, {address.municipality}
                          </p>
                          {address.reference && (
                            <p className="text-sm text-muted-foreground">
                              Reference: {address.reference}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">Phone: {address.phone}</p>
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <Alert>
                  <AlertDescription>
                    You don't have any saved addresses. Please add one to continue.
                  </AlertDescription>
                </Alert>
              )}
              
              <Button
                variant="outline"
                className="mt-4"
                type="button"
                onClick={() => setShowAddressForm(!showAddressForm)}
              >
                {showAddressForm ? 'Cancel' : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Address
                  </>
                )}
              </Button>

              {showAddressForm && (
                <div className="mt-4">
                  <AddressForm onSuccess={handleAddressAdded} />
                </div>
              )}
              
              {errors.addressId && (
                <p className="text-sm text-destructive mt-2">{errors.addressId.message}</p>
              )}
            </CardContent>
          </Card>

          {/* Payment Method */}
          <PaymentMethod
            value={paymentMethod}
            onChange={(value) => {
              setPaymentMethod(value);
              setValue('paymentMethod', value);
            }}
          />

          {/* Order Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Order Notes</CardTitle>
              <CardDescription>
                Any special instructions for your order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Add any special instructions or notes..."
                {...register('notes')}
              />
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <OrderSummary
            items={items}
            subtotal={subtotal}
            shipping={shipping}
            total={total}
            isSubmitting={isSubmitting || orderLoading}
            hasAddress={!!selectedAddressId}
          />
        </div>
      </div>
    </form>
  );
}