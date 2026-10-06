'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { useCouponStore } from '@/stores/couponStore';
import { useCartSelectionStore } from '@/stores/cartSelectionStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { CartSkeleton } from '@/components/cart/CartSkeleton';
import { EmptyCartView } from '@/components/cart/EmptyCartView';
import { SellerCartGroup } from '@/components/cart/SellerCartGroup';
import { PromoRow } from '@/components/cart/PromoRow';
import { CartBottomBar } from '@/components/cart/CartBottomBar';
import { ArrowLeft, Trash2, TicketPercent, Loader2, AlertCircle, Truck } from 'lucide-react';
import toast, { type Toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { getCartItemKey } from '@/lib/cart';
import { useShippingSettings } from '@/hooks/useShippingSettings';
import { useValidateCoupon, useAvailableCoupons, type AvailableCoupon } from '@/hooks/useCoupons';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import type { CartItem } from '@/types/cart.types';

export default function CartPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const { items, isLoading, error, addItem, removeItem, updateQuantity, clearCart, fetchCart } = useCartStore();
  const { data: shippingSettings } = useShippingSettings();
  const { appliedCoupon, setAppliedCoupon, clearCoupon } = useCouponStore();
  const validateCoupon = useValidateCoupon();
  const selection = useCartSelectionStore();
  const [couponInput, setCouponInput] = useState('');
  const [isClearCartDialogOpen, setIsClearCartDialogOpen] = useState(false);
  const [isClearingCart, setIsClearingCart] = useState(false);
  const [updatingKeys, setUpdatingKeys] = useState<Set<string>>(new Set());
  const [removeTarget, setRemoveTarget] = useState<CartItem | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    }
  }, [isAuthenticated, fetchCart]);

  const safeItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);

  // Newly-seen cart lines start selected by default; removed lines are
  // dropped from the selection store so it never grows unbounded.
  useEffect(() => {
    selection.syncKeys(safeItems.map(getCartItemKey));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeItems]);

  useEffect(() => {
    if (!isLoading && safeItems.length === 0 && appliedCoupon) {
      clearCoupon();
    }
  }, [isLoading, safeItems.length, appliedCoupon, clearCoupon]);

  const groups = useMemo(() => {
    const map = new Map<string, { sellerName: string; items: CartItem[] }>();
    for (const item of safeItems) {
      const key = String(item.sellerId ?? 'unknown');
      if (!map.has(key)) map.set(key, { sellerName: item.sellerName || 'Loja', items: [] });
      map.get(key)!.items.push(item);
    }
    return Array.from(map.values());
  }, [safeItems]);

  const selectableKeys = useMemo(
    () => safeItems.filter((i) => i.stock > 0).map(getCartItemKey),
    [safeItems],
  );
  const allSelected = selectableKeys.length > 0 && selectableKeys.every((k) => selection.isSelected(k));

  const selectedItems = safeItems.filter((i) => i.stock > 0 && selection.isSelected(getCartItemKey(i)));
  const selectedSubtotal = selectedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const selectedSavings = selectedItems.reduce(
    (sum, i) => sum + Math.max((i.originalPrice ?? i.price) - i.price, 0) * i.quantity,
    0,
  );
  const checkoutCount = selectedItems.reduce((sum, i) => sum + i.quantity, 0);

  const handleQuantityChange = async (item: CartItem, quantity: number) => {
    const key = getCartItemKey(item);
    setUpdatingKeys((prev) => new Set(prev).add(key));
    try {
      await updateQuantity(item.productId, quantity, item.variantId);
    } catch {
      // Error already toasted in the store; the row simply reverts to its
      // last-fetched value since nothing was optimistically changed.
    } finally {
      setUpdatingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleRemoveRequest = (item: CartItem) => setRemoveTarget(item);

  const handleUndoRemove = async (item: CartItem) => {
    try {
      await addItem(
        { id: item.productId, name: item.name, price: item.price },
        item.quantity,
        item.variantId ? { id: item.variantId } : null,
      );
    } catch {
      // addItem already toasts its own error.
    }
  };

  const handleConfirmRemove = async () => {
    if (!removeTarget) return;
    const item = removeTarget;
    setIsRemoving(true);
    try {
      await removeItem(item.productId, item.variantId);
      setRemoveTarget(null);
      toast((toastInstance: Toast) => (
        <div className="flex items-center gap-3">
          <span>{t('cart.removedMessage')}</span>
          <button
            type="button"
            onClick={() => {
              handleUndoRemove(item);
              toast.dismiss(toastInstance.id);
            }}
            className="font-semibold text-[#17703F]"
          >
            {t('cart.undo')}
          </button>
        </div>
      ));
    } catch {
      // Error already toasted in the store.
    } finally {
      setIsRemoving(false);
    }
  };

  const handleClearCart = async () => {
    setIsClearingCart(true);
    try {
      await clearCart();
      setIsClearCartDialogOpen(false);
    } finally {
      setIsClearingCart(false);
    }
  };

  const handleApplyCoupon = async (codeOverride?: string) => {
    const code = (codeOverride ?? couponInput).trim();
    if (!code) {
      toast.error('Please enter a coupon code');
      return;
    }
    try {
      const result = await validateCoupon.mutateAsync({ code, subtotal: selectedSubtotal });
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

  const handleRemoveCoupon = () => clearCoupon();

  const handleCheckout = () => {
    if (!isAuthenticated) {
      toast.error('Please login to checkout');
      router.push('/login?redirect=/checkout');
      return;
    }
    if (checkoutCount === 0) return;
    router.push('/checkout');
  };

  const freeShippingEnabled = !!shippingSettings?.enableFreeShipping;
  const freeShippingThreshold = shippingSettings?.freeShippingThreshold ?? 0;
  const qualifiesForFreeShipping =
    freeShippingEnabled && freeShippingThreshold > 0 && selectedSubtotal >= freeShippingThreshold;
  const amountToFreeShipping = freeShippingThreshold - selectedSubtotal;

  if (safeItems.length === 0 && error && !isLoading) {
    return (
      <EmptyState
        title="Couldn't load your cart"
        description={error}
        icon={<AlertCircle className="h-10 w-10 text-muted-foreground" />}
        action={{ label: 'Try again', onClick: () => fetchCart() }}
      />
    );
  }

  const promoContent = (
    <div className="space-y-4 pb-2">
      {appliedCoupon ? (
        <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-3 py-2">
          <div className="flex items-center gap-2 text-sm">
            <TicketPercent className="h-4 w-4 text-green-600" />
            <span className="font-medium text-green-700">{appliedCoupon.code}</span>
            <span className="text-xs text-green-600">
              {appliedCoupon.discountType === 'PERCENTAGE' ? `-${appliedCoupon.discountValue}%` : `-$${appliedCoupon.discountValue.toFixed(2)}`}
            </span>
          </div>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive" onClick={handleRemoveCoupon}>
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
          <Button type="button" variant="outline" size="sm" onClick={() => handleApplyCoupon()} disabled={validateCoupon.isPending} className="h-9">
            {validateCoupon.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
          </Button>
        </div>
      )}

      {!appliedCoupon && (
        <AvailableCouponsList subtotal={selectedSubtotal} onUse={(code) => handleApplyCoupon(code)} isApplying={validateCoupon.isPending} />
      )}

      {freeShippingEnabled && freeShippingThreshold > 0 && !qualifiesForFreeShipping && selectedSubtotal > 0 && (
        <div className="space-y-1.5 rounded-xl bg-[#F4F6F3] p-3">
          <div className="flex items-center gap-1.5 text-xs text-[#56635B]">
            <Truck className="h-3.5 w-3.5" />
            <span>Add ${amountToFreeShipping.toFixed(2)} more for free shipping</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#DDE3DE]">
            <div
              className="h-full rounded-full bg-[#17703F]"
              style={{ width: `${Math.min((selectedSubtotal / freeShippingThreshold) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );

  const summarySidebar = (
    <div className="space-y-3">
      <div className="rounded-2xl border border-[#DDE3DE] bg-white p-4">
        <p className="text-[13px] text-[#56635B]">{t('cart.checkout', { count: checkoutCount })}</p>
        <p className="mt-1 text-[22px] font-extrabold text-[#142019]">${selectedSubtotal.toFixed(2)}</p>
        {selectedSavings > 0 && (
          <p className="mt-0.5 text-[13px] font-semibold text-[#93330B]">{t('cart.savings', { amount: `$${selectedSavings.toFixed(2)}` })}</p>
        )}
      </div>
      <PromoRow summary={appliedCoupon?.code}>{promoContent}</PromoRow>
      <button
        type="button"
        onClick={handleCheckout}
        disabled={checkoutCount === 0}
        className="flex h-[50px] w-full items-center justify-center rounded-2xl bg-[#17703F] text-[15px] font-bold text-white disabled:bg-[#DDE3DE] disabled:text-[#56635B]"
      >
        {t('cart.checkout', { count: checkoutCount })}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F6F3] pb-24 min-[1000px]:pb-6">
      <div className="flex items-center gap-3 border-b border-[#EEF1EE] bg-white px-4 py-3">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label={t('cart.back')}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F4F6F3] text-[#142019]"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[19px] font-extrabold text-[#142019]">
          {t('cart.title')} {safeItems.length > 0 && <span className="font-medium text-[#56635B]">({safeItems.length})</span>}
        </h1>
        {safeItems.length > 0 && (
          <button
            type="button"
            onClick={() => setIsClearCartDialogOpen(true)}
            aria-label="Clear cart"
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-full text-[#56635B]"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mx-auto w-full px-4 py-5 min-[600px]:max-w-[720px] min-[1000px]:max-w-[1000px]">
        {isLoading && safeItems.length === 0 ? (
          <CartSkeleton />
        ) : safeItems.length === 0 ? (
          <EmptyCartView />
        ) : (
          <div className="min-[1000px]:grid min-[1000px]:grid-cols-[1fr_360px] min-[1000px]:items-start min-[1000px]:gap-8">
            <div className="space-y-3">
              {groups.map((group) => (
                <SellerCartGroup
                  key={group.sellerName}
                  sellerName={group.sellerName}
                  items={group.items}
                  isItemSelected={(key) => selection.isSelected(key)}
                  onToggleItem={(key) => selection.toggle(key)}
                  onToggleSeller={(keys, selected) => selection.setMany(keys, selected)}
                  onQuantityChange={handleQuantityChange}
                  onRemove={handleRemoveRequest}
                  isRowUpdating={(key) => updatingKeys.has(key)}
                />
              ))}

              <div className="min-[1000px]:hidden">
                <PromoRow summary={appliedCoupon?.code}>{promoContent}</PromoRow>
              </div>
            </div>

            <div className="hidden min-[1000px]:block">
              <div className="sticky top-6">{summarySidebar}</div>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={isClearCartDialogOpen}
        onOpenChange={setIsClearCartDialogOpen}
        title="Clear cart"
        description="Remove all items from your cart? This cannot be undone."
        confirmText="Clear cart"
        onConfirm={handleClearCart}
        isLoading={isClearingCart}
      />

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title={t('cart.removeConfirmTitle')}
        description={removeTarget?.name ?? ''}
        confirmText={t('cart.removeConfirmConfirm')}
        cancelText={t('cart.removeConfirmCancel')}
        onConfirm={handleConfirmRemove}
        isLoading={isRemoving}
      />

      {safeItems.length > 0 && (
        <CartBottomBar
          className="fixed inset-x-0 bottom-0 z-30 min-[1000px]:hidden"
          allSelected={allSelected}
          onToggleAll={(selected) => selection.setMany(selectableKeys, selected)}
          selectedTotal={selectedSubtotal}
          savings={selectedSavings}
          checkoutCount={checkoutCount}
          onCheckout={handleCheckout}
        />
      )}
    </div>
  );
}

// Coupons a customer could plausibly use — matches the "browse available
// vouchers" pattern of Shopee/Tokopedia. Unchanged from the previous cart
// page, just now rendered inside the PromoRow sheet instead of inline.
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
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Available Coupons</p>
      <div className="max-h-56 space-y-2 overflow-y-auto pr-0.5">
        {coupons.map((coupon: AvailableCoupon) => (
          <div
            key={coupon.code}
            className={cn(
              'flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors',
              coupon.meetsMinimum ? 'border-primary/20 bg-primary/5' : 'border-dashed bg-muted/30',
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
                  {coupon.discountType === 'PERCENTAGE' ? `${coupon.discountValue}% off` : `$${coupon.discountValue.toFixed(2)} off`}
                  {coupon.maxDiscountAmount ? ` (up to $${coupon.maxDiscountAmount.toFixed(2)})` : ''}
                </p>
                {!coupon.meetsMinimum && coupon.minPurchaseAmount != null && (
                  <p className="text-xs font-medium text-amber-600">Spend ${(coupon.minPurchaseAmount - subtotal).toFixed(2)} more to unlock</p>
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
