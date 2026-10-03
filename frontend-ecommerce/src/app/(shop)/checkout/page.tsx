'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
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
  ChevronDown,
  Loader2,
  LucideIcon,
  TicketPercent,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreateOrder } from '@/hooks/useOrders';
import api from '@/lib/api';
import { useAddresses } from '@/hooks/useAddresses';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';
import { useCouponStore } from '@/stores/couponStore';
import { useReferralSummary } from '@/hooks/useReferral';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { trackBeginCheckout, trackPurchase } from '@/lib/analytics';
import { useTranslation } from '@/lib/i18n/LanguageContext';

const NOTES_MAX_LENGTH = 300;

// Hoisted to module scope: calling dynamic() inside the component body would
// create a brand-new lazy component reference on every render, forcing React
// to unmount+remount the map (and its in-progress pin selection) any time an
// unrelated piece of checkout state changes.
const GoogleMapPicker = dynamic(() => import('@/components/maps/GoogleMapPicker'), { ssr: false });

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

export default function CheckoutPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated, checkAuth } = useAuthStore();
  const { items, isLoading: cartLoading, fetchCart, clearCart, mergeGuestCart } = useCartStore();
  const { addresses, isLoading: addressesLoading, refetch: refetchAddresses } = useAddresses();
  const { mutateAsync: createOrder, isPending: isPlacingOrder } = useCreateOrder();
  const { appliedCoupon, clearCoupon } = useCouponStore();
  const { data: referralSummary } = useReferralSummary();

  // The backend resolves which couriers actually serve this address — the
  // frontend only renders whatever it returns, it never decides availability
  // or price itself (see GET /shipping/options). Needs `t` (translated
  // fallback labels), so it lives inside the component instead of module
  // scope like before.
  const mapApiShippingOptions = (apiOptions: any[] = []): ShippingOption[] =>
    apiOptions.map((option) => ({
      id: `zone-${option.shippingZoneId}`,
      // The method name (Standard/Express/Same Day Delivery) is the primary
      // label — a courier can offer several of these at once, so leading
      // with the courier name alone would show duplicate-looking cards.
      name: option.shippingMethod || option.courierName || option.zoneName || t('checkout.shipping.deliveryFallback'),
      subtitle: option.estimatedDeliveryDays
        ? t('checkout.shipping.businessDays', { count: option.estimatedDeliveryDays })
        : t('checkout.shipping.estimatedDelivery'),
      cost: Number(option.shippingCost ?? 0),
      eta: option.estimatedDeliveryDays
        ? t('checkout.shipping.arrivesIn', { count: option.estimatedDeliveryDays })
        : t('checkout.shipping.estimatedDelivery'),
      icon: Truck,
      source: 'zone' as const,
      courierLabel: option.courierName || undefined,
      courierId: option.courierId ?? undefined,
      shippingMethod: option.shippingMethod ?? undefined,
      shippingZoneId: option.shippingZoneId ?? undefined,
    }));

  const paymentMethods = [
    { id: 'COD', name: t('checkout.payment.codName'), description: t('checkout.payment.codDescription'), icon: Wallet },
    { id: 'BANK_TRANSFER', name: t('checkout.payment.bankTransferName'), description: t('checkout.payment.bankTransferDescription'), icon: CreditCard },
  ];

  // Capped at 3 — real, system-backed guarantees only (no SSL/encryption
  // claim, since that's a given for any HTTPS site and not something this
  // checkout specifically verifies).
  const trustIndicators = [
    { icon: Lock, label: t('checkout.trust.securePayment') },
    { icon: ShieldCheck, label: t('checkout.trust.buyerProtection') },
    { icon: BadgeCheck, label: t('checkout.trust.originalProducts') },
  ];

  const [enableLocalPickup, setEnableLocalPickup] = useState(false);
  const [useWalletCredit, setUseWalletCredit] = useState(false);
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
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  // 3-step checkout flow: Address & Location → Shipping → Payment. Purely a
  // UI concern — every field/handler below is unchanged from the single-
  // page layout, just shown one step at a time. Not persisted to the URL;
  // a refresh mid-checkout starts back at step 1, same as the previous
  // layout always scrolled to top on reload.
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
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
        setShippingOptionsError(t('checkout.error.shippingOptionsLoad'));
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
        name: t('checkout.shipping.localPickupName'),
        subtitle: t('checkout.shipping.localPickupSubtitle'),
        cost: 0,
        eta: t('checkout.shipping.localPickupEta'),
        icon: BadgeCheck,
        source: 'pickup',
        courierLabel: t('checkout.shipping.localPickupCourierLabel'),
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

  // Grouped by real seller (sellerId/sellerName already come straight off
  // the backend's cart response, see lib/cart.ts) — sellerCount itself
  // (computed above) is all that's needed now: the "shipped as N separate
  // orders" note and the per-seller service fee multiplier in Step 3's
  // Order Summary, no per-seller product grouping required.
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
  const preWalletGrandTotal = discountedSubtotal + shippingCost + tax + serviceFee;
  // Wallet credit is a cash-equivalent earned balance (like a gift card),
  // not a merchandise discount — applied AFTER tax/shipping/service fee as
  // a straight reduction of the total, never folded into discountAmount
  // (matches OrdersService.create's identical reasoning server-side).
  const walletBalance = referralSummary?.walletCredit ?? 0;
  const walletCreditApplied = useWalletCredit ? Math.min(walletBalance, preWalletGrandTotal) : 0;
  const grandTotal = preWalletGrandTotal - walletCreditApplied;

  // Fires once per checkout visit, not on every recompute triggered by
  // shipping/coupon changes — those are the same checkout session, not a
  // new one.
  const hasTrackedBeginCheckout = useRef(false);
  useEffect(() => {
    if (hasTrackedBeginCheckout.current || safeItems.length === 0) return;
    hasTrackedBeginCheckout.current = true;
    trackBeginCheckout(
      safeItems.map((item) => ({
        item_id: item.productId,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      subtotal,
    );
    // Deliberately only depends on safeItems becoming available — subtotal
    // is derived from the same data at the same instant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeItems]);

  // Same checks handlePlaceOrder already made defensively before this
  // refactor — now also gating step advancement, so a shopper can't reach
  // Shipping/Payment without the information those steps (and ultimately
  // order creation) depend on.
  const handleContinueFromAddress = () => {
    if (!selectedAddressId) {
      toast.error(t('checkout.error.selectAddress'));
      return;
    }
    setCurrentStep(2);
  };

  const handleContinueFromShipping = () => {
    if (!selectedShipping) {
      toast.error(t('checkout.error.selectShipping'));
      return;
    }
    setCurrentStep(3);
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      toast.error(t('checkout.error.selectAddressFinal'));
      return;
    }

    if (!selectedShipping) {
      toast.error(t('checkout.error.selectShippingFinal'));
      return;
    }

    if (!agreedToTerms) {
      toast.error(t('checkout.error.agreeTerms'));
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
        useWalletCredit: walletCreditApplied > 0,
        deliveryLatitude: pinLocation?.lat,
        deliveryLongitude: pinLocation?.lng,
        deliveryReference: pinReference.trim() || undefined,
      });

      // Captured from safeItems/grandTotal before clearCart() wipes the
      // cart — the order response itself doesn't echo back line items.
      const orders = Array.isArray(order) ? order : [order];
      trackPurchase(
        orders.map((o) => o?.id).filter(Boolean).join(','),
        safeItems.map((item) => ({
          item_id: item.productId,
          item_name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        grandTotal,
        shippingCost,
        tax,
      );

      await clearCart();
      clearCoupon();
      setPinLocation(null);
      setPinReference('');
      // Multi-seller checkouts create one order per seller — the backend
      // returns an array in that case. Land on the first order; the
      // customer can see the rest under "My Orders".
      const firstOrder = orders[0];
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
          {t('checkout.preparing')}
        </div>
      </Card>
    );
  }

  if (!isAuthenticated) {
    return (
      <Card className="mx-auto max-w-3xl p-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t('checkout.signInTitle')}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{t('checkout.signInDescription')}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button size="lg" asChild>
            <Link href="/login?redirect=/checkout">{t('checkout.signIn')}</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/cart">{t('checkout.backToCart')}</Link>
          </Button>
        </div>
      </Card>
    );
  }

  if (safeItems.length === 0) {
    return (
      <Card className="mx-auto max-w-3xl p-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t('checkout.emptyCartTitle')}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{t('checkout.emptyCartDescription')}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button size="lg" asChild>
            <Link href="/">{t('checkout.continueShopping')}</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/cart">{t('checkout.openCart')}</Link>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      {/* No breadcrumb here — (shop)/layout.tsx already renders the
          site-wide <Breadcrumb /> above every page that doesn't opt out
          (see hasOwnBreadcrumb()), and it already resolves "/checkout" to
          "Home > Checkout". A second one here would just duplicate it. */}
      <div className="mx-auto w-full max-w-2xl">
        <Card className="p-6 sm:p-8">
          <div className="flex items-center gap-3 border-b border-border pb-6">
            <Link
              href="/cart"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted"
              aria-label={t('checkout.backToCart')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{t('checkout.title')}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {t('checkout.subtitle')}
              </p>
            </div>
          </div>

          <CheckoutStepIndicator
            currentStep={currentStep}
            steps={[
              { step: 1, label: t('checkout.step.address') },
              { step: 2, label: t('checkout.step.shipping') },
              { step: 3, label: t('checkout.step.payment') },
            ]}
            onStepClick={(step) => {
              if (step < currentStep) setCurrentStep(step);
            }}
          />

          {/* ============ STEP 1 — Address & Location ============ */}
          {currentStep === 1 && (
            <div className="mt-6 space-y-5">
              <div className="rounded-xl border border-border bg-muted/40 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{t('checkout.address.title')}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">{t('checkout.address.description')}</p>
                  </div>
                  {selectedAddress && (
                    <button
                      type="button"
                      onClick={() => setIsAddressListOpen((prev) => !prev)}
                      className="shrink-0 text-sm font-medium text-primary transition hover:text-primary/80"
                    >
                      {isAddressListOpen ? t('checkout.address.cancel') : t('checkout.address.change')}
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
                      <p className="text-base font-semibold text-foreground">{selectedAddress.label || t('checkout.address.fallbackLabel')}</p>
                      {selectedAddress.isPrimary && (
                        <span className="rounded-full bg-secondary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-secondary">{t('checkout.address.default')}</span>
                      )}
                    </div>
                    {selectedAddress.recipientName && (
                      <p className="mt-2 text-sm font-medium text-foreground">{t('checkout.address.recipient', { name: selectedAddress.recipientName })}</p>
                    )}
                    <p className="mt-1 text-sm text-muted-foreground">{selectedAddress.phone}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {selectedAddress.street ? `${selectedAddress.street}, ` : ''}
                      {selectedAddress.village ? `${selectedAddress.village}, ` : ''}
                      {selectedAddress.suco ? `${selectedAddress.suco}, ` : ''}
                      {selectedAddress.postoAdmin ? `${selectedAddress.postoAdmin}, ` : ''}
                      {selectedAddress.municipality}
                    </p>
                    {selectedAddress.reference && <p className="mt-1 text-sm text-muted-foreground">{t('checkout.address.reference', { reference: selectedAddress.reference })}</p>}

                    {/* Kept visible even when the rest of the address actions
                        are tucked behind "Change" — pinning the exact spot
                        is a per-order refinement shoppers reach for often,
                        not address management. Also covers "use my current
                        location" — GoogleMapPicker already has a built-in
                        geolocation button. */}
                    <button
                      type="button"
                      onClick={() => setShowMap(true)}
                      className="mt-4 flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3.5 py-2 text-sm font-medium text-foreground transition hover:bg-muted/70"
                    >
                      <MapPin className="h-4 w-4 text-primary" /> {pinLocation ? t('checkout.address.changeExactLocation') : t('checkout.address.pinExactLocation')}
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
                                <p className="text-base font-semibold text-foreground">{address.label || t('checkout.address.fallbackLabel')}</p>
                                {address.isPrimary && (
                                  <span className="rounded-full bg-secondary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-secondary">{t('checkout.address.default')}</span>
                                )}
                              </div>
                              {address.recipientName && (
                                <p className="mt-2 text-sm font-medium text-foreground">{t('checkout.address.recipient', { name: address.recipientName })}</p>
                              )}
                              <p className="mt-1 text-sm text-muted-foreground">{address.phone}</p>
                              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                {address.street ? `${address.street}, ` : ''}
                                {address.village ? `${address.village}, ` : ''}
                                {address.suco ? `${address.suco}, ` : ''}
                                {address.postoAdmin ? `${address.postoAdmin}, ` : ''}
                                {address.municipality}
                              </p>
                              {address.reference && <p className="mt-1 text-sm text-muted-foreground">{t('checkout.address.reference', { reference: address.reference })}</p>}
                            </div>
                            <div className="rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground">
                              {selected ? t('checkout.address.selected') : t('checkout.address.select')}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-5 rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
                    {t('checkout.address.none')}
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
                      <Plus className="h-4 w-4" /> {t('checkout.address.addNew')}
                    </Link>
                    <button
                      type="button"
                      onClick={() => setShowMap(true)}
                      className="flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted/50"
                    >
                      <MapPin className="h-4 w-4 text-primary" /> {pinLocation ? t('checkout.address.changeExactLocation') : t('checkout.address.pinExactLocation')}
                    </button>
                    <Link
                      href="/account/addresses"
                      className="rounded-full border border-border bg-card px-3.5 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted/50"
                    >
                      {t('checkout.address.manage')}
                    </Link>
                    <button
                      type="button"
                      onClick={handleRefreshAddresses}
                      className="rounded-full border border-border bg-card px-3.5 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted/50"
                    >
                      {t('checkout.address.refresh')}
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
                        <h2 className="text-base font-semibold">{t('checkout.exactLocation.title')}</h2>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {pinLocation.placeName || `${pinLocation.lat.toFixed(5)}, ${pinLocation.lng.toFixed(5)}`}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {t('checkout.exactLocation.description')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemovePin}
                      className="shrink-0 text-sm font-medium text-muted-foreground transition hover:text-destructive"
                    >
                      {t('checkout.exactLocation.remove')}
                    </button>
                  </div>

                  {pinMunicipalityMismatch && (
                    <div className="mt-3 rounded-lg border border-warning/20 bg-warning/10 p-3 text-xs text-foreground">
                      {t('checkout.exactLocation.mismatch', {
                        pinMunicipality: pinLocation.municipality || '',
                        addressMunicipality: selectedAddress?.municipality || '',
                      })}
                    </div>
                  )}

                  <div className="mt-3 space-y-1.5">
                    <Label htmlFor="pin-reference" className="text-xs font-medium text-muted-foreground">
                      {t('checkout.exactLocation.noteLabel')}
                    </Label>
                    <Input
                      id="pin-reference"
                      type="text"
                      value={pinReference}
                      onChange={(e) => setPinReference(e.target.value)}
                      placeholder={t('checkout.exactLocation.notePlaceholder')}
                      maxLength={500}
                      className="h-9"
                    />
                  </div>
                </div>
              )}

              <Button type="button" size="lg" onClick={handleContinueFromAddress} className="w-full">
                {t('checkout.continue')}
              </Button>
            </div>
          )}

          {/* ============ STEP 2 — Shipping ============ */}
          {currentStep === 2 && (
            <div className="mt-6 space-y-5">
              <div>
                <h2 className="text-lg font-semibold">{t('checkout.shipping.title')}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t('checkout.shipping.description')}</p>
              </div>

              {!selectedAddress ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                  {t('checkout.shipping.selectAddressFirst')}
                </div>
              ) : isShippingOptionsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('checkout.shipping.loading')}
                </div>
              ) : shippingOptionsError ? (
                <div className="rounded-xl border border-dashed border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                  {shippingOptionsError}
                </div>
              ) : shippingOptions.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
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
                        aria-pressed={selected}
                        className={cn(
                          'relative rounded-xl border p-4 text-left transition',
                          selected
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-border bg-card hover:border-primary/40 hover:bg-muted/50',
                        )}
                      >
                        {selected && (
                          <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                        <div className="flex items-center gap-2 pr-6">
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
                <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                  {t('checkout.shipping.noCourier', { municipality: selectedAddress.municipality || t('checkout.shipping.thisMunicipality') })}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between gap-2.5">
                  <Label htmlFor="delivery-notes" className="text-sm font-medium text-foreground">
                    {t('checkout.shipping.notesLabel')} <span className="font-normal text-muted-foreground">{t('checkout.shipping.optional')}</span>
                  </Label>
                  <span
                    className={cn(
                      'text-xs',
                      notes.length > NOTES_MAX_LENGTH ? 'text-destructive' : 'text-muted-foreground',
                    )}
                  >
                    {notes.length}/{NOTES_MAX_LENGTH}
                  </span>
                </div>
                <Textarea
                  id="delivery-notes"
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder={t('checkout.shipping.notesPlaceholder')}
                  maxLength={NOTES_MAX_LENGTH}
                  className="mt-2"
                />
              </div>

              {/* Shipping cost summary — real-time, same shippingCost the
                  Order Summary in Step 3 and the final order charge both
                  use (computed by the /shipping/calculate effect above). */}
              <div className="rounded-xl bg-muted/40 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('checkout.shipping.fee')}</span>
                  <span className="font-semibold text-foreground">${shippingCost.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="button" size="lg" variant="outline" onClick={() => setCurrentStep(1)} className="flex-1">
                  {t('checkout.back')}
                </Button>
                <Button type="button" size="lg" onClick={handleContinueFromShipping} className="flex-1">
                  {t('checkout.continue')}
                </Button>
              </div>
            </div>
          )}

          {/* ============ STEP 3 — Payment ============ */}
          {currentStep === 3 && (
            <div className="mt-6 space-y-5">
              <div>
                <h2 className="text-lg font-semibold">{t('checkout.payment.title')}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t('checkout.payment.description')}</p>
              </div>

              {availablePaymentMethods.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {availablePaymentMethods.map((method) => {
                    const Icon = method.icon;
                    const selected = method.id === selectedPayment;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setSelectedPayment(method.id as 'COD' | 'BANK_TRANSFER')}
                        className={cn(
                          'relative flex items-start gap-3 rounded-xl border p-4 text-left transition',
                          selected
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-border bg-card hover:border-primary/40 hover:bg-muted/50',
                        )}
                      >
                        {selected && (
                          <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                        <div className={cn('shrink-0 rounded-full p-2', selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 pr-6">
                          <p className="font-medium text-foreground">{method.name}</p>
                          <p className="mt-0.5 text-sm text-muted-foreground">{method.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                  {t('checkout.payment.noMethods')}
                </div>
              )}

              {selectedPayment === 'COD' && (Boolean(checkoutSettings.minCODOrderAmount) || Boolean(checkoutSettings.maxCODOrderAmount)) && (
                <p className="text-xs text-muted-foreground">
                  {t('checkout.payment.codLimits', {
                    from: checkoutSettings.minCODOrderAmount ? t('checkout.payment.codLimitsFrom', { amount: checkoutSettings.minCODOrderAmount.toFixed(2) }) : '',
                    upTo: checkoutSettings.maxCODOrderAmount ? t('checkout.payment.codLimitsUpTo', { amount: checkoutSettings.maxCODOrderAmount.toFixed(2) }) : '',
                  })}
                </p>
              )}

              {selectedPayment === 'BANK_TRANSFER' && checkoutSettings.bankName && (
                <div className="rounded-lg border border-warning/20 bg-warning/10 p-4 text-sm text-foreground">
                  <p className="font-semibold text-warning">{t('checkout.payment.transferTo')}</p>
                  <p className="mt-1">{checkoutSettings.bankName} — {checkoutSettings.bankAccountName}</p>
                  {checkoutSettings.bankAccountNumber && <p>{t('checkout.payment.accountNo', { number: checkoutSettings.bankAccountNumber })}</p>}
                  {checkoutSettings.bankSWIFT && <p>{t('checkout.payment.swift', { code: checkoutSettings.bankSWIFT })}</p>}
                  <p className="mt-2 text-muted-foreground">
                    {t('checkout.payment.transferNote')}
                  </p>
                </div>
              )}

              {walletBalance > 0 && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-4">
                  <div className="flex items-center gap-2.5">
                    <Wallet className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-semibold">{t('checkout.wallet.title')}</p>
                      <p className="text-xs text-muted-foreground">{t('checkout.wallet.available', { amount: walletBalance.toFixed(2) })}</p>
                    </div>
                  </div>
                  <Switch checked={useWalletCredit} onCheckedChange={setUseWalletCredit} />
                </div>
              )}

              {/* Order Summary */}
              <div className="rounded-xl border border-border p-5">
                <h3 className="text-base font-semibold">{t('checkout.summary.title')}</h3>
                {sellerCount > 1 && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {t('checkout.summary.multiSeller', { count: sellerCount })}
                  </p>
                )}

                <div className="mt-4 space-y-3 border-t border-border pt-4 text-sm text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => setIsProductsRowExpanded((prev) => !prev)}
                    className="flex w-full items-center justify-between text-left"
                    aria-expanded={isProductsRowExpanded}
                  >
                    <span className="flex items-center gap-1.5">
                      {t('checkout.summary.products', { count: safeItems.length })}
                      <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isProductsRowExpanded && 'rotate-180')} />
                    </span>
                    <span>${subtotal.toFixed(2)}</span>
                  </button>

                  {isProductsRowExpanded && (
                    <div className="space-y-2 rounded-lg bg-muted/40 p-3">
                      {safeItems.map((item) => (
                        <div key={`${item.productId}-${item.variantId ?? 'default'}-summary`} className="flex items-center justify-between gap-3">
                          <span className="truncate text-foreground">
                            {item.name}
                            {item.variantAttributes && Object.keys(item.variantAttributes).length > 0
                              ? ` (${Object.values(item.variantAttributes as Record<string, string>).filter(Boolean).join(' / ')})`
                              : ''}
                            {' '}× {item.quantity}
                          </span>
                          <span className="shrink-0">${((item.price || 0) * (item.quantity || 0)).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {appliedCoupon && (
                    <div className="flex items-center justify-between text-success">
                      <span className="flex items-center gap-1.5">
                        <TicketPercent className="h-3.5 w-3.5" />
                        {t('checkout.summary.coupon', { code: appliedCoupon.code })}
                      </span>
                      <span>-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between"><span>{t('checkout.summary.shipping')}</span><span>${shippingCost.toFixed(2)}</span></div>
                  {/* Tax and service fee are only ever real line items when
                      the store actually charges them — a "$0.00" row for a
                      fee that never applies is noise, not information. */}
                  {tax > 0 && (
                    <div className="flex items-center justify-between"><span>{t('checkout.summary.tax')}</span><span>${tax.toFixed(2)}</span></div>
                  )}
                  {serviceFee > 0 && (
                    <div className="flex items-center justify-between">
                      <span>{sellerCount > 1 ? t('checkout.summary.serviceFeeSellers', { count: sellerCount }) : t('checkout.summary.serviceFee')}</span>
                      <span>${serviceFee.toFixed(2)}</span>
                    </div>
                  )}
                  {walletCreditApplied > 0 && (
                    <div className="flex items-center justify-between text-success">
                      <span className="flex items-center gap-1.5">
                        <Wallet className="h-3.5 w-3.5" />
                        {t('checkout.summary.walletCredit')}
                      </span>
                      <span>-${walletCreditApplied.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 rounded-xl bg-muted/40 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">{t('checkout.summary.total')}</span>
                    <span className="text-2xl font-semibold text-primary">${grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Capped at 3, compact, inline — not five stacked full-width
                  pills repeating the same "you can trust us" message. */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                {trustIndicators.map(({ icon: Icon, label }) => (
                  <span key={label} className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-success" />
                    {label}
                  </span>
                ))}
              </div>

              <label className="flex cursor-pointer items-start gap-2.5">
                <Checkbox
                  checked={agreedToTerms}
                  onCheckedChange={setAgreedToTerms}
                  className="mt-0.5"
                  aria-label={`${t('checkout.terms.agree')} ${t('checkout.terms.termsLink')} ${t('checkout.terms.and')} ${t('checkout.terms.privacyLink')}`}
                />
                <span className="text-sm text-muted-foreground">
                  {t('checkout.terms.agree')}{' '}
                  <Link
                    href="/terms"
                    onClick={(e) => e.stopPropagation()}
                    className="font-medium text-foreground underline hover:text-primary"
                  >
                    {t('checkout.terms.termsLink')}
                  </Link>{' '}
                  {t('checkout.terms.and')}{' '}
                  <Link
                    href="/privacy"
                    onClick={(e) => e.stopPropagation()}
                    className="font-medium text-foreground underline hover:text-primary"
                  >
                    {t('checkout.terms.privacyLink')}
                  </Link>
                  .
                </span>
              </label>

              <div className="flex gap-3">
                <Button type="button" size="lg" variant="outline" onClick={() => setCurrentStep(2)} className="flex-1">
                  {t('checkout.back')}
                </Button>
                <Button
                  type="button"
                  size="lg"
                  disabled={!selectedAddressId || !selectedShipping || !agreedToTerms || isSubmittingOrder || isPlacingOrder}
                  onClick={handlePlaceOrder}
                  className="flex-[2]"
                >
                  {isSubmittingOrder || isPlacingOrder ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Lock className="mr-2 h-4 w-4" />
                  )}
                  {t('checkout.placeOrder')}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {showMap && (
        <GoogleMapPicker onSelect={handlePinExactLocation} onClose={() => setShowMap(false)} />
      )}
    </>
  );
}

// Horizontal 3-step progress indicator — numbered circle per step,
// checkmark once a step is behind the current one, connecting line colored
// in as each step completes. Clicking a completed step's circle jumps back
// to it (see onStepClick in the caller); the current/future steps aren't
// clickable, since forward navigation only ever happens through each step's
// own validated "Continue" button. Labels are passed in already translated
// (the caller has `t`; this component doesn't need its own hook access).
function CheckoutStepIndicator({
  currentStep,
  steps,
  onStepClick,
}: {
  currentStep: 1 | 2 | 3;
  steps: { step: 1 | 2 | 3; label: string }[];
  onStepClick: (step: 1 | 2 | 3) => void;
}) {
  return (
    <div className="mt-6 flex items-start">
      {steps.map(({ step, label }, index) => {
        const isCompleted = step < currentStep;
        const isActive = step === currentStep;
        return (
          <div key={step} className={cn('flex items-center', index < steps.length - 1 && 'flex-1')}>
            <button
              type="button"
              onClick={() => isCompleted && onStepClick(step)}
              disabled={!isCompleted}
              className={cn('flex flex-col items-center gap-1.5', isCompleted ? 'cursor-pointer' : 'cursor-default')}
            >
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                  isCompleted || isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : step}
              </span>
              <span
                className={cn(
                  'whitespace-nowrap text-xs font-medium',
                  isCompleted || isActive ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {label}
              </span>
            </button>
            {index < steps.length - 1 && (
              <div className={cn('mx-2 h-0.5 flex-1 rounded-full', isCompleted ? 'bg-primary' : 'bg-border')} />
            )}
          </div>
        );
      })}
    </div>
  );
}
