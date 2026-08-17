'use client';

import { useEffect, useMemo, useState } from 'react';
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
  ChevronRight,
  Loader2,
  LucideIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreateOrder } from '@/hooks/useOrders';
import api from '@/lib/api';
import { useAddresses } from '@/hooks/useAddresses';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';
import dynamic from 'next/dynamic';

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

  const [enableLocalPickup, setEnableLocalPickup] = useState(false);
  const [addressShippingOptions, setAddressShippingOptions] = useState<any[]>([]);
  const [isShippingOptionsLoading, setIsShippingOptionsLoading] = useState(true);
  const [shippingOptionsError, setShippingOptionsError] = useState<string | null>(null);
  const [selectedShipping, setSelectedShipping] = useState('');
  const [selectedShippingMeta, setSelectedShippingMeta] = useState<{ courierId?: number; courierServiceId?: number; shippingMethod?: string; shippingZoneId?: number } | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<'COD' | 'BANK_TRANSFER'>('COD');
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
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
  const tax = subtotal * (taxRate / 100);
  const grandTotal = subtotal + shippingCost + tax + serviceFee;

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      toast.error('Please select a delivery address before placing your order.');
      return;
    }

    if (!selectedShipping) {
      toast.error('Please select a shipping method before placing your order.');
      return;
    }

    try {
      if (safeItems.length > 0) {
        try {
          await mergeGuestCart(safeItems as any);
        } catch {
          // Ignore merge issues and continue with the current cart data from the backend.
        }
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
      });

      await clearCart();
      // Multi-seller checkouts create one order per seller — the backend
      // returns an array in that case. Land on the first order; the
      // customer can see the rest under "My Orders".
      const firstOrder = Array.isArray(order) ? order[0] : order;
      router.push(`/orders/success?orderId=${firstOrder?.id}`);
    } catch {
      // The hook already shows the error toast.
    }
  };

  const handleRefreshAddresses = async () => {
    try {
      await refetchAddresses();
    } catch {
      // Ignore refresh errors.
    }
  };

  const MapboxPicker = dynamic(() => import('@/components/maps/MapboxPicker'), { ssr: false });

  const [showMap, setShowMap] = useState(false);

  const handleUseMapLocation = (loc: any) => {
    // Redirect to new address page with prefilled query params (no duplication in DB)
    const params = new URLSearchParams();
    if (loc.street) params.set('street', loc.street);
    if (loc.village) params.set('village', loc.village);
    if (loc.suco) params.set('suco', loc.suco);
    if (loc.postoAdmin) params.set('postoAdmin', loc.postoAdmin);
    if (loc.municipality) params.set('municipality', loc.municipality);
    if (loc.placeName) params.set('placeName', loc.placeName);
    params.set('lat', String(loc.lat));
    params.set('lng', String(loc.lng));
    params.set('redirect', '/checkout');

    setShowMap(false);
    void router.push(`/account/addresses/new?${params.toString()}`);
  };

  if (cartLoading || (addressesLoading && !addresses)) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] px-4 py-8 text-slate-900 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-center rounded-[20px] border border-slate-200 bg-white p-10 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.25)]">
          <div className="flex items-center gap-3 text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            Preparing your checkout...
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] px-4 py-8 text-slate-900 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[20px] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.25)]">
          <h1 className="text-2xl font-semibold">Sign in to continue</h1>
          <p className="mt-3 text-sm text-slate-600">Your cart and saved addresses are loaded from the backend once you sign in.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/login?redirect=/checkout" className="rounded-[14px] bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">
              Sign in
            </Link>
            <Link href="/cart" className="rounded-[14px] border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              Back to cart
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (safeItems.length === 0) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] px-4 py-8 text-slate-900 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[20px] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.25)]">
          <h1 className="text-2xl font-semibold">Your cart is empty</h1>
          <p className="mt-3 text-sm text-slate-600">Choose a product first so the checkout can use your real cart items from the backend.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/" className="rounded-[14px] bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">
              Continue shopping
            </Link>
            <Link href="/cart" className="rounded-[14px] border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              Open cart
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] px-4 py-8 text-slate-900 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 xl:flex-row xl:items-start">
        <section className="w-full xl:w-[70%]">
          <div className="rounded-[20px] border border-slate-200/80 bg-white p-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.25)] sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
              <div className="flex items-center gap-3">
                <Link href="/cart" className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:-translate-y-0.5 hover:shadow-md">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                  <p className="text-sm font-medium text-slate-500">Premium Checkout</p>
                  <h1 className="text-2xl font-semibold tracking-tight">Complete your order</h1>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                <ShieldCheck className="h-4 w-4" />
                Secure Checkout
              </div>
            </div>

            <div className="mt-6 space-y-5">
              <div className="rounded-[18px] border border-slate-200 bg-slate-50/70 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      <h2 className="text-lg font-semibold">Delivery Address</h2>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">Your order will be delivered to the address you select below.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRefreshAddresses}
                    className="text-sm font-medium text-primary transition hover:text-primary/80"
                  >
                    Refresh
                  </button>
                </div>

                {addresses && addresses.length > 0 ? (
                  <div className="mt-5 grid gap-3">
                    {addresses.map((address: any) => {
                      const selected = selectedAddressId === address.id;
                      return (
                        <button
                          key={address.id}
                          type="button"
                          onClick={() => setSelectedAddressId(address.id)}
                          className={`rounded-[16px] border p-4 text-left transition ${selected ? 'border-primary bg-primary/5 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-base font-semibold text-slate-900">{address.label || 'Address'}</p>
                                {address.isPrimary && (
                                  <span className="rounded-full bg-secondary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-secondary">Default</span>
                                )}
                              </div>
                              <p className="mt-2 text-sm text-slate-600">{address.phone}</p>
                              <p className="mt-1 text-sm leading-6 text-slate-600">
                                {address.street ? `${address.street}, ` : ''}
                                {address.village ? `${address.village}, ` : ''}
                                {address.suco ? `${address.suco}, ` : ''}
                                {address.postoAdmin ? `${address.postoAdmin}, ` : ''}
                                {address.municipality}
                              </p>
                              {address.reference && <p className="mt-1 text-sm text-slate-500">Reference: {address.reference}</p>}
                            </div>
                            <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700">
                              {selected ? 'Selected' : 'Select'}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-5 rounded-[16px] border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                    No saved addresses were found. Add one in your account before placing the order.
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href="/account/addresses/new?redirect=/checkout" className="flex items-center gap-2 rounded-full border border-dashed border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary">
                    <Plus className="h-4 w-4" /> Add new address
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowMap(true)}
                    className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <MapPin className="h-4 w-4 text-primary" /> Pick on map
                  </button>
                  <Link href="/account/addresses" className="rounded-full border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                    Manage addresses
                  </Link>
                </div>
              </div>

              <div className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">Your products</h2>
                  <span className="text-sm text-slate-500">{safeItems.length} items</span>
                </div>
                {sellerCount > 1 && (
                  <p className="mt-2 text-sm text-slate-500">
                    Items from {sellerCount} different sellers will be shipped as {sellerCount} separate orders.
                  </p>
                )}

                <div className="mt-4 space-y-4">
                  {safeItems.map((item) => (
                    <div key={`${item.productId}-${item.variantId ?? 'default'}`} className="flex flex-col gap-4 rounded-[16px] border border-slate-200 p-4 sm:flex-row sm:items-center">
                      <img
                        src={item.thumbnail || PLACEHOLDER_IMAGE}
                        alt={item.name}
                        className="h-28 w-full rounded-[14px] object-cover sm:h-24 sm:w-24"
                        onError={(event) => {
                          event.currentTarget.src = PLACEHOLDER_IMAGE;
                        }}
                      />
                      <div className="flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-semibold text-slate-900">{item.name}</p>
                            <p className="mt-1 text-sm text-slate-500">{item.slug}</p>
                          </div>
                          <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">Qty {item.quantity}</div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                          <div>
                            <p className="font-medium text-slate-900">Unit price</p>
                            <p>${(item.price || 0).toFixed(2)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-slate-900">Product total</p>
                            <p className="font-semibold text-slate-900">${((item.price || 0) * (item.quantity || 0)).toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">Shipping method</h2>
                  <span className="text-sm text-slate-500">Live from admin settings</span>
                </div>

                {!selectedAddress ? (
                  <div className="mt-4 rounded-[16px] border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                    Select a delivery address above to see shipping options for your area.
                  </div>
                ) : isShippingOptionsLoading ? (
                  <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading live shipping options...
                  </div>
                ) : shippingOptionsError ? (
                  <div className="mt-4 rounded-[16px] border border-dashed border-red-300 bg-red-50 p-4 text-sm text-red-600">
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
                          className={`rounded-[16px] border p-4 text-left transition ${selected ? 'border-primary bg-primary/5 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`rounded-full p-2 ${selected ? 'bg-primary text-primary-foreground' : 'bg-slate-100 text-slate-700'}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{option.name}</p>
                              <p className="text-sm text-slate-500">{option.subtitle}</p>
                              {option.courierLabel && (
                                <p className="mt-1 text-xs font-medium text-primary">{option.courierLabel}</p>
                              )}
                            </div>
                          </div>
                          <div className="mt-4 flex items-center justify-between text-sm">
                            <span className="font-semibold text-slate-900">${Number(option.cost ?? 0).toFixed(2)}</span>
                            <span className="text-slate-500">{option.eta}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-4 rounded-[16px] border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                    No courier currently delivers to {selectedAddress.municipality || 'this municipality'}. Please choose a different address or contact support.
                  </div>
                )}
              </div>

              <div className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold">Payment method</h2>
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
                          className={`flex items-center justify-between rounded-[16px] border p-4 text-left transition ${selected ? 'border-primary bg-primary/5 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`rounded-full p-2 ${selected ? 'bg-primary text-primary-foreground' : 'bg-slate-100 text-slate-700'}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <span className="font-medium text-slate-900">{method.name}</span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-4 rounded-[16px] border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                    No payment methods are currently available. Please contact support.
                  </div>
                )}

                {selectedPayment === 'COD' && (Boolean(checkoutSettings.minCODOrderAmount) || Boolean(checkoutSettings.maxCODOrderAmount)) && (
                  <p className="mt-3 text-xs text-slate-500">
                    Cash on Delivery is available for orders
                    {checkoutSettings.minCODOrderAmount ? ` from $${checkoutSettings.minCODOrderAmount.toFixed(2)}` : ''}
                    {checkoutSettings.maxCODOrderAmount ? ` up to $${checkoutSettings.maxCODOrderAmount.toFixed(2)}` : ''}.
                  </p>
                )}

                {selectedPayment === 'BANK_TRANSFER' && checkoutSettings.bankName && (
                  <div className="mt-4 rounded-[14px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <p className="font-semibold">Transfer to:</p>
                    <p className="mt-1">{checkoutSettings.bankName} — {checkoutSettings.bankAccountName}</p>
                    {checkoutSettings.bankAccountNumber && <p>Account No: {checkoutSettings.bankAccountNumber}</p>}
                    {checkoutSettings.bankSWIFT && <p>SWIFT: {checkoutSettings.bankSWIFT}</p>}
                    <p className="mt-2 text-amber-800">
                      You&apos;ll confirm your transfer and upload a receipt after placing the order.
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold">Order notes</h2>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Add delivery instructions..."
                  className="mt-3 w-full rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-primary focus:bg-white"
                />
              </div>
            </div>
          </div>
        </section>

        <aside className="w-full xl:w-[30%]">
          <div className="sticky top-6 rounded-[20px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.25)]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Order summary</h2>
              <div className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">Live</div>
            </div>

            <div className="mt-5 space-y-3">
              {safeItems.slice(0, 3).map((item) => (
                <div key={`${item.productId}-${item.variantId ?? 'default'}-summary`} className="flex items-center gap-3 rounded-[14px] border border-slate-200 bg-slate-50 p-3">
                  <img
                    src={item.thumbnail || PLACEHOLDER_IMAGE}
                    alt={item.name}
                    className="h-14 w-14 rounded-[10px] object-cover"
                    onError={(event) => {
                      event.currentTarget.src = PLACEHOLDER_IMAGE;
                    }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">Qty {item.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">${((item.price || 0) * (item.quantity || 0)).toFixed(2)}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-3 border-t border-slate-200 pt-5 text-sm text-slate-600">
              <div className="flex items-center justify-between"><span>Product subtotal</span><span>${subtotal.toFixed(2)}</span></div>
              <div className="flex items-center justify-between"><span>Shipping fee</span><span>${shippingCost.toFixed(2)}</span></div>
              <div className="flex items-center justify-between"><span>Tax</span><span>${tax.toFixed(2)}</span></div>
              <div className="flex items-center justify-between">
                <span>Service fee{sellerCount > 1 ? ` (${sellerCount} sellers)` : ''}</span>
                <span>${serviceFee.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-5 rounded-[16px] bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Grand total</span>
                <span className="text-3xl font-semibold text-primary">${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-5 grid gap-2">
              {trustBadges.map((badge) => (
                <div key={badge} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                  <BadgeCheck className="h-4 w-4 text-green-600" />
                  {badge}
                </div>
              ))}
            </div>

            <button
              type="button"
              disabled={!selectedAddressId || !selectedShipping || isPlacingOrder}
              onClick={handlePlaceOrder}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-[16px] bg-gradient-to-r from-primary to-blue-900 px-4 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPlacingOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} Place Order
            </button>

            <p className="mt-4 text-center text-sm text-slate-500">
              I agree to the <span className="font-medium text-slate-700">Terms & Conditions</span> and <span className="font-medium text-slate-700">Privacy Policy</span>.
            </p>
          </div>
        </aside>
      </div>
      {showMap && (
        <MapboxPicker onSelect={handleUseMapLocation} onClose={() => setShowMap(false)} />
      )}
    </div>
  );
}