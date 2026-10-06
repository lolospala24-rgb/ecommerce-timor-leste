'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
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
  Loader2,
  LucideIcon,
  Check,
  Store,
  RotateCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreateOrder } from '@/hooks/useOrders';
import api from '@/lib/api';
import { useAddresses } from '@/hooks/useAddresses';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';
import { useCartSelectionStore } from '@/stores/cartSelectionStore';
import { useCouponStore } from '@/stores/couponStore';
import { getCartItemKey } from '@/lib/cart';
import { useValidateCoupon } from '@/hooks/useCoupons';
import { useReferralSummary } from '@/hooks/useReferral';
import dynamic from 'next/dynamic';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { trackBeginCheckout, trackPurchase } from '@/lib/analytics';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { CheckoutStepper, type CheckoutStep } from './components/CheckoutStepper';
import { CheckoutBottomBar } from './components/CheckoutBottomBar';
import { AddressCard } from './components/AddressCard';
import { ShippingOptionCard } from './components/ShippingOptionCard';
import { PaymentMethodCard } from './components/PaymentMethodCard';
import { OrderSummaryCard } from './components/OrderSummaryCard';
import { CostBreakdown } from './components/CostBreakdown';

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
  const cartSelection = useCartSelectionStore();
  const { addresses, isLoading: addressesLoading, refetch: refetchAddresses } = useAddresses();
  const { mutateAsync: createOrder, isPending: isPlacingOrder } = useCreateOrder();
  const { appliedCoupon, setAppliedCoupon, clearCoupon } = useCouponStore();
  const { data: referralSummary } = useReferralSummary();
  const validateCoupon = useValidateCoupon();

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
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [promoMessage, setPromoMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  // 4-step checkout flow: Enderesu → Haruka → Pagamentu → Revee. Purely a
  // UI concern — every field/handler below is unchanged from the single-
  // page layout, just shown one step at a time. Not persisted to the URL;
  // a refresh mid-checkout starts back at step 1, same as the previous
  // layout always scrolled to top on reload.
  const [currentStep, setCurrentStep] = useState<CheckoutStep>(1);
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

  const [isSettingsLoading, setIsSettingsLoading] = useState(true);

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
      setIsSettingsLoading(false);
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

  // Only the items selected on the cart page go to checkout — but only
  // when the selection store actually has fresh data for the current cart
  // (every current item key is "known" to it). Any path that lands here
  // without going through cart selection first — Buy Now from Product
  // Detail, a direct link, a newly-merged guest cart — falls back to the
  // full cart, exactly like before this feature existed.
  const safeItems = useMemo(() => {
    const all = Array.isArray(items) ? items : [];
    const allKeys = all.map(getCartItemKey);
    const isSelectionFresh = allKeys.every((key) => cartSelection.knownKeys.includes(key));
    const selectedSet = new Set(cartSelection.selectedKeys);
    const hasAnySelected = allKeys.some((key) => selectedSet.has(key));
    if (isSelectionFresh && hasAnySelected) {
      return all.filter((item) => selectedSet.has(getCartItemKey(item)));
    }
    return all;
  }, [items, cartSelection.knownKeys, cartSelection.selectedKeys]);
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

  // Real per-product discount (originalPrice vs the price actually charged
  // — see CartItem's own comment in types/cart.types.ts), summed across the
  // cart. Independent of any coupon — shown in Step 4's savings badge
  // alongside (not instead of) the coupon discount row.
  const productSavings = useMemo(
    () =>
      safeItems.reduce(
        (sum, item) => sum + Math.max((item.originalPrice ?? item.price) - item.price, 0) * (item.quantity || 0),
        0,
      ),
    [safeItems],
  );

  // Step 2's per-seller package cards — same safeItems, just grouped for
  // display (no new data).
  const packagesBySeller = useMemo(() => {
    const map = new Map<string, { sellerName: string; items: typeof safeItems }>();
    for (const item of safeItems) {
      const key = String(item.sellerId ?? 'unknown');
      if (!map.has(key)) map.set(key, { sellerName: item.sellerName || 'Loja', items: [] });
      map.get(key)!.items.push(item);
    }
    return Array.from(map.values());
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

  const handleContinueFromPayment = () => {
    setCurrentStep(4);
  };

  const handleApplyPromo = async () => {
    const code = promoInput.trim();
    if (!code) return;
    setPromoMessage(null);
    try {
      const result = await validateCoupon.mutateAsync({ code, subtotal });
      setAppliedCoupon({
        code: result.code,
        discountType: result.discountType,
        discountValue: result.discountValue,
        discountAmount: result.discountAmount,
      });
      setPromoInput('');
      setPromoMessage({ type: 'success', text: t('checkout.payment.promoSuccess', { code: result.code }) });
    } catch (error: any) {
      setPromoMessage({ type: 'error', text: error.response?.data?.message || t('checkout.payment.promoError') });
    }
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

  // Step-aware back navigation — the app bar back button and (via the
  // popstate listener below) the hardware/browser back button both move
  // one step backward instead of leaving the page, matching the new
  // design's explicit "Hardware back and the app bar back button go to the
  // previous step" requirement.
  const handleAppBarBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as CheckoutStep);
    } else {
      router.push('/cart');
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as CheckoutStep) : prev));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (currentStep > 1) {
      window.history.pushState({ checkoutStep: currentStep }, '');
    }
    // Only the forward transition should push a new entry — jumping back
    // via the stepper/app-bar already pops or re-sets state, it shouldn't
    // also push a fresh one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  const selectedShippingOption = shippingOptions.find((option) => option.id === selectedShipping);
  const selectedPaymentMethod = availablePaymentMethods.find((method) => method.id === selectedPayment);

  const primaryAction = (() => {
    switch (currentStep) {
      case 1:
        return {
          label: t('checkout.address.continueButton'),
          onClick: handleContinueFromAddress,
          disabled: !selectedAddressId,
          totalLabel: t('checkout.address.subtotal', { count: safeItems.length }),
          amount: subtotal,
        };
      case 2:
        return {
          label: t('checkout.shipping.continueButton'),
          onClick: handleContinueFromShipping,
          disabled: !selectedShipping,
          totalLabel: t('checkout.summary.total'),
          amount: subtotal + shippingCost,
        };
      case 3:
        return {
          label: t('checkout.payment.continueButton'),
          onClick: handleContinueFromPayment,
          disabled: availablePaymentMethods.length === 0,
          totalLabel: t('checkout.summary.total'),
          amount: grandTotal,
        };
      case 4:
      default:
        return {
          label: t('checkout.review.placeOrderButton'),
          onClick: handlePlaceOrder,
          disabled: !agreedToTerms || isSubmittingOrder || isPlacingOrder,
          loading: isSubmittingOrder || isPlacingOrder,
          totalLabel: t('checkout.summary.total'),
          amount: grandTotal,
        };
    }
  })();

  if (cartLoading || (addressesLoading && !addresses)) {
    return (
      <div className="flex items-center justify-center p-10">
        <div className="flex items-center gap-3 text-[#56635B]">
          <Loader2 className="h-5 w-5 animate-spin" />
          {t('checkout.preparing')}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-xl p-8">
        <h1 className="text-xl font-extrabold text-[#142019]">{t('checkout.signInTitle')}</h1>
        <p className="mt-3 text-sm text-[#56635B]">{t('checkout.signInDescription')}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/login?redirect=/checkout" className="rounded-2xl bg-[#17703F] px-5 py-3 text-sm font-bold text-white">
            {t('checkout.signIn')}
          </Link>
          <Link href="/cart" className="rounded-2xl border border-[#DDE3DE] px-5 py-3 text-sm font-bold text-[#142019]">
            {t('checkout.backToCart')}
          </Link>
        </div>
      </div>
    );
  }

  if (safeItems.length === 0) {
    return (
      <div className="mx-auto max-w-xl p-8">
        <h1 className="text-xl font-extrabold text-[#142019]">{t('checkout.emptyCartTitle')}</h1>
        <p className="mt-3 text-sm text-[#56635B]">{t('checkout.emptyCartDescription')}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/" className="rounded-2xl bg-[#17703F] px-5 py-3 text-sm font-bold text-white">
            {t('checkout.continueShopping')}
          </Link>
          <Link href="/cart" className="rounded-2xl border border-[#DDE3DE] px-5 py-3 text-sm font-bold text-[#142019]">
            {t('checkout.openCart')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-[#F4F6F3] pb-24 min-[1000px]:pb-6">
        {/* App bar */}
        <div className="flex items-center gap-3 border-b border-[#EEF1EE] bg-white px-4 py-3">
          <button
            type="button"
            onClick={handleAppBarBack}
            aria-label={t('checkout.back')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F4F6F3] text-[#142019]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-[19px] font-extrabold text-[#142019]">{t('checkout.title')}</h1>
        </div>

        <CheckoutStepper
          currentStep={currentStep}
          steps={[
            { step: 1, label: t('checkout.step.address') },
            { step: 2, label: t('checkout.step.shipping') },
            { step: 3, label: t('checkout.step.payment') },
            { step: 4, label: t('checkout.step.review') },
          ]}
          onStepClick={(step) => {
            if (step < currentStep) setCurrentStep(step);
          }}
        />

        <div className="mx-auto w-full px-4 py-5 min-[600px]:max-w-[720px] min-[1000px]:max-w-[1000px]">
          <div className="min-[1000px]:grid min-[1000px]:grid-cols-[1fr_360px] min-[1000px]:items-start min-[1000px]:gap-8">
            {/* ============ Step content ============ */}
            <div className="space-y-4">
              {/* ============ STEP 1 — Enderesu ============ */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[17px] font-extrabold text-[#142019]">{t('checkout.address.heading')}</h2>
                    <button
                      type="button"
                      onClick={handleRefreshAddresses}
                      aria-label={t('checkout.address.refresh')}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-[#56635B]"
                    >
                      <RotateCw className="h-4 w-4" />
                    </button>
                  </div>

                  {addressesLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-28 w-full rounded-2xl" />
                      <Skeleton className="h-28 w-full rounded-2xl" />
                    </div>
                  ) : addresses && addresses.length > 0 ? (
                    <div className="space-y-3" role="radiogroup">
                      {addresses.map((address: any) => (
                        <AddressCard
                          key={address.id}
                          address={address}
                          selected={selectedAddressId === address.id}
                          onSelect={() => setSelectedAddressId(address.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[#9FB5A6] bg-white p-6 text-center text-sm text-[#56635B]">
                      {t('checkout.address.empty')}
                    </div>
                  )}

                  <Link
                    href="/account/addresses/new?redirect=/checkout"
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#9FB5A6] bg-white px-4 py-3 text-sm font-semibold text-[#17703F]"
                  >
                    <Plus className="h-4 w-4" /> {t('checkout.address.addNew')}
                  </Link>

                  <div>
                    <Label htmlFor="courier-notes" className="text-sm font-semibold text-[#142019]">
                      {t('checkout.address.notesLabel')}
                    </Label>
                    <Textarea
                      id="courier-notes"
                      rows={3}
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder={t('checkout.address.notesPlaceholder')}
                      maxLength={NOTES_MAX_LENGTH}
                      className="mt-2 rounded-2xl border-[#DDE3DE]"
                    />
                  </div>

                  {/* Exact Delivery Location — deliberately a separate card.
                      Copy is explicit that this never changes the address or
                      shipping fee, to head off the exact confusion this
                      feature used to cause when the map redirected into "Add
                      new address" instead. Kept on this step (not in the new
                      4-step spec, which doesn't mention it at all) since it's
                      an address-adjacent refinement with no other home. */}
                  {pinLocation ? (
                    <div className="rounded-2xl border border-[#17703F]/30 bg-[#E3F1E8]/40 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-[#17703F]" />
                            <h3 className="text-[14px] font-bold text-[#142019]">{t('checkout.exactLocation.title')}</h3>
                          </div>
                          <p className="mt-1 text-[13px] text-[#56635B]">
                            {pinLocation.placeName || `${pinLocation.lat.toFixed(5)}, ${pinLocation.lng.toFixed(5)}`}
                          </p>
                          <p className="mt-1.5 text-[12px] text-[#56635B]">{t('checkout.exactLocation.description')}</p>
                        </div>
                        <button type="button" onClick={handleRemovePin} className="shrink-0 text-[13px] font-semibold text-[#93330B]">
                          {t('checkout.exactLocation.remove')}
                        </button>
                      </div>

                      {pinMunicipalityMismatch && (
                        <div className="mt-3 rounded-xl bg-[#FDEEE6] p-3 text-[12px] text-[#93330B]">
                          {t('checkout.exactLocation.mismatch', {
                            pinMunicipality: pinLocation.municipality || '',
                            addressMunicipality: selectedAddress?.municipality || '',
                          })}
                        </div>
                      )}

                      <div className="mt-3 space-y-1.5">
                        <Label htmlFor="pin-reference" className="text-[12px] font-medium text-[#56635B]">
                          {t('checkout.exactLocation.noteLabel')}
                        </Label>
                        <Input
                          id="pin-reference"
                          type="text"
                          value={pinReference}
                          onChange={(e) => setPinReference(e.target.value)}
                          placeholder={t('checkout.exactLocation.notePlaceholder')}
                          maxLength={500}
                          className="h-9 rounded-xl border-[#DDE3DE]"
                        />
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowMap(true)}
                      className="flex min-h-11 items-center gap-2 rounded-full border border-[#DDE3DE] bg-white px-3.5 py-2 text-sm font-medium text-[#142019]"
                    >
                      <MapPin className="h-4 w-4 text-[#17703F]" /> {t('checkout.address.pinExactLocation')}
                    </button>
                  )}
                </div>
              )}

              {/* ============ STEP 2 — Haruka ============ */}
              {currentStep === 2 && selectedAddress && (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-[#DDE3DE] bg-white p-4 text-left"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E3F1E8] text-[#17703F]">
                      <MapPin className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-[#142019]">
                      {t('checkout.shipping.addressSummary', {
                        label: selectedAddress.label || t('checkout.address.fallbackLabel'),
                        name: selectedAddress.recipientName || selectedAddress.municipality,
                      })}
                    </span>
                    <span className="shrink-0 text-[13px] font-semibold text-[#17703F]">{t('checkout.address.change')}</span>
                  </button>

                  {packagesBySeller.map((pkg) => (
                    <div key={pkg.sellerName} className="rounded-2xl border border-[#DDE3DE] bg-white p-4">
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-[#56635B]" />
                        <span className="text-[13px] font-bold text-[#142019]">{pkg.sellerName}</span>
                      </div>
                      <div className="mt-3 space-y-3">
                        {pkg.items.map((item) => (
                          <div key={`${item.productId}-${item.variantId ?? 'default'}`} className="flex items-center gap-3">
                            <div className="relative h-[60px] w-[60px] shrink-0 overflow-hidden rounded-xl bg-[#F4F6F3]">
                              {item.thumbnail && <Image src={item.thumbnail} alt={item.name} fill className="object-cover" sizes="60px" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[14px] font-medium text-[#142019]">{item.name}</p>
                              <p className="text-[13px] text-[#56635B]">×{item.quantity}</p>
                            </div>
                            <span className="shrink-0 text-[14px] font-bold text-[#142019]">${((item.price || 0) * (item.quantity || 0)).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <h2 className="text-[17px] font-extrabold text-[#142019]">{t('checkout.shipping.heading')}</h2>

                  {isShippingOptionsLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-16 w-full rounded-2xl" />
                      <Skeleton className="h-16 w-full rounded-2xl" />
                    </div>
                  ) : shippingOptionsError ? (
                    <div className="rounded-2xl border border-dashed border-[#9FB5A6] bg-white p-4 text-sm text-[#93330B]">{shippingOptionsError}</div>
                  ) : shippingOptions.length > 0 ? (
                    <div className="space-y-3" role="radiogroup">
                      {shippingOptions.map((option) => (
                        <ShippingOptionCard
                          key={option.id}
                          name={option.name}
                          subtitle={option.eta}
                          cost={option.cost}
                          icon={option.icon}
                          selected={option.id === selectedShipping}
                          onSelect={() => {
                            setSelectedShipping(option.id);
                            setSelectedShippingMeta({
                              courierId: option.courierId,
                              courierServiceId: option.courierServiceId,
                              shippingMethod: option.shippingMethod ?? option.id,
                              shippingZoneId: option.shippingZoneId,
                            });
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[#9FB5A6] bg-white p-4 text-sm text-[#56635B]">
                      {t('checkout.shipping.noCourier', { municipality: selectedAddress.municipality || t('checkout.shipping.thisMunicipality') })}
                    </div>
                  )}
                </div>
              )}

              {/* ============ STEP 3 — Pagamentu ============ */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <h2 className="text-[17px] font-extrabold text-[#142019]">{t('checkout.payment.heading')}</h2>

                  {isSettingsLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-20 w-full rounded-2xl" />
                      <Skeleton className="h-20 w-full rounded-2xl" />
                    </div>
                  ) : availablePaymentMethods.length > 0 ? (
                    <div className="space-y-3" role="radiogroup">
                      {availablePaymentMethods.map((method) => (
                        <PaymentMethodCard
                          key={method.id}
                          name={method.name}
                          description={method.description}
                          icon={method.icon}
                          selected={method.id === selectedPayment}
                          onSelect={() => setSelectedPayment(method.id as 'COD' | 'BANK_TRANSFER')}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[#9FB5A6] bg-white p-4 text-sm text-[#56635B]">
                      {t('checkout.payment.noMethods')}
                    </div>
                  )}

                  {selectedPayment === 'COD' && (
                    <div className="flex items-start gap-2.5 rounded-2xl bg-[#E3F1E8] p-4 text-[13px] text-[#0F5530]">
                      <Wallet className="mt-0.5 h-4 w-4 shrink-0" />
                      <div className="space-y-1">
                        <p>{t('checkout.payment.infoCod', { amount: `$${grandTotal.toFixed(2)}` })}</p>
                        {(Boolean(checkoutSettings.minCODOrderAmount) || Boolean(checkoutSettings.maxCODOrderAmount)) && (
                          <p>
                            {t('checkout.payment.codLimits', {
                              from: checkoutSettings.minCODOrderAmount ? t('checkout.payment.codLimitsFrom', { amount: checkoutSettings.minCODOrderAmount.toFixed(2) }) : '',
                              upTo: checkoutSettings.maxCODOrderAmount ? t('checkout.payment.codLimitsUpTo', { amount: checkoutSettings.maxCODOrderAmount.toFixed(2) }) : '',
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedPayment === 'BANK_TRANSFER' && checkoutSettings.bankName && (
                    <div className="space-y-1 rounded-2xl bg-[#E3F1E8] p-4 text-[13px] text-[#0F5530]">
                      <p className="font-semibold">{t('checkout.payment.transferTo')}</p>
                      <p>{checkoutSettings.bankName} — {checkoutSettings.bankAccountName}</p>
                      {checkoutSettings.bankAccountNumber && <p>{t('checkout.payment.accountNo', { number: checkoutSettings.bankAccountNumber })}</p>}
                      {checkoutSettings.bankSWIFT && <p>{t('checkout.payment.swift', { code: checkoutSettings.bankSWIFT })}</p>}
                      <p className="pt-1">{t('checkout.payment.transferNote')}</p>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="promo-code" className="text-sm font-semibold text-[#142019]">
                      {t('checkout.payment.promoLabel')}
                    </Label>
                    <div className="mt-2 flex gap-2">
                      <Input
                        id="promo-code"
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value)}
                        placeholder={t('checkout.payment.promoPlaceholder')}
                        className="h-11 flex-1 rounded-2xl border-[#DDE3DE]"
                      />
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        disabled={validateCoupon.isPending || !promoInput.trim()}
                        className="shrink-0 rounded-2xl border border-[#17703F] px-4 text-sm font-semibold text-[#17703F] disabled:opacity-50"
                      >
                        {validateCoupon.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('checkout.payment.promoApply')}
                      </button>
                    </div>
                    {promoMessage && (
                      <p className={cn('mt-1.5 text-[13px]', promoMessage.type === 'success' ? 'text-[#17703F]' : 'text-[#93330B]')}>
                        {promoMessage.text}
                      </p>
                    )}
                    {appliedCoupon && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-[#17703F]">
                        <Check className="h-3.5 w-3.5" /> {t('checkout.summary.coupon', { code: appliedCoupon.code })}
                        <button type="button" onClick={clearCoupon} className="ml-1 underline">
                          {t('checkout.exactLocation.remove')}
                        </button>
                      </p>
                    )}
                  </div>

                  {walletBalance > 0 && (
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#DDE3DE] bg-white p-4">
                      <div className="flex items-center gap-2.5">
                        <Wallet className="h-5 w-5 text-[#17703F]" />
                        <div>
                          <p className="text-sm font-semibold text-[#142019]">{t('checkout.wallet.title')}</p>
                          <p className="text-xs text-[#56635B]">{t('checkout.wallet.available', { amount: walletBalance.toFixed(2) })}</p>
                        </div>
                      </div>
                      <Switch checked={useWalletCredit} onCheckedChange={setUseWalletCredit} />
                    </div>
                  )}
                </div>
              )}

              {/* ============ STEP 4 — Revee ============ */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <OrderSummaryCard
                    rows={[
                      {
                        icon: MapPin,
                        label: t('checkout.step.address'),
                        value: selectedAddress
                          ? t('checkout.shipping.addressSummary', {
                              label: selectedAddress.label || t('checkout.address.fallbackLabel'),
                              name: selectedAddress.suco || selectedAddress.municipality,
                            })
                          : '',
                        onChange: () => setCurrentStep(1),
                      },
                      {
                        icon: Truck,
                        label: t('checkout.step.shipping'),
                        value: selectedShippingOption ? `${selectedShippingOption.name}, ${selectedShippingOption.eta}` : '',
                        onChange: () => setCurrentStep(2),
                      },
                      {
                        icon: selectedPaymentMethod?.icon ?? Wallet,
                        label: t('checkout.step.payment'),
                        value: selectedPaymentMethod?.name ?? '',
                        onChange: () => setCurrentStep(3),
                      },
                    ]}
                  />

                  <div className="space-y-3 rounded-2xl border border-[#DDE3DE] bg-white p-4">
                    {safeItems.map((item) => (
                      <div key={`${item.productId}-${item.variantId ?? 'default'}`} className="flex items-center gap-3">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#F4F6F3]">
                          {item.thumbnail && <Image src={item.thumbnail} alt={item.name} fill className="object-cover" sizes="56px" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-medium text-[#142019]">{item.name}</p>
                          <p className="text-[13px] text-[#56635B]">{item.sellerName ?? ''}, ×{item.quantity}</p>
                        </div>
                        <span className="shrink-0 text-[14px] font-bold text-[#142019]">${((item.price || 0) * (item.quantity || 0)).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-[#DDE3DE] bg-white p-4">
                    <CostBreakdown
                      subtotal={subtotal}
                      shippingCost={shippingCost}
                      tax={tax}
                      serviceFee={serviceFee}
                      sellerCount={sellerCount}
                      discountAmount={discountAmount}
                      couponCode={appliedCoupon?.code}
                      walletCreditApplied={walletCreditApplied}
                      grandTotal={grandTotal}
                      productSavings={productSavings}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 text-[12px] text-[#56635B]">
                    {trustIndicators.map(({ icon: Icon, label }) => (
                      <span key={label} className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5 text-[#17703F]" />
                        {label}
                      </span>
                    ))}
                  </div>

                  <label className="flex cursor-pointer items-start gap-2.5 px-1">
                    <Checkbox
                      checked={agreedToTerms}
                      onCheckedChange={setAgreedToTerms}
                      className="mt-0.5"
                      aria-label={`${t('checkout.review.termsPrefix')} ${t('checkout.review.termsLinkLabel')} ${t('checkout.review.termsSuffix')}`}
                    />
                    <span className="text-[13px] text-[#56635B]">
                      {t('checkout.review.termsPrefix')}{' '}
                      <Link href="/terms" onClick={(e) => e.stopPropagation()} className="font-semibold text-[#17703F] underline">
                        {t('checkout.review.termsLinkLabel')}
                      </Link>{' '}
                      {t('checkout.review.termsSuffix')}
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* ============ Desktop sticky sidebar (≥1000px) ============ */}
            <div className="hidden min-[1000px]:block">
              <div className="sticky top-6 space-y-4">
                <div className="max-h-[320px] space-y-3 overflow-y-auto rounded-2xl border border-[#DDE3DE] bg-white p-4" data-lenis-prevent>
                  {safeItems.map((item) => (
                    <div key={`sidebar-${item.productId}-${item.variantId ?? 'default'}`} className="flex items-center gap-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#F4F6F3]">
                        {item.thumbnail && <Image src={item.thumbnail} alt={item.name} fill className="object-cover" sizes="48px" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-[#142019]">{item.name}</p>
                        <p className="text-[12px] text-[#56635B]">×{item.quantity}</p>
                      </div>
                      <span className="shrink-0 text-[13px] font-bold text-[#142019]">${((item.price || 0) * (item.quantity || 0)).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-[#DDE3DE] bg-white p-4">
                  <CostBreakdown
                    subtotal={subtotal}
                    shippingCost={shippingCost}
                    tax={tax}
                    serviceFee={serviceFee}
                    sellerCount={sellerCount}
                    discountAmount={discountAmount}
                    couponCode={appliedCoupon?.code}
                    walletCreditApplied={walletCreditApplied}
                    grandTotal={grandTotal}
                    productSavings={productSavings}
                  />
                </div>

                <button
                  type="button"
                  onClick={primaryAction.onClick}
                  disabled={primaryAction.disabled || primaryAction.loading}
                  className="flex h-[50px] w-full items-center justify-center rounded-2xl bg-[#17703F] text-[15px] font-bold text-white disabled:bg-[#DDE3DE] disabled:text-[#9AA59C]"
                >
                  {primaryAction.loading ? <Loader2 className="h-5 w-5 animate-spin" /> : primaryAction.label}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile/tablet sticky bottom bar — hidden once the desktop
            two-column layout (with its own always-visible button) takes
            over at ≥1000px. */}
        <CheckoutBottomBar
          className="fixed inset-x-0 bottom-0 z-30 min-[1000px]:hidden"
          totalLabel={primaryAction.totalLabel}
          amount={primaryAction.amount}
          buttonLabel={primaryAction.label}
          onButtonClick={primaryAction.onClick}
          disabled={primaryAction.disabled}
          loading={primaryAction.loading}
        />
      </div>

      {showMap && (
        <GoogleMapPicker onSelect={handlePinExactLocation} onClose={() => setShowMap(false)} />
      )}
    </>
  );
}
