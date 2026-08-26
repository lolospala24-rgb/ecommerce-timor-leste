'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BadgeCheck,
  CreditCard,
  ShieldCheck,
  Truck,
  Wallet,
  MapPin,
  Plus,
  Lock,
  ChevronRight,
  ChevronDown,
  Loader2,
  LucideIcon,
  TicketPercent,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreateOrder } from '@/hooks/useOrders';
import api from '@/lib/api';
import { useAddresses } from '@/hooks/useAddresses';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';
import { useCouponStore } from '@/stores/couponStore';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const PLACEHOLDER_IMAGE = '/images/placeholder.png';

type ShippingOption = {
  id: string;
  name: string;
  subtitle: string;
  cost: number;
  eta: string;
  icon: LucideIcon;
  source: 'zone' | 'pickup';
  courierLabel?: string;
  courierId?: number;
  courierServiceId?: number;
  shippingMethod?: string;
  shippingZoneId?: number;
};

// The backend resolves which couriers actually serve this address — the
// frontend only renders whatever it returns, it never decides availability
// or price itself (see GET /shipping/options).
const mapApiShippingOptions = (apiOptions: any[] = []): ShippingOption[] =>
  apiOptions.map((option) => ({
    id: `zone-${option.shippingZoneId}`,
    // The method name (Standard/Express/Same Day Delivery) is the primary
    // label — a courier can offer several of these at once, so leading
    // with the courier name alone would show duplicate-looking cards.
    name: option.shippingMethod || option.courierName || option.zoneName || 'Delivery',
    subtitle: option.estimatedDeliveryDays ? `${option.estimatedDeliveryDays} business days` : 'Estimated delivery',
    cost: Number(option.shippingCost ?? 0),
    eta: option.estimatedDeliveryDays ? `Arrives in ${option.estimatedDeliveryDays} days` : 'Estimated delivery',
    icon: Truck,
    source: 'zone',
    courierLabel: option.courierName || undefined,
    courierId: option.courierId ?? undefined,
    shippingMethod: option.shippingMethod ?? undefined,
    shippingZoneId: option.shippingZoneId ?? undefined,
  }));

const paymentMethods = [
  { id: 'COD', name: 'Cash on Delivery', icon: Wallet },
  { id: 'BANK_TRANSFER', name: 'Bank Transfer', icon: CreditCard },
];

const trustBadges = ['Secure Checkout', 'SSL Encryption', 'Original Products', 'Buyer Protection', 'Safe Payment'];

export default function CheckoutPage() {
  const router = useRouter();
  const { isAuthenticated, checkAuth } = useAuthStore();
  const { items, isLoading: cartLoading, fetchCart, clearCart, mergeGuestCart } = useCartStore();
  const { addresses, isLoading: addressesLoading, refetch: refetchAddresses } = useAddresses();
  const { mutateAsync: createOrder, isPending: isPlacingOrder } = useCreateOrder();
  const { appliedCoupon, clearCoupon } = useCouponStore();

  const [enableLocalPickup, setEnableLocalPickup] = useState(false);
  const [addressShippingOptions, setAddressShippingOptions] = useState<any[]>([]);
  const [isShippingOptionsLoading, setIsShippingOptionsLoading] = useState(true);
  const [shippingOptionsError, setShippingOptionsError] = useState<string | null>(null);
  const [selectedShipping, setSelectedShipping] = useState('');
  const [selectedShippingMeta, setSelectedShippingMeta] = useState<{ courierId?: number; courierServiceId?: number; shippingMethod?: string; shippingZoneId?: number } | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<'COD' | 'BANK_TRANSFER'>('COD');
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [isProductsRowExpanded, setIsProductsRowExpanded] = useState(false);
  const [isAddressListOpen, setIsAddressListOpen] = useState(false);
  const [checkoutSettings, setCheckoutSettings] = useState<{
    taxRate?: number;
    serviceFee?: number;
    enableCOD?: boolean;
    enableBankTransfer?: boolean;
    minCODOrderAmount?: number;
    maxCODOrderAmount?: number;
    bankName?: string | null;
    bankAccountName?: string | null;
    bankAccountNumber?: string | null;
    bankIBAN?: string | null;
    bankSWIFT?: string | null;
    bankTransferInstructions?: string | null;
  }>({});

  useEffect(() => {
    void checkAuth();
    void fetchCart();
  }, [checkAuth, fetchCart]);

  useEffect(() => {
    let isMounted = true;

    const loadCheckoutConfig = async () => {
      let shippingPayload: any = {};
      let settingsPayload: any = {};

      try {
        const shippingResponse = await api.get('/shipping-settings');
        shippingPayload = shippingResponse?.data?.data ?? shippingResponse?.data ?? {};
      } catch {
        shippingPayload = {};
      }

      try {
        const settingsResponse = await api.get('/settings/public');
        settingsPayload = settingsResponse?.data?.data ?? settingsResponse?.data ?? {};
      } catch {
        settingsPayload = {};
      }

      if (!isMounted) {
        return;
      }

      setEnableLocalPickup(Boolean(shippingPayload?.enableLocalPickup));
      setCheckoutSettings({
        taxRate: Number(settingsPayload?.taxRate ?? 0),
        serviceFee: Number(settingsPayload?.serviceFee ?? 0),
        enableCOD: settingsPayload?.enableCOD ?? true,
        enableBankTransfer: settingsPayload?.enableBankTransfer ?? true,
        minCODOrderAmount: Number(settingsPayload?.minCODOrderAmount ?? 0),
        maxCODOrderAmount: Number(settingsPayload?.maxCODOrderAmount ?? 0),
        bankName: settingsPayload?.bankName ?? null,
        bankAccountName: settingsPayload?.bankAccountName ?? null,
        bankAccountNumber: settingsPayload?.bankAccountNumber ?? null,
        bankIBAN: settingsPayload?.bankIBAN ?? null,
        bankSWIFT: settingsPayload?.bankSWIFT ?? null,
        bankTransferInstructions: settingsPayload?.bankTransferInstructions ?? null,
      });
    };

    void loadCheckoutConfig();
    // Settings rarely change mid-session — refresh periodically in case an
    // admin updates them while the customer is checking out.
    const intervalId = window.setInterval(() => {
      void loadCheckoutConfig();
    }, 60_000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!addresses || addresses.length === 0) {
      setSelectedAddressId(null);
      return;
    }

    if (!selectedAddressId) {
      const primary = addresses.find((address: any) => address.isPrimary);
      setSelectedAddressId(primary?.id ?? addresses[0]?.id ?? null);
    }
  }, [addresses, selectedAddressId]);

  const selectedAddress = useMemo(
    () => (addresses || []).find((a: any) => a.id === selectedAddressId) ?? null,
    [addresses, selectedAddressId],
  );

  // The backend resolves which couriers actually serve this address —
  // re-fetched every time the selected address changes, since availability
  // and price are entirely address-dependent and must never be guessed or
  // filtered client-side.
  useEffect(() => {
    let isMounted = true;

    const loadOptionsForAddress = async () => {
      if (!selectedAddress) {
        setAddressShippingOptions([]);
        setShippingOptionsError(null);
        setIsShippingOptionsLoading(false);
        return;
      }

      setIsShippingOptionsLoading(true);
      setShippingOptionsError(null);

      try {
        const resp = await api.get('/shipping/options', {
          params: {
            municipalityId: selectedAddress.municipalityId,
            provinceId: selectedAddress.provinceId,
          },
        });
        const options = resp?.data?.data?.data ?? resp?.data?.data ?? [];
        if (!isMounted) return;
        setAddressShippingOptions(Array.isArray(options) ? options : []);
      } catch {
        if (!isMounted) return;
        setAddressShippingOptions([]);
        setShippingOptionsError('Could not load shipping options for this address. Please try again.');
      } finally {
        if (isMounted) setIsShippingOptionsLoading(false);
      }
    };

    void loadOptionsForAddress();
    return () => {
      isMounted = false;
    };
  }, [selectedAddress]);

  const shippingOptions = useMemo<ShippingOption[]>(() => {
    const options: ShippingOption[] = [];

    if (enableLocalPickup) {
      options.push({
        id: 'local-pickup',
        name: 'Local Pickup',
        subtitle: 'Collect directly from the store',
        cost: 0,
        eta: 'Ready for pickup',
        icon: BadgeCheck,
        source: 'pickup',
        courierLabel: 'Pickup from store',
        shippingMethod: 'LOCAL_PICKUP',
      });
    }

    return [...options, ...mapApiShippingOptions(addressShippingOptions)];
  }, [enableLocalPickup, addressShippingOptions]);

  useEffect(() => {
    setSelectedShipping((prev) => {
      const existing = shippingOptions.find((option) => option.id === prev);
      const next = existing ?? shippingOptions[0] ?? null;
      setSelectedShippingMeta(
        next
          ? {
              courierId: next.courierId,
              courierServiceId: next.courierServiceId,
              shippingMethod: next.shippingMethod,
              shippingZoneId: next.shippingZoneId,
            }
          : null,
      );
      return next?.id ?? '';
    });
  }, [shippingOptions]);

  const availablePaymentMethods = useMemo(
    () =>
      paymentMethods.filter((method) => {
        if (method.id === 'COD') return checkoutSettings.enableCOD !== false;
        if (method.id === 'BANK_TRANSFER') return checkoutSettings.enableBankTransfer !== false;
        return true;
      }),
    [checkoutSettings.enableCOD, checkoutSettings.enableBankTransfer],
  );

  useEffect(() => {
    if (availablePaymentMethods.length === 0) return;
    if (!availablePaymentMethods.some((method) => method.id === selectedPayment)) {
      setSelectedPayment(availablePaymentMethods[0].id as 'COD' | 'BANK_TRANSFER');
    }
  }, [availablePaymentMethods, selectedPayment]);

  const safeItems = Array.isArray(items) ? items : [];
  const subtotal = useMemo(
    () => safeItems.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0),
    [safeItems],
  );
  const [shippingCost, setShippingCost] = useState(0);

  useEffect(() => {
    const fetchShipping = async () => {
      if (!selectedAddressId) {
        setShippingCost(0);
        return;
      }

      const address = (addresses || []).find((a: any) => a.id === selectedAddressId);
      if (!address) {
        setShippingCost(0);
        return;
      }

      try {
        const resp = await api.post('/shipping/calculate', {
          municipalityId: address.municipalityId,
          provinceId: address.provinceId,
          shippingMethod: selectedShippingMeta?.shippingMethod ?? selectedShipping,
          subtotal,
          courierId: selectedShippingMeta?.courierId,
          courierServiceId: selectedShippingMeta?.courierServiceId,
          shippingZoneId: selectedShippingMeta?.shippingZoneId,
        });
        setShippingCost(Number(resp?.data?.data?.shippingCost ?? 0));
      } catch (err) {
        setShippingCost(0);
      }
    };

    void fetchShipping();
  }, [selectedAddressId, selectedShipping, selectedShippingMeta, subtotal, addresses]);
  // The backend creates one order per distinct seller in the cart and
  // charges the flat service fee on each order individually — so the
  // accurate preview multiplies by seller count, not a single flat fee,
  // otherwise a multi-seller cart would show a lower total than it's
  // actually charged.
  const sellerCount = useMemo(() => {
    const ids = new Set(safeItems.map((item) => item.sellerId ?? 'unknown'));
    return Math.max(ids.size, 1);
  }, [safeItems]);
  const taxRate = Number(checkoutSettings.taxRate ?? 0);
  const serviceFee = subtotal > 0 ? Number(checkoutSettings.serviceFee ?? 0) * sellerCount : 0;
  // Capped defensively in case the cart changed since the coupon was
  // applied on the cart page — the backend re-validates and recomputes
  // this for real at order placement regardless (see OrdersService.create
  // / CouponsService.validateForCustomer), so this is only a preview.
  const discountAmount = appliedCoupon ? Math.min(appliedCoupon.discountAmount, subtotal) : 0;
  const discountedSubtotal = subtotal - discountAmount;
  // Tax on the post-discount subtotal — matches the backend, which taxes
  // what the customer actually paid for the goods, not the pre-coupon price.
  const tax = discountedSubtotal * (taxRate / 100);
  const grandTotal = discountedSubtotal + shippingCost + tax + serviceFee;

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      toast.error('Please select a delivery address before placing your order.');
      return;
    }

    if (!selectedShipping) {
      toast.error('Please select a shipping method before placing your order.');
      return;
    }

    // isPlacingOrder (from useCreateOrder) only covers the createOrder call
    // itself, leaving the guest-cart-merge step above it unguarded — a fast
    // double-click could fire this whole function twice concurrently and
    // create two orders from the same cart. This flag covers the entire
    // function, not just the mutation.
    if (isSubmittingOrder) return;
    setIsSubmittingOrder(true);

    try {
      // Safety net: fold in any leftover guest-cart items (added while
      // signed out, e.g. this tab never mounted the merge-on-login effect
      // in useCart.ts) before placing the order. This must merge the real
      // guest cart from localStorage, never `safeItems` — safeItems is
      // already the customer's authenticated backend cart, and merging a
      // cart into itself doubles every quantity via the additive
      // `existingQty + item.quantity` logic in carts.service.ts.
      try {
        const guestCartRaw = localStorage.getItem('guest_cart');
        const guestItems = guestCartRaw ? JSON.parse(guestCartRaw) : [];
        if (Array.isArray(guestItems) && guestItems.length > 0) {
          await mergeGuestCart(guestItems as any);
          localStorage.removeItem('guest_cart');
        }
      } catch {
        // Ignore merge issues and continue with the current cart data from the backend.
      }

      const order = await createOrder({
        addressId: selectedAddressId,
        paymentMethod: selectedPayment,
        shippingMethod: selectedShippingMeta?.shippingMethod ?? selectedShipping,
        courierId: selectedShippingMeta?.courierId,
        courierServiceId: selectedShippingMeta?.courierServiceId,
        shippingZoneId: selectedShippingMeta?.shippingZoneId,
        shippingFee: shippingCost,
        taxAmount: tax,
        serviceFee,
        notes,
        couponCode: appliedCoupon?.code,
        deliveryLatitude: pinLocation?.lat,
        deliveryLongitude: pinLocation?.lng,
        deliveryReference: pinReference.trim() || undefined,
      });

      await clearCart();
      clearCoupon();
      setPinLocation(null);
      setPinReference('');
      // Multi-seller checkouts create one order per seller — the backend
      // returns an array in that case. Land on the first order; the
      // customer can see the rest under "My Orders".
      const firstOrder = Array.isArray(order) ? order[0] : order;
      router.push(`/orders/success?orderId=${firstOrder?.id}`);
    } catch {
      // The hook already shows the error toast.
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleRefreshAddresses = async () => {
    try {
      await refetchAddresses();
    } catch {
      // Ignore refresh errors.
    }
  };

  const GoogleMapPicker = dynamic(() => import('@/components/maps/GoogleMapPicker'), { ssr: false });

  const [showMap, setShowMap] = useState(false);

  // "Pin Exact Location" — deliberately local-only, order-scoped state. This
  // is NOT the same feature as "Add new address"'s map-assisted creation
  // (still reachable via /account/addresses/new, untouched): picking a pin
  // here never creates or edits a saved Address, never touches
  // selectedAddressId, and never changes Municipality/shipping — it only
  // captures a lat/lng (+ optional note) that rides along with THIS order,
  // for the courier to find the exact spot. See CreateOrderDto.deliveryLatitude.
  const [pinLocation, setPinLocation] = useState<{ lat: number; lng: number; placeName?: string; municipality?: string } | null>(null);
  const [pinReference, setPinReference] = useState('');

  const handlePinExactLocation = (loc: any) => {
    setPinLocation({ lat: loc.lat, lng: loc.lng, placeName: loc.placeName, municipality: loc.municipality });
    setShowMap(false);
  };

  const handleRemovePin = () => {
    setPinLocation(null);
    setPinReference('');
  };

  // Purely informational — never blocks or silently changes anything. The
  // pin's municipality is a best-effort reverse-geocode guess (see
  // GoogleMapPicker/extractLocationParts), so a mismatch is a nudge to
  // double-check, not proof of an error.
  const pinMunicipalityMismatch =
    !!pinLocation?.municipality &&
    !!selectedAddress?.municipality &&
    pinLocation.municipality.trim().toLowerCase() !== selectedAddress.municipality.trim().toLowerCase();

  if (cartLoading || (addressesLoading && !addresses)) {
    return (
      <Card className="flex items-center justify-center p-10">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Preparing your checkout...
        </div>
      </Card>
    );
  }

  if (!isAuthenticated) {
    return (
      <Card className="mx-auto max-w-3xl p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in to continue</h1>
        <p className="mt-3 text-sm text-muted-foreground">Your cart and saved addresses are loaded from the backend once you sign in.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button size="lg" asChild>
            <Link href="/login?redirect=/checkout">Sign in</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/cart">Back to cart</Link>
          </Button>
        </div>
      </Card>
    );
  }

  if (safeItems.length === 0) {
    return (
      <Card className="mx-auto max-w-3xl p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Your cart is empty</h1>
        <p className="mt-3 text-sm text-muted-foreground">Choose a product first so the checkout can use your real cart items from the backend.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button size="lg" asChild>
            <Link href="/">Continue shopping</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/cart">Open cart</Link>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <section className="w-full xl:w-[70%]">
          <Card className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
              <div className="flex items-center gap-3">
                <Link
                  href="/cart"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Premium Checkout</p>
                  <h1 className="text-2xl font-semibold tracking-tight">Complete your order</h1>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-success/20 bg-success/10 px-3 py-2 text-sm font-medium text-success">
                <ShieldCheck className="h-4 w-4" />
                Secure Checkout
              </div>
            </div>

            <div className="mt-6 space-y-5">
              <div className="rounded-xl border border-border bg-muted/40 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <StepNumber n={1} />
                      <h2 className="text-lg font-semibold">Delivery Address</h2>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">Your order will be delivered to the address you select below.</p>
                  </div>
                  {selectedAddress && (
                    <button
                      type="button"
                      onClick={() => setIsAddressListOpen((prev) => !prev)}
                      className="shrink-0 text-sm font-medium text-primary transition hover:text-primary/80"
                    >
                      {isAddressListOpen ? 'Cancel' : 'Change'}
                    </button>
                  )}
                </div>

                {/* Once an address is selected, show just that one address —
                    clean and unambiguous — instead of the full pickable list
                    with every other saved address competing for attention.
                    "Change" reveals the list again to pick a different one. */}
                {selectedAddress && !isAddressListOpen ? (
                  <div className="mt-5 rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center gap-2">
                      <p className="text-base font-semibold text-foreground">{selectedAddress.label || 'Address'}</p>
                      {selectedAddress.isPrimary && (
                        <span className="rounded-full bg-secondary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-secondary">Default</span>
                      )}
                    </div>
                    {selectedAddress.recipientName && (
                      <p className="mt-2 text-sm font-medium text-foreground">Recipient: {selectedAddress.recipientName}</p>
                    )}
                    <p className="mt-1 text-sm text-muted-foreground">{selectedAddress.phone}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {selectedAddress.street ? `${selectedAddress.street}, ` : ''}
                      {selectedAddress.village ? `${selectedAddress.village}, ` : ''}
                      {selectedAddress.suco ? `${selectedAddress.suco}, ` : ''}
                      {selectedAddress.postoAdmin ? `${selectedAddress.postoAdmin}, ` : ''}
                      {selectedAddress.municipality}
                    </p>
                    {selectedAddress.reference && <p className="mt-1 text-sm text-muted-foreground">Reference: {selectedAddress.reference}</p>}

                    {/* Kept visible even when the rest of the address actions
                        are tucked behind "Change" — pinning the exact spot
                        is a per-order refinement shoppers reach for often,
                        not address management. */}
                    <button
                      type="button"
                      onClick={() => setShowMap(true)}
                      className="mt-4 flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3.5 py-2 text-sm font-medium text-foreground transition hover:bg-muted/70"
                    >
                      <MapPin className="h-4 w-4 text-primary" /> {pinLocation ? 'Change exact location' : 'Pin exact location'}
                    </button>
                  </div>
                ) : addresses && addresses.length > 0 ? (
                  <div className="mt-5 grid gap-3">
                    {addresses.map((address: any) => {
                      const selected = selectedAddressId === address.id;
                      return (
                        <button
                          key={address.id}
                          type="button"
                          onClick={() => {
                            setSelectedAddressId(address.id);
                            setIsAddressListOpen(false);
                          }}
                          className={cn(
                            'rounded-xl border p-4 text-left transition',
                            selected
                              ? 'border-primary bg-primary/5 shadow-sm'
                              : 'border-border bg-card hover:border-primary/40 hover:bg-muted/50',
                          )}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-base font-semibold text-foreground">{address.label || 'Address'}</p>
                                {address.isPrimary && (
                                  <span className="rounded-full bg-secondary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-secondary">Default</span>
                                )}
                              </div>
                              {address.recipientName && (
                                <p className="mt-2 text-sm font-medium text-foreground">Recipient: {address.recipientName}</p>
                              )}
                              <p className="mt-1 text-sm text-muted-foreground">{address.phone}</p>
                              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                {address.street ? `${address.street}, ` : ''}
                                {address.village ? `${address.village}, ` : ''}
                                {address.suco ? `${address.suco}, ` : ''}
                                {address.postoAdmin ? `${address.postoAdmin}, ` : ''}
                                {address.municipality}
                              </p>
                              {address.reference && <p className="mt-1 text-sm text-muted-foreground">Reference: {address.reference}</p>}
                            </div>
                            <div className="rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground">
                              {selected ? 'Selected' : 'Select'}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-5 rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
                    No saved addresses were found. Add one in your account before placing the order.
                  </div>
                )}

                {/* Hidden once an address is selected and the list is
                    collapsed — these are address-management actions, not
                    something needed every time this section is glanced at. */}
                {(!selectedAddress || isAddressListOpen) && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href="/account/addresses/new?redirect=/checkout"
                      className="flex items-center gap-2 rounded-full border border-dashed border-border bg-card px-3.5 py-2.5 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary"
                    >
                      <Plus className="h-4 w-4" /> Add new address
                    </Link>
                    <button
                      type="button"
                      onClick={() => setShowMap(true)}
                      className="flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted/50"
                    >
                      <MapPin className="h-4 w-4 text-primary" /> {pinLocation ? 'Change exact location' : 'Pin exact location'}
                    </button>
                    <Link
                      href="/account/addresses"
                      className="rounded-full border border-border bg-card px-3.5 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted/50"
                    >
                      Manage addresses
                    </Link>
                    <button
                      type="button"
                      onClick={handleRefreshAddresses}
                      className="rounded-full border border-border bg-card px-3.5 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted/50"
                    >
                      Refresh
                    </button>
                  </div>
                )}
              </div>

              {/* Exact Delivery Location — deliberately a separate card from
                  Delivery Address above. Copy is explicit that this never
                  changes the address or shipping fee, to head off the exact
                  confusion this feature used to cause when the map redirected
                  into "Add new address" instead. */}
              {pinLocation && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        <h2 className="text-base font-semibold">Exact Delivery Location</h2>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {pinLocation.placeName || `${pinLocation.lat.toFixed(5)}, ${pinLocation.lng.toFixed(5)}`}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        This helps the courier find you for this order — it doesn't change your saved address or shipping fee.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemovePin}
                      className="shrink-0 text-sm font-medium text-muted-foreground transition hover:text-destructive"
                    >
                      Remove
                    </button>
                  </div>

                  {pinMunicipalityMismatch && (
                    <div className="mt-3 rounded-lg border border-warning/20 bg-warning/10 p-3 text-xs text-foreground">
                      This pin looks like it&apos;s in a different area ({pinLocation.municipality}) than your
                      selected delivery address ({selectedAddress?.municipality}). Shipping is still calculated for{' '}
                      {selectedAddress?.municipality} — please double-check the pin is correct.
                    </div>
                  )}

                  <div className="mt-3 space-y-1.5">
                    <Label htmlFor="pin-reference" className="text-xs font-medium text-muted-foreground">
                      Note for the courier (optional)
                    </Label>
                    <Input
                      id="pin-reference"
                      type="text"
                      value={pinReference}
                      onChange={(e) => setPinReference(e.target.value)}
                      placeholder="e.g. blue gate, 2nd floor"
                      maxLength={500}
                      className="h-9"
                    />
                  </div>
                </div>
              )}

              <Card className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <StepNumber n={2} />
                    <h2 className="text-lg font-semibold">Your products</h2>
                  </div>
                  <span className="text-sm text-muted-foreground">{safeItems.length} items</span>
                </div>
                {sellerCount > 1 && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Items from {sellerCount} different sellers will be shipped as {sellerCount} separate orders.
                  </p>
                )}

                <div className="mt-4 space-y-4">
                  {safeItems.map((item) => (
                    <div
                      key={`${item.productId}-${item.variantId ?? 'default'}`}
                      className="flex flex-col gap-4 rounded-xl border border-border p-4 sm:flex-row sm:items-center"
                    >
                      <CheckoutThumb
                        src={item.thumbnail}
                        alt={item.name}
                        className="h-28 w-full sm:h-24 sm:w-24"
                        sizes="(max-width: 640px) 100vw, 96px"
                      />
                      <div className="flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-semibold text-foreground">{item.name}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{item.slug}</p>
                          </div>
                          <div className="rounded-full bg-muted px-3 py-1 text-sm font-medium text-foreground">Qty {item.quantity}</div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                          <div>
                            <p className="font-medium text-foreground">Unit price</p>
                            <p>${(item.price || 0).toFixed(2)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-foreground">Product total</p>
                            <p className="font-semibold text-foreground">${((item.price || 0) * (item.quantity || 0)).toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <StepNumber n={3} />
                    <h2 className="text-lg font-semibold">Shipping method</h2>
                  </div>
                  <span className="text-sm text-muted-foreground">Live from admin settings</span>
                </div>

                {!selectedAddress ? (
                  <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                    Select a delivery address above to see shipping options for your area.
                  </div>
                ) : isShippingOptionsLoading ? (
                  <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading live shipping options...
                  </div>
                ) : shippingOptionsError ? (
                  <div className="mt-4 rounded-xl border border-dashed border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                    {shippingOptionsError}
                  </div>
                ) : shippingOptions.length > 0 ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {shippingOptions.map((option) => {
                      const Icon = option.icon;
                      const selected = option.id === selectedShipping;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            setSelectedShipping(option.id);
                            setSelectedShippingMeta({
                              courierId: option.courierId,
                              courierServiceId: option.courierServiceId,
                              shippingMethod: option.shippingMethod ?? option.id,
                              shippingZoneId: option.shippingZoneId,
                            });
                          }}
                          className={cn(
                            'rounded-xl border p-4 text-left transition',
                            selected
                              ? 'border-primary bg-primary/5 shadow-sm'
                              : 'border-border bg-card hover:border-primary/40 hover:bg-muted/50',
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div className={cn('rounded-full p-2', selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{option.name}</p>
                              <p className="text-sm text-muted-foreground">{option.subtitle}</p>
                              {option.courierLabel && (
                                <p className="mt-1 text-xs font-medium text-primary">{option.courierLabel}</p>
                              )}
                            </div>
                          </div>
                          <div className="mt-4 flex items-center justify-between text-sm">
                            <span className="font-semibold text-foreground">${Number(option.cost ?? 0).toFixed(2)}</span>
                            <span className="text-muted-foreground">{option.eta}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                    No courier currently delivers to {selectedAddress.municipality || 'this municipality'}. Please choose a different address or contact support.
                  </div>
                )}
              </Card>

              <Card className="p-5">
                <div className="flex items-center gap-2.5">
                  <StepNumber n={4} />
                  <h2 className="text-lg font-semibold">Payment method</h2>
                </div>
                {availablePaymentMethods.length > 0 ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {availablePaymentMethods.map((method) => {
                      const Icon = method.icon;
                      const selected = method.id === selectedPayment;
                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setSelectedPayment(method.id as 'COD' | 'BANK_TRANSFER')}
                          className={cn(
                            'flex items-center justify-between rounded-xl border p-4 text-left transition',
                            selected
                              ? 'border-primary bg-primary/5 shadow-sm'
                              : 'border-border bg-card hover:border-primary/40 hover:bg-muted/50',
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn('rounded-full p-2', selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <span className="font-medium text-foreground">{method.name}</span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                    No payment methods are currently available. Please contact support.
                  </div>
                )}

                {selectedPayment === 'COD' && (Boolean(checkoutSettings.minCODOrderAmount) || Boolean(checkoutSettings.maxCODOrderAmount)) && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Cash on Delivery is available for orders
                    {checkoutSettings.minCODOrderAmount ? ` from $${checkoutSettings.minCODOrderAmount.toFixed(2)}` : ''}
                    {checkoutSettings.maxCODOrderAmount ? ` up to $${checkoutSettings.maxCODOrderAmount.toFixed(2)}` : ''}.
                  </p>
                )}

                {selectedPayment === 'BANK_TRANSFER' && checkoutSettings.bankName && (
                  <div className="mt-4 rounded-lg border border-warning/20 bg-warning/10 p-4 text-sm text-foreground">
                    <p className="font-semibold text-warning">Transfer to:</p>
                    <p className="mt-1">{checkoutSettings.bankName} — {checkoutSettings.bankAccountName}</p>
                    {checkoutSettings.bankAccountNumber && <p>Account No: {checkoutSettings.bankAccountNumber}</p>}
                    {checkoutSettings.bankSWIFT && <p>SWIFT: {checkoutSettings.bankSWIFT}</p>}
                    <p className="mt-2 text-muted-foreground">
                      You&apos;ll confirm your transfer and upload a receipt after placing the order.
                    </p>
                  </div>
                )}
              </Card>

              <Card className="p-5">
                <div className="flex items-center gap-2.5">
                  <StepNumber n={5} />
                  <h2 className="text-lg font-semibold">Order notes</h2>
                  <span className="text-sm font-normal text-muted-foreground">(optional)</span>
                </div>
                <Textarea
                  rows={4}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Add delivery instructions..."
                  className="mt-3"
                />
              </Card>
            </div>
          </Card>
        </section>

        <aside className="w-full xl:w-[30%]">
          <Card className="sticky top-6 p-6">
            {/* Product photos are already shown in full in the "Your
                products" card in the main column above — repeating them
                here just made the same items appear on screen twice. This
                row instead doubles as the subtotal line and an optional,
                text-only expand for a quick double-check without scrolling
                back up or seeing every photo again. */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Order summary</h2>
              <Badge variant="outline" className="border-info/20 bg-info/10 text-info">Live</Badge>
            </div>

            <div className="mt-5 space-y-3 border-t border-border pt-5 text-sm text-muted-foreground">
              <button
                type="button"
                onClick={() => setIsProductsRowExpanded((prev) => !prev)}
                className="flex w-full items-center justify-between text-left"
                aria-expanded={isProductsRowExpanded}
              >
                <span className="flex items-center gap-1.5">
                  Products ({safeItems.length})
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isProductsRowExpanded && 'rotate-180')} />
                </span>
                <span>${subtotal.toFixed(2)}</span>
              </button>

              {isProductsRowExpanded && (
                <div className="space-y-2 rounded-lg bg-muted/40 p-3">
                  {safeItems.map((item) => (
                    <div key={`${item.productId}-${item.variantId ?? 'default'}-summary`} className="flex items-center justify-between gap-3">
                      <span className="truncate text-foreground">{item.name} × {item.quantity}</span>
                      <span className="shrink-0">${((item.price || 0) * (item.quantity || 0)).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              {appliedCoupon && (
                <div className="flex items-center justify-between text-success">
                  <span className="flex items-center gap-1.5">
                    <TicketPercent className="h-3.5 w-3.5" />
                    Coupon ({appliedCoupon.code})
                  </span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between"><span>Shipping fee</span><span>${shippingCost.toFixed(2)}</span></div>
              <div className="flex items-center justify-between"><span>Tax</span><span>${tax.toFixed(2)}</span></div>
              <div className="flex items-center justify-between">
                <span>Service fee{sellerCount > 1 ? ` (${sellerCount} sellers)` : ''}</span>
                <span>${serviceFee.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-muted/40 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Grand total</span>
                <span className="text-3xl font-semibold text-primary">${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-5 grid gap-2">
              {trustBadges.map((badge) => (
                <div key={badge} className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                  <BadgeCheck className="h-4 w-4 text-success" />
                  {badge}
                </div>
              ))}
            </div>

            {/* Hidden below xl: — the mobile sticky bar further down covers
                the same action there, in the thumb zone, instead of
                leaving it at the bottom of a long stacked page. */}
            <Button
              type="button"
              size="lg"
              disabled={!selectedAddressId || !selectedShipping || isSubmittingOrder || isPlacingOrder}
              onClick={handlePlaceOrder}
              className="mt-6 hidden w-full xl:flex"
            >
              {isSubmittingOrder || isPlacingOrder ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Lock className="mr-2 h-4 w-4" />
              )}
              Place Order
            </Button>

            <p className="mt-4 hidden text-center text-sm text-muted-foreground xl:block">
              I agree to the <span className="font-medium text-foreground">Terms & Conditions</span> and <span className="font-medium text-foreground">Privacy Policy</span>.
            </p>
          </Card>
        </aside>
      </div>
      {showMap && (
        <GoogleMapPicker onSelect={handlePinExactLocation} onClose={() => setShowMap(false)} />
      )}

      {/* Mobile sticky Place Order bar — on a long checkout page (address,
          products, shipping, payment, notes, order summary), the buy
          button otherwise sits at the very bottom, so a shopper filling
          in the form has no visible way to submit without scrolling all
          the way down first. Pinned to the bottom of the viewport instead,
          matching the same pattern used on the product detail page. */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur-sm xl:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center gap-3 px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Grand total</p>
            <p className="truncate text-lg font-bold text-primary">${grandTotal.toFixed(2)}</p>
          </div>
          <Button
            type="button"
            size="lg"
            disabled={!selectedAddressId || !selectedShipping || isSubmittingOrder || isPlacingOrder}
            onClick={handlePlaceOrder}
            className="h-11 shrink-0 px-6 font-semibold"
          >
            {isSubmittingOrder || isPlacingOrder ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Lock className="mr-2 h-4 w-4" />
            )}
            Place Order
          </Button>
        </div>
      </div>
      <div className="h-[68px] xl:hidden" aria-hidden="true" />
    </>
  );
}

// Numbered badge marking each section as a step in the checkout sequence
// (Delivery Address, Your products, Shipping, Payment, Order notes) — gives
// the shopper a clear sense of order and progress through the page instead
// of five same-weight cards with no visual relationship to each other.
function StepNumber({ n }: { n: number }) {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
      {n}
    </span>
  );
}

// Thumbnail for checkout line items — mirrors the same error-fallback
// pattern ProductCard/CartItem use (swap to the placeholder on load error)
// but via next/image instead of a raw <img>, so these get the same
// automatic resizing/lazy-loading the rest of the shop already relies on.
function CheckoutThumb({
  src,
  alt,
  className,
  sizes,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  sizes: string;
}) {
  const [errored, setErrored] = useState(false);

  return (
    <div className={cn('relative shrink-0 overflow-hidden rounded-lg bg-muted', className)}>
      <Image
        src={errored || !src ? PLACEHOLDER_IMAGE : src}
        alt={alt}
        fill
        sizes={sizes}
        className="object-cover"
        onError={() => setErrored(true)}
      />
    </div>
  );
}
