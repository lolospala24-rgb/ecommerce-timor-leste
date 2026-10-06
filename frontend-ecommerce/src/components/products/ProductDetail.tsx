'use client';

import { Fragment, useState, useEffect, useRef } from 'react';
import type { ReactElement } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCartStore, useCart } from '@/stores/cartStore';
import { useWishlistStore } from '@/stores/wishlistStore';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { useProductVariantSelection } from '@/hooks/useProductVariantSelection';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { usePromotionSoldCount } from '@/hooks/useFlashSale';
import { useCountdown } from '@/hooks/useCountdown';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { QuantitySelector } from './QuantitySelector';
import { ProductVariantSelector } from './ProductVariantSelector';
import { ProductImages } from './ProductImages';
import { RatingStars } from '@/components/shared/RatingStars';
import { ProductReviews } from './ProductReviews';
import { SellerProducts } from './SellerProducts';
import { RelatedProducts } from './RelatedProducts';
import { RecentlyViewedSection } from './RecentlyViewedSection';
import { ShippingEstimator } from './ShippingEstimator';
import { ProductMediaHeader } from './detail/ProductMediaHeader';
import { ProductInfoCard } from './detail/ProductInfoCard';
import { ProductActionRow } from './detail/ProductActionRow';
import { SellerCard } from './detail/SellerCard';
import { ProductTabs } from './detail/ProductTabs';
import { ReviewSummary } from './detail/ReviewSummary';
import { StickyBuyBar } from './detail/StickyBuyBar';
import { BuyBottomSheet } from './detail/BuyBottomSheet';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { Product } from '@/types/product.types';
import { formatVariantLabel, parseProductTypeFields } from '@/lib/product';
import { getProductPricing } from '@/lib/pricing';
import { trackViewItem } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import {
  ShoppingCart,
  Zap,
  Heart,
  Link2,
  Truck,
  Shield,
  ShieldCheck,
  RotateCcw,
  Check,
  AlertCircle,
  Loader2,
  Layers,
  Store,
  Tag,
  ChevronRight,
  BadgeCheck,
  MapPin,
  Bell,
  BellRing,
  Package,
  Sprout,
  User,
  Phone,
  Flame,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useNotifyMeStatus,
  useSubscribeNotifyMe,
  useUnsubscribeNotifyMe,
} from '@/hooks/useStockNotifications';

interface ProductDetailProps {
  product: Product;
  onAddToCart?: () => void;
}

export function ProductDetail({ product, onAddToCart }: ProductDetailProps) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isBuyingNow, setIsBuyingNow] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const { addItem } = useCartStore();
  const { toggleItem, isInWishlist } = useWishlistStore();
  const { isAuthenticated } = useAuthStore();
  const { data: settings } = usePublicSettings();
  const { addProduct: recordRecentlyViewed } = useRecentlyViewed();

  // Mobile redesign — bottom sheet + action-row expand state + the compact
  // sticky header that appears once the shopper scrolls past the gallery.
  // Everything these touch (handleAddToCart/handleBuyNow/quantity/etc.) is
  // the exact same state/handlers the desktop layout already uses below.
  const { totalItems: cartCount } = useCart();
  const { setCartOpen } = useUIStore();
  const [isBuySheetOpen, setIsBuySheetOpen] = useState(false);
  const [buySheetMode, setBuySheetMode] = useState<'cart' | 'buyNow'>('cart');
  const [isShippingRowOpen, setIsShippingRowOpen] = useState(false);
  const [isGuaranteeRowOpen, setIsGuaranteeRowOpen] = useState(false);
  const [isCompactHeaderVisible, setIsCompactHeaderVisible] = useState(false);
  const mediaHeaderSentinelRef = useRef<HTMLDivElement>(null);
  // The site's own <header> is `sticky top-0 z-40` (Header.tsx) — this
  // compact bar needs to dock directly under it, not at the viewport's
  // true top:0 (which that header already owns), so its real rendered
  // height is measured instead of assumed.
  const [siteHeaderHeight, setSiteHeaderHeight] = useState(64);

  useEffect(() => {
    const sentinel = mediaHeaderSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsCompactHeaderVisible(!entry.isIntersecting),
      { rootMargin: '-56px 0px 0px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const header = document.querySelector('header');
    if (header) setSiteHeaderHeight(header.getBoundingClientRect().height);
  }, []);

  useEffect(() => {
    if (product.id) recordRecentlyViewed(product.id);
    if (product.id) {
      trackViewItem({ item_id: product.id, item_name: product.name, price: product.price });
    }
    // Only re-run when the viewed product actually changes, not on every
    // recordRecentlyViewed identity change (it's stable via useCallback,
    // but this makes the intent explicit either way).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  const {
    variants,
    hasVariants,
    isSimpleVariant,
    attributeKeys,
    attributeOptions,
    attributeLabels,
    selectedVariant,
    selectedVariantLabel,
    selectedAttributes,
    hasInvalidCombination,
    selectAttribute,
    selectVariant,
    isAttributeValueAvailable,
    displayPrice,
    displayComparePrice,
    displayEffectivePrice,
    displayPromotion,
    displayStock,
    displaySku,
    galleryImages,
    thumbnailGallery,
    mainImageUrl,
    selectThumbnail,
    setMainImageUrl,
    hasActiveVariantSelection,
  } = useProductVariantSelection(product);

  // Scoped to simple (non-variant) products: Product.stock is the only
  // field the backend's restock trigger watches (see
  // ProductsService.update/updateStock) — a variant going back in stock
  // doesn't necessarily change Product.stock, so offering this for
  // variant products would be a promise the backend can't currently keep.
  const canNotifyMe = !hasVariants && displayStock === 0;
  const { data: notifyStatus } = useNotifyMeStatus(product.id, isAuthenticated && canNotifyMe);
  const subscribeNotifyMe = useSubscribeNotifyMe(product.id);
  const unsubscribeNotifyMe = useUnsubscribeNotifyMe(product.id);
  const isSubscribedToRestock = !!notifyStatus?.subscribed;

  const handleNotifyMe = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to get notified');
      return;
    }
    try {
      if (isSubscribedToRestock) {
        await unsubscribeNotifyMe.mutateAsync();
        toast.success('Notification cancelled');
      } else {
        await subscribeNotifyMe.mutateAsync();
        toast.success("We'll notify you when it's back in stock!");
      }
    } catch {
      // The axios interceptor already shows an error toast.
    }
  };

  const pricing = getProductPricing({
    price: displayPrice,
    comparePrice: displayComparePrice,
    effectivePrice: displayEffectivePrice,
    promotion: displayPromotion,
  });
  const discount = pricing.discountPercent;
  const savings = pricing.savings;

  // Flash Sale info block — only rendered when this product actually has
  // an active Promotion (the same ActivePromotion the price band above
  // already discounts against). Real sold count via the promotion-scoped
  // endpoint (DELIVERED order lines for THIS promotion specifically, never
  // the product's lifetime salesCount), real countdown to the promotion's
  // own endAt, and the same honest sold/stock ratio FlashSaleProductCard
  // uses — no fabricated quota since none exists in the data model.
  const isFlashSale = !!displayPromotion;
  const { data: flashSaleSoldCount = 0 } = usePromotionSoldCount(displayPromotion?.id);
  const flashSaleCountdown = useCountdown(isFlashSale ? displayPromotion!.endAt : null);
  const flashSaleProgress =
    flashSaleSoldCount > 0
      ? Math.min(Math.max((flashSaleSoldCount / (flashSaleSoldCount + displayStock)) * 100, 6), 95)
      : 0;

  // Packaging pricing is still reference-only (not purchasable through Add
  // to Cart/Buy Now) — contact the seller directly for a package order.
  // Wholesale, unlike packaging, IS real: the backend's cart/order pricing
  // (carts.service.ts/orders.service.ts resolveUnitPrice) automatically
  // charges wholesalePrice once quantity meets wholesaleMinQty, unless a
  // Flash Sale promotion is active (which always takes priority). Both are
  // only shown for simple products — for a variant product, which
  // variant's wholesale/packaging would this even describe?
  const hasWholesaleInfo = !hasVariants && !!product.wholesalePrice && !!product.wholesaleMinQty;
  const hasPackagingInfo =
    !hasVariants && !!product.packagingName && !!product.packagingUnitCount && !!product.packagingPrice;
  const packagingPerUnit = hasPackagingInfo ? product.packagingPrice! / product.packagingUnitCount! : 0;
  const isWholesaleActive = hasWholesaleInfo && quantity >= product.wholesaleMinQty! && !isFlashSale;

  // Server-resolved (resolveProductOrigin) — never re-derived here. Section
  // is hidden entirely for non-local products, and doesn't render an empty
  // shell for a local product whose seller hasn't declared an origin yet
  // and has no producer info either.
  const hasLocalInfo =
    !!product.isLocallyMade &&
    (!!product.resolvedOrigin ||
      !!product.producerName ||
      !!product.producerOrganization ||
      !!product.producerPhone);
  const localOriginParts = product.resolvedOrigin
    ? [product.resolvedOrigin.aldeia, product.resolvedOrigin.suco, product.resolvedOrigin.postoAdmin, product.resolvedOrigin.municipality].filter(
        (part): part is string => !!part,
      )
    : [];

  // Before any option is picked, show the real min–max span across variants
  // (e.g. "$12.00 - $18.00") instead of a single starting price that
  // understates what the product can actually cost.
  const variantPriceRange =
    !selectedVariant && hasVariants && variants.length > 0
      ? variants.reduce(
          (range, v) => ({
            min: Math.min(range.min, v.price),
            max: Math.max(range.max, v.price),
          }),
          { min: variants[0].price, max: variants[0].price },
        )
      : null;
  const showPriceRange = !!variantPriceRange && variantPriceRange.min !== variantPriceRange.max;

  // Read straight from the store instead of mirroring it into local state —
  // the mirror could desync from the real value (e.g. toggled elsewhere on
  // the same page) and, on a failed toggle, was flipping to look "wishlisted"
  // even though the store's own catch already reported the failure.
  const isWishlisted = isInWishlist(product.id);

  const validateSelection = () => {
    if (!isAuthenticated) {
      toast.error('Please login to continue');
      return false;
    }
    if (hasVariants && !selectedVariant) {
      toast.error(
        hasInvalidCombination
          ? 'This combination is unavailable. Please choose a different option.'
          : 'Please select all required options.',
      );
      return false;
    }
    return true;
  };

  // Mirrors the Add to Cart / Buy Now guard above, surfaced inline near the
  // buttons so the customer doesn't have to click to find out why they're
  // disabled.
  const selectionHint = !hasVariants || selectedVariant
    ? null
    : hasInvalidCombination
      ? 'This combination is unavailable.'
      : 'Please select all required options.';

  const handleAddToCart = async () => {
    if (!validateSelection()) return;
    setIsAddingToCart(true);
    try {
      await addItem(product, quantity, selectedVariant ?? undefined);
      toast.success(`${product.name} added to cart!`);
      onAddToCart?.();
    } catch {
      toast.error('Failed to add to cart');
    } finally {
      setIsAddingToCart(false);
    }
  };

  // "Buy Now" adds this item to the cart, same as Add to Cart, then goes
  // straight to checkout — it does not isolate a single-item checkout from
  // the rest of the cart. Anything already in the cart will check out
  // alongside it, same as any other cart-based storefront without a
  // dedicated express-checkout flow.
  const handleBuyNow = async () => {
    if (!validateSelection()) return;
    setIsBuyingNow(true);
    try {
      await addItem(product, quantity, selectedVariant ?? undefined);
      router.push('/checkout');
    } catch {
      toast.error('Failed to start checkout');
    } finally {
      setIsBuyingNow(false);
    }
  };

  const openBuySheet = (mode: 'cart' | 'buyNow') => {
    if (!validateSelection()) return;
    setBuySheetMode(mode);
    setIsBuySheetOpen(true);
  };

  const handleSheetConfirm = async () => {
    if (buySheetMode === 'cart') {
      await handleAddToCart();
      setIsBuySheetOpen(false);
    } else {
      await handleBuyNow();
      setIsBuySheetOpen(false);
    }
  };

  const handleWishlistToggle = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to add to wishlist');
      return;
    }
    // toggleItem (via the wishlist store's addItem/removeItem) already
    // shows its own success/failure toast and updates store state —
    // nothing else to do here.
    await toggleItem(product);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  // Plain web share-intent URLs — no API keys or app registration needed,
  // just standard links each platform exposes for this exact purpose.
  const shareText = `Check out ${product.name} on ${settings?.siteName || 'our store'}`;
  const shareLinks =
    typeof window !== 'undefined'
      ? [
          {
            label: 'Share on Facebook',
            href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`,
            className: 'bg-[#1877F2] hover:bg-[#1466d1]',
            icon: FacebookIcon,
          },
          {
            label: 'Share on WhatsApp',
            href: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${window.location.href}`)}`,
            className: 'bg-[#25D366] hover:bg-[#1fbd5a]',
            icon: WhatsAppIcon,
          },
          {
            label: 'Share on Telegram',
            href: `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(shareText)}`,
            className: 'bg-[#26A5E4] hover:bg-[#1f8fc7]',
            icon: TelegramIcon,
          },
        ]
      : [];

  const buyDisabled = displayStock === 0 || (hasVariants && !selectedVariant);

  // Tetun-first — only falls back to the English description when the
  // seller never wrote a Tetum one.
  const displayDescription = product.descriptionTetum || product.description;

  // Real copy only, same claims the page already made before — just
  // consolidated into the single "Jaminan & Perlindungan" accordion
  // instead of being split across two separate spots on the page (a
  // standalone payment-security box and a 4-card trust row further down).
  const trustItems = [
    {
      icon: ShieldCheck,
      title: 'Secure payment',
      subtitle: 'Your payment info is safe',
    },
    {
      icon: Truck,
      title: product.seller?.storeAddress ? `Ships from ${product.seller.storeAddress}` : 'Fast shipping',
      subtitle: settings?.enableCOD ? 'Cost at checkout · COD available' : 'Cost calculated at checkout',
    },
    {
      icon: Shield,
      title: '100% authentic',
      subtitle: 'All products guaranteed original',
    },
    {
      icon: RotateCcw,
      title: '7-day returns',
      subtitle: 'Not satisfied? Return it',
    },
  ];

  const specRows = [
    product.category && {
      label: 'Kategoria',
      value: product.category.name,
      href: `/categories/${product.category.slug}`,
    },
    product.brand && { label: 'Marka', value: product.brand },
    hasPackagingInfo && {
      label: 'Pakote',
      value: `${product.packagingName}, pote klík ${product.packagingUnitCount}`,
    },
    { label: 'Stok', value: String(displayStock) },
    product.seller?.storeAddress && { label: 'Haruka husi', value: product.seller.storeAddress },
    (displaySku || product.sku) && { label: 'SKU', value: (displaySku || product.sku) as string },
    product.type?.name && { label: 'Produtu tipu', value: product.type.name },
    product.weight && { label: 'Pesu', value: `${product.weight} kg` },
    product.barcode && { label: 'Barcode', value: product.barcode },
  ].filter((row): row is { label: string; value: string; href?: string } => !!row);

  const specChips = product.specifications
    ? Object.entries(product.specifications)
        .map(([key, value]) => (value ? `${key} ${value}` : key).trim())
        .filter(Boolean)
    : [];

  const mobileVariantsTable = hasVariants && !isSimpleVariant && (
    <div className="mt-5">
      <h3 className="mb-3 text-sm font-bold text-[#142019]">All variants</h3>
      <div className="overflow-hidden rounded-xl border border-[#DDE3DE]">
        <div className="overflow-x-auto" data-lenis-prevent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#EEF1EE] bg-[#F4F6F3] text-left">
                <th className="px-3 py-2.5 font-semibold text-[#142019]">Variant</th>
                <th className="px-3 py-2.5 font-semibold text-[#142019]">Price</th>
                <th className="px-3 py-2.5 font-semibold text-[#142019]">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF1EE]">
              {variants.map((variant) => (
                <tr key={variant.id} className={cn(selectedVariant?.id === variant.id && 'bg-[#E3F1E8]/40')}>
                  <td className="px-3 py-2.5 font-medium text-[#142019]">
                    {formatVariantLabel(variant, attributeKeys, attributeLabels)}
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-[#17703F]">${variant.price.toFixed(2)}</td>
                  <td className="px-3 py-2.5 text-[#56635B]">{variant.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-3 md:space-y-5">
      {/* ============ MOBILE (< lg) — redesigned layout ============ */}
      <div className="lg:hidden">
        <div className="-mx-4">
          <ProductMediaHeader
            images={galleryImages}
            thumbnail={product.thumbnail}
            name={product.name}
            discount={discount}
            thumbnailGallery={thumbnailGallery}
            mainImageUrl={mainImageUrl}
            onThumbnailSelect={selectThumbnail}
            onMainImageChange={setMainImageUrl}
            onBack={() => router.back()}
            onShare={handleCopyLink}
            onCart={() => setCartOpen(true)}
            cartCount={cartCount}
          />
          <div ref={mediaHeaderSentinelRef} />

          <ProductInfoCard
            categoryName={product.category?.name}
            categorySlug={product.category?.slug}
            title={product.name}
            rating={product.rating || 0}
            totalReviews={product.totalReviews ?? 0}
            salesCount={product.salesCount ?? 0}
            isWishlisted={isWishlisted}
            onWishlistToggle={handleWishlistToggle}
            currentPrice={pricing.currentPrice}
            originalPrice={pricing.originalPrice}
            discountPercent={discount}
            savings={savings}
            priceRange={showPriceRange ? variantPriceRange : null}
            inStock={displayStock > 0}
            stockCount={displayStock}
          />
        </div>

        <div className="space-y-2 bg-[#F4F6F3] px-4 pb-2 pt-2">
          {isFlashSale && (
            <div className="space-y-2.5 rounded-2xl border border-red-200 bg-red-50/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-red-700">
                  <Flame className="h-4 w-4" />
                  Flash Sale
                </div>
                {flashSaleCountdown && !flashSaleCountdown.expired && (
                  <div className="flex items-center gap-1 font-mono text-sm font-semibold tabular-nums text-red-700">
                    <span>{String(flashSaleCountdown.hours).padStart(2, '0')}</span>:
                    <span>{String(flashSaleCountdown.minutes).padStart(2, '0')}</span>:
                    <span>{String(flashSaleCountdown.seconds).padStart(2, '0')}</span>
                  </div>
                )}
              </div>
              {flashSaleSoldCount > 0 && (
                <div>
                  <div className="flex items-center justify-between text-xs font-medium text-orange-700">
                    <span>{flashSaleSoldCount} Terjual</span>
                    {displayStock > 0 && displayStock <= 5 && <span>Sisa {displayStock} unit</span>}
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-orange-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500"
                      style={{ width: `${flashSaleProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {(hasWholesaleInfo || hasPackagingInfo) && (
            <div
              className={cn(
                'space-y-2 rounded-2xl border p-4',
                isWholesaleActive ? 'border-green-300 bg-green-50/60' : 'border-dashed border-[#DDE3DE]',
              )}
            >
              <div className="flex items-center gap-2 text-sm font-medium text-[#142019]">
                <Package className="h-4 w-4 text-[#17703F]" />
                Bulk &amp; packaging options
              </div>
              {hasWholesaleInfo && (
                <p className={cn('text-sm', isWholesaleActive ? 'font-medium text-green-700' : 'text-[#56635B]')}>
                  Buy <span className="font-semibold text-[#142019]">{product.wholesaleMinQty}+ units</span> for{' '}
                  <span className="font-semibold text-[#142019]">${product.wholesalePrice!.toFixed(2)} each</span>
                  {isWholesaleActive && (
                    <span className="ml-1.5 inline-flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" /> Applied to your quantity
                    </span>
                  )}
                </p>
              )}
              {hasPackagingInfo && (
                <p className="text-sm text-[#56635B]">
                  Also sold as{' '}
                  <span className="font-semibold text-[#142019]">
                    {product.packagingName} ({product.packagingUnitCount} units) — ${product.packagingPrice!.toFixed(2)}
                  </span>{' '}
                  (${packagingPerUnit.toFixed(2)}/unit)
                </p>
              )}
            </div>
          )}

          {displayStock === 0 && canNotifyMe && (
            <Button
              type="button"
              variant={isSubscribedToRestock ? 'secondary' : 'outline'}
              className="w-full"
              onClick={handleNotifyMe}
              disabled={subscribeNotifyMe.isPending || unsubscribeNotifyMe.isPending}
            >
              {subscribeNotifyMe.isPending || unsubscribeNotifyMe.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : isSubscribedToRestock ? (
                <BellRing className="mr-2 h-4 w-4" />
              ) : (
                <Bell className="mr-2 h-4 w-4" />
              )}
              {isSubscribedToRestock ? "We'll notify you when it's back" : 'Notify Me When Available'}
            </Button>
          )}

          <div className="rounded-2xl border border-[#DDE3DE] bg-white px-4">
            <ProductActionRow
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Garantia & protesaun"
              subtitle="Osan fila se produtu la to'o"
              onClick={() => setIsGuaranteeRowOpen((prev) => !prev)}
              expanded={isGuaranteeRowOpen}
            >
              <div className="space-y-3">
                {trustItems.map(({ icon: Icon, title, subtitle }) => (
                  <div key={title} className="flex items-start gap-2.5">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#17703F]" />
                    <div>
                      <p className="text-sm font-medium text-[#142019]">{title}</p>
                      <p className="text-xs text-[#56635B]">{subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ProductActionRow>
            <ProductActionRow
              icon={<Truck className="h-5 w-5" />}
              title="Haruka ba"
              subtitle="Hili munisípiu atu haree kustu"
              onClick={() => setIsShippingRowOpen((prev) => !prev)}
              expanded={isShippingRowOpen}
              showDivider={false}
            >
              <ShippingEstimator />
            </ProductActionRow>
          </div>

          {hasVariants && !isSimpleVariant && (
            <div className="rounded-2xl border border-[#DDE3DE] bg-white p-4">
              <ProductVariantSelector
                variants={variants}
                attributeKeys={attributeKeys}
                attributeOptions={attributeOptions}
                attributeLabels={attributeLabels}
                selectedAttributes={selectedAttributes}
                selectedVariant={selectedVariant}
                selectedVariantLabel={selectedVariantLabel}
                onSelectAttribute={selectAttribute}
                onSelectVariant={selectVariant}
                isAttributeValueAvailable={isAttributeValueAvailable}
                productThumbnail={product.thumbnail}
              />
              {selectionHint && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{selectionHint}</span>
                </div>
              )}
            </div>
          )}

          {product.seller && (
            <SellerCard
              sellerId={product.seller.id}
              storeName={product.seller.storeName}
              storeLogo={product.seller.storeLogo}
              isVerified={product.seller.isVerified}
              municipality={hasLocalInfo ? localOriginParts[localOriginParts.length - 1] : undefined}
            />
          )}

          {hasLocalInfo && (
            <div className="rounded-2xl border border-[#DDE3DE] bg-white p-4">
              <div className="flex items-center gap-2">
                <Sprout className="h-5 w-5 text-[#17703F]" />
                <h2 className="text-sm font-bold text-[#142019]">🇹🇱 Produtu Lokál Timor-Leste</h2>
              </div>
              <div className="mt-3 space-y-2.5 text-sm">
                {localOriginParts.length > 0 && (
                  <div className="flex items-start gap-2.5">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#56635B]" />
                    <p className="text-[#2A3830]">{localOriginParts.join(', ')}</p>
                  </div>
                )}
                {(product.producerName || product.producerOrganization) && (
                  <div className="flex items-start gap-2.5">
                    <User className="mt-0.5 h-4 w-4 shrink-0 text-[#56635B]" />
                    <p className="text-[#2A3830]">
                      {[product.producerName, product.producerOrganization].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                )}
                {product.producerPhone && (
                  <div className="flex items-start gap-2.5">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[#56635B]" />
                    <p className="text-[#2A3830]">{product.producerPhone}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-[#DDE3DE] bg-white p-4">
            <ProductTabs
              description={displayDescription}
              specChips={specChips}
              specRows={specRows}
              variantsTable={mobileVariantsTable}
              totalReviews={product.totalReviews ?? 0}
              reviewSummarySlot={<ReviewSummary rating={product.rating || 0} totalReviews={product.totalReviews ?? 0} />}
              reviewsSlot={
                <ProductReviews
                  productId={product.id}
                  rating={product.rating}
                  totalReviews={product.totalReviews}
                  ratingDistribution={product.ratingDistribution}
                />
              }
            />
          </div>
        </div>

        {/* Compact sticky app bar — appears once the shopper scrolls past
            the media header (IntersectionObserver on the sentinel above). */}
        {isCompactHeaderVisible && (
          <div
            className="fixed inset-x-0 z-30 flex items-center gap-3 border-b border-[#DDE3DE] bg-white px-3 py-2"
            style={{ top: siteHeaderHeight }}
          >
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Fila"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#142019]"
            >
              <ChevronRight className="h-5 w-5 rotate-180" />
            </button>
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[#F4F6F3]">
              {mainImageUrl && <Image src={mainImageUrl} alt={product.name} fill className="object-cover" sizes="40px" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#142019]">{product.name}</p>
              <p className="text-sm font-extrabold text-[#17703F]">${pricing.currentPrice.toFixed(2)}</p>
            </div>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              aria-label="Karreta"
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#142019]"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#B4410F] px-1 text-[9px] font-semibold text-white">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ============ DESKTOP (lg+) — unchanged from before ============ */}
      <div className="hidden lg:block">
      {/* Breadcrumb — sits right under the header with minimal padding
          (py-1.5 ≈ 6px) and a smaller 12px label size, closer to a compact
          utility strip than a full text row. */}
      <nav
        className="min-w-0 overflow-x-auto py-1.5 text-xs text-muted-foreground"
        aria-label="Breadcrumb"
        data-lenis-prevent
      >
        <ol className="flex min-w-max items-center gap-1.5 whitespace-nowrap">
          <li>
            <Link href="/" className="hover:text-primary transition-colors">
              Home
            </Link>
          </li>
          <li className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href="/products" className="hover:text-primary transition-colors">
              Products
            </Link>
          </li>
          {/* Parent first, then the product's own (sub)category — category
              names are only unique per-parent now, so skipping straight to
              the leaf risked two different subcategories (e.g. two
              different "Aksesóriu" under two different parents) rendering
              an identical, ambiguous breadcrumb. */}
          {product.category?.parent && (
            <li className="flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5" />
              <Link
                href={`/categories/${product.category.parent.slug}`}
                className="hover:text-primary transition-colors"
              >
                {product.category.parent.name}
              </Link>
            </li>
          )}
          {product.category && (
            <li className="flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5" />
              <Link
                href={`/categories/${product.category.slug}`}
                className="hover:text-primary transition-colors"
              >
                {product.category.name}
              </Link>
            </li>
          )}
          <li className="flex min-w-0 items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            <span className="max-w-[180px] truncate font-medium text-foreground sm:max-w-[280px]">
              {product.name}
            </span>
          </li>
        </ol>
      </nav>

      {/* Main product section: gallery | info + buy, two columns */}
      <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)] xl:gap-10">
        {/* Column 1 — Gallery + share/wishlist */}
        <div className="lg:sticky lg:top-24 lg:self-start space-y-3">
          <ProductImages
            images={galleryImages}
            thumbnail={product.thumbnail}
            name={product.name}
            discount={discount}
            thumbnailGallery={thumbnailGallery}
            mainImageUrl={mainImageUrl}
            onThumbnailSelect={selectThumbnail}
            onMainImageChange={setMainImageUrl}
            galleryLabel={
              hasActiveVariantSelection && selectedVariant?.images?.length && selectedVariantLabel
                ? selectedVariantLabel
                : 'Product'
            }
            isVariantGallery={Boolean(
              hasActiveVariantSelection && selectedVariant?.images?.length,
            )}
          />

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">Share:</span>
            <div className="flex items-center gap-1.5">
              {shareLinks.map(({ label, href, className, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-white transition-colors',
                    className,
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </a>
              ))}
              <button
                type="button"
                onClick={handleCopyLink}
                aria-label="Copy product link"
                className="flex h-7 w-7 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:bg-muted"
              >
                <Link2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <span className="h-4 w-px bg-border" />
            <button
              type="button"
              onClick={handleWishlistToggle}
              className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-red-600"
            >
              <Heart className={cn('h-4 w-4 transition-colors', isWishlisted && 'fill-red-600 text-red-600')} />
              {isWishlisted ? 'Wishlisted' : 'Wishlist'}
            </button>
          </div>
        </div>

        {/* Column 2 — Info + buy */}
        <div className="min-w-0 space-y-5">
          {/* Title + stats */}
          <div className="space-y-2.5">
            {product.category && (
              <Link
                href={`/categories/${product.category.slug}`}
                className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-primary hover:underline"
              >
                {product.category.name}
              </Link>
            )}

            <h1 className="text-2xl font-bold leading-tight text-foreground sm:text-3xl">
              {product.name}
            </h1>

            {/* Only shown when it's an actual distinct translation — a
                product whose Tetum name was never filled in differently
                from the English one would otherwise show the same name
                twice in a row. */}
            {product.nameTetum && product.nameTetum.trim().toLowerCase() !== product.name.trim().toLowerCase() && (
              <p className="text-sm text-muted-foreground">{product.nameTetum}</p>
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
              {/* Each stat is its own list entry, separated by a "•" placed
                  only BETWEEN two entries that actually rendered — building
                  each separator into its own item (the previous approach)
                  left an orphaned leading "•" whenever the item before it
                  was hidden, e.g. a product with 0 reviews but a real sales
                  count. A product with zero reviews shows no rating stat at
                  all here — never a fake "★ 0.0 (0 reviews)". */}
              {[
                (product.totalReviews ?? 0) > 0 && (
                  <span key="rating" className="inline-flex items-center gap-1.5">
                    <RatingStars rating={product.rating || 0} size="sm" />
                    <span>({product.totalReviews} reviews)</span>
                  </span>
                ),
                !!product.salesCount && (
                  <span key="sold">
                    <span className="font-semibold text-primary">{product.salesCount}</span> sold
                  </span>
                ),
                displayStock > 0 && (
                  <span key="stock">
                    Tersisa <span className="font-semibold text-foreground">{displayStock}</span>
                  </span>
                ),
              ]
                .filter((item): item is ReactElement => !!item)
                .map((item, index) => (
                  <Fragment key={item.key}>
                    {index > 0 && <span className="text-border">•</span>}
                    {item}
                  </Fragment>
                ))}
            </div>

            {(product.isLocallyMade || product.type) && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {product.isLocallyMade && (
                  <Badge className="gap-1.5 rounded-md border-0 bg-secondary px-2.5 py-1 font-normal text-secondary-foreground hover:bg-secondary">
                    🇹🇱 Local Product
                  </Badge>
                )}
                {product.type && (
                <Badge variant="secondary" className="gap-1.5 rounded-md px-2.5 py-1 font-normal">
                  <Layers className="h-3.5 w-3.5" />
                  {product.type.name}
                </Badge>
                )}
                {parseProductTypeFields(product.type?.fields).map((field) => (
                  <Badge
                    key={field.key}
                    variant="outline"
                    className="rounded-md font-normal text-muted-foreground"
                  >
                    {field.label}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Price band */}
          <div className="space-y-2 rounded-lg bg-muted/40 p-4">
            <div className="flex flex-wrap items-end gap-2.5">
              {showPriceRange ? (
                <span className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">
                  ${variantPriceRange!.min.toFixed(2)} - ${variantPriceRange!.max.toFixed(2)}
                </span>
              ) : (
                <span className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
                  ${pricing.currentPrice.toFixed(2)}
                </span>
              )}
              {pricing.originalPrice != null && (
                <span className="pb-1 text-base text-muted-foreground line-through">
                  ${pricing.originalPrice.toFixed(2)}
                </span>
              )}
              {discount > 0 && (
                <Badge className="mb-1 border-0 bg-red-600 text-white hover:bg-red-600">
                  Save ${savings.toFixed(2)} ({discount}%)
                </Badge>
              )}
            </div>
            {showPriceRange && (
              <p className="text-xs text-muted-foreground">
                Select options below to see the exact price.
              </p>
            )}
            {displayStock > 0 ? (
              <p className="flex items-center gap-1.5 text-sm font-medium text-green-700">
                <Check className="h-4 w-4" />
                In stock
              </p>
            ) : (
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-sm font-medium text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  Out of stock
                </p>
                {canNotifyMe && (
                  <Button
                    type="button"
                    size="sm"
                    variant={isSubscribedToRestock ? 'secondary' : 'outline'}
                    onClick={handleNotifyMe}
                    disabled={subscribeNotifyMe.isPending || unsubscribeNotifyMe.isPending}
                  >
                    {subscribeNotifyMe.isPending || unsubscribeNotifyMe.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : isSubscribedToRestock ? (
                      <BellRing className="mr-2 h-4 w-4" />
                    ) : (
                      <Bell className="mr-2 h-4 w-4" />
                    )}
                    {isSubscribedToRestock ? "We'll notify you when it's back" : 'Notify Me When Available'}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Jaminan & Perlindungan — collapsed by default so it doesn't
              compete with price/stock/Flash Sale for attention; same real
              copy that used to live in two separate places on this page
              (the standalone "Secure checkout guaranteed" box below the
              buy buttons, and the 4-card trust row near the bottom) —
              consolidated here into one place instead of saying "your
              payment is safe" twice in two different spots on the same
              page. */}
          <Accordion type="single" collapsible className="rounded-lg border px-4">
            <AccordionItem value="guarantees" className="border-0">
              <AccordionTrigger className="hover:no-underline">
                <span className="flex items-center gap-2 text-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Jaminan &amp; Perlindungan
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  {trustItems.map(({ icon: Icon, title, subtitle }) => (
                    <div key={title} className="flex items-start gap-2.5">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{title}</p>
                        <p className="text-xs text-muted-foreground">{subtitle}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Flash Sale info — countdown to the promotion's real endAt,
              real units sold through THIS promotion, and the same honest
              sold/stock progress ratio used on the Flash Sale page's cards. */}
          {isFlashSale && (
            <div className="space-y-2.5 rounded-lg border border-red-200 bg-red-50/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-red-700">
                  <Flame className="h-4 w-4" />
                  Flash Sale
                </div>
                {flashSaleCountdown && !flashSaleCountdown.expired && (
                  <div className="flex items-center gap-1 font-mono text-sm font-semibold tabular-nums text-red-700">
                    <span>{String(flashSaleCountdown.hours).padStart(2, '0')}</span>:
                    <span>{String(flashSaleCountdown.minutes).padStart(2, '0')}</span>:
                    <span>{String(flashSaleCountdown.seconds).padStart(2, '0')}</span>
                  </div>
                )}
              </div>
              {flashSaleSoldCount > 0 && (
                <div>
                  <div className="flex items-center justify-between text-xs font-medium text-orange-700">
                    <span>{flashSaleSoldCount} Terjual</span>
                    {displayStock > 0 && displayStock <= 5 && <span>Sisa {displayStock} unit</span>}
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-orange-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500"
                      style={{ width: `${flashSaleProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Wholesale is real — automatically charged in cart/checkout once
              quantity meets the minimum (unless Flash Sale is active).
              Packaging stays informational only; contact the seller for
              that. */}
          {(hasWholesaleInfo || hasPackagingInfo) && (
            <div
              className={cn(
                'space-y-2 rounded-lg border p-4',
                isWholesaleActive ? 'border-green-300 bg-green-50/60' : 'border-dashed',
              )}
            >
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Package className="h-4 w-4 text-primary" />
                Bulk &amp; packaging options
              </div>
              {hasWholesaleInfo && (
                <p className={cn('text-sm', isWholesaleActive ? 'font-medium text-green-700' : 'text-muted-foreground')}>
                  Buy <span className="font-semibold text-foreground">{product.wholesaleMinQty}+ units</span> for{' '}
                  <span className="font-semibold text-foreground">${product.wholesalePrice!.toFixed(2)} each</span>
                  {isWholesaleActive && (
                    <span className="ml-1.5 inline-flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" /> Applied to your quantity
                    </span>
                  )}
                </p>
              )}
              {hasPackagingInfo && (
                <p className="text-sm text-muted-foreground">
                  Also sold as{' '}
                  <span className="font-semibold text-foreground">
                    {product.packagingName} ({product.packagingUnitCount} units) — ${product.packagingPrice!.toFixed(2)}
                  </span>{' '}
                  (${packagingPerUnit.toFixed(2)}/unit)
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {hasWholesaleInfo &&
                  (isFlashSale
                    ? 'Flash Sale pricing is active and takes priority over wholesale right now.'
                    : 'Wholesale pricing is applied automatically once your quantity meets the minimum.')}
                {hasWholesaleInfo && hasPackagingInfo && ' '}
                {hasPackagingInfo && 'Package pricing is a reference price — contact the seller below to place a package order.'}
              </p>
            </div>
          )}

          {/* Shipping — lets the buyer check real cost/ETA for their own
              municipality before adding to cart, using the same public
              shipping-options data checkout's courier picker is built
              from. Final cost is still confirmed at checkout against the
              buyer's actual saved address. */}
          <ShippingEstimator />

          {/* Variants — suppressed when isSimpleVariant: exactly one
              sellable variant with no distinguishing attributes has
              nothing for the customer to choose, so the selector/"your
              selection" UI would be pure redundant chrome. Price/stock/SKU
              above already reflect it via useProductVariantSelection's
              auto-resolve. */}
          {hasVariants && !isSimpleVariant && (
            <ProductVariantSelector
              variants={variants}
              attributeKeys={attributeKeys}
              attributeOptions={attributeOptions}
              attributeLabels={attributeLabels}
              selectedAttributes={selectedAttributes}
              selectedVariant={selectedVariant}
              selectedVariantLabel={selectedVariantLabel}
              onSelectAttribute={selectAttribute}
              onSelectVariant={selectVariant}
              isAttributeValueAvailable={isAttributeValueAvailable}
              productThumbnail={product.thumbnail}
            />
          )}

          {/* Quantity + buy */}
          <div className="space-y-4 border-t pt-5">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm font-medium text-foreground">Quantity</span>
              <QuantitySelector quantity={quantity} setQuantity={setQuantity} max={displayStock} />
              {displayStock > 0 && (
                <span className="text-xs text-muted-foreground">Stock: {displayStock}</span>
              )}
            </div>

            {selectedVariantLabel && !isSimpleVariant && (
              <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                <Tag className="h-4 w-4 shrink-0" />
                <span className="truncate">{selectedVariantLabel}</span>
              </div>
            )}

            {selectionHint && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{selectionHint}</span>
              </div>
            )}

            {/* Hidden below lg: — the mobile sticky bar near the bottom of
                this component covers the same two actions there, in the
                thumb zone, instead of duplicating them mid-page. */}
            <div className="hidden gap-3 lg:flex">
              <Button
                size="lg"
                variant="outline"
                className="h-12 flex-1 border-primary text-base font-semibold text-primary hover:bg-primary/5"
                disabled={buyDisabled || isAddingToCart}
                onClick={handleAddToCart}
              >
                {isAddingToCart ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <ShoppingCart className="mr-2 h-5 w-5" />
                )}
                Add to Cart
              </Button>
              <Button
                size="lg"
                className="h-12 flex-1 bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"
                disabled={buyDisabled || isBuyingNow}
                onClick={handleBuyNow}
              >
                {isBuyingNow ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Zap className="mr-2 h-5 w-5" />
                )}
                Buy Now
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Seller — its own section, real fields only (no chat/response-time
          stats: this store has no messaging feature, and those numbers
          aren't in the product API response — showing them would mean
          making them up). */}
      {product.seller && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-5">
          <Link href={`/sellers/${product.seller.id}`} className="group flex min-w-0 items-center gap-3">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted ring-1 ring-border">
              {product.seller.storeLogo ? (
                <Image
                  src={product.seller.storeLogo}
                  alt={product.seller.storeName}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              ) : (
                <Store className="h-6 w-6 text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate font-semibold text-foreground group-hover:text-primary transition-colors">
                  {product.seller.storeName}
                </span>
                {product.seller.isVerified && (
                  <BadgeCheck className="h-4 w-4 shrink-0 fill-info text-white" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {product.seller.isVerified ? 'Verified seller' : 'Seller'}
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/sellers/${product.seller.id}`}>
                Visit Store
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Local Product Information — hidden entirely for non-local products.
          Origin comes only from resolvedOrigin (server-resolved from either
          the product's own custom origin or its seller's declared origin);
          never fall back to product.seller.storeAddress here — that's where
          the seller ships from, not where this specific product originates. */}
      {hasLocalInfo && (
        <div className="rounded-xl border bg-card p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Sprout className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">🇹🇱 Produtu Lokál Timor-Leste</h2>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {localOriginParts.length > 0 && (
              <div className="flex items-start gap-2.5 text-sm">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Origin</p>
                  <p className="font-medium text-foreground">{localOriginParts.join(', ')}</p>
                </div>
              </div>
            )}
            {(product.producerName || product.producerOrganization) && (
              <div className="flex items-start gap-2.5 text-sm">
                <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Producer</p>
                  <p className="font-medium text-foreground">
                    {[product.producerName, product.producerOrganization].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
            )}
            {product.producerPhone && (
              <div className="flex items-start gap-2.5 text-sm">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Producer contact</p>
                  <p className="font-medium text-foreground">{product.producerPhone}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Details tabs */}
      <Tabs defaultValue="description" className="space-y-0">
        <TabsList className="h-auto w-full justify-start gap-6 rounded-none border-b bg-transparent p-0">
          <TabsTrigger
            value="description"
            className="rounded-none border-b-2 border-transparent bg-transparent px-0.5 pb-3 pt-0 font-medium text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            Description
          </TabsTrigger>
          <TabsTrigger
            value="details"
            className="rounded-none border-b-2 border-transparent bg-transparent px-0.5 pb-3 pt-0 font-medium text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            Specifications
          </TabsTrigger>
          <TabsTrigger
            value="reviews"
            className="rounded-none border-b-2 border-transparent bg-transparent px-0.5 pb-3 pt-0 font-medium text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            Reviews
          </TabsTrigger>
        </TabsList>

        <TabsContent value="description" className="mt-6">
          <div className="prose prose-sm max-w-none">
            {/* Tetun only — falls back to the English description when a
                seller hasn't written a Tetum one, instead of showing both
                (which used to repeat the same text twice for products
                where the two fields happen to match). */}
            <p
              className={cn(
                'leading-relaxed text-foreground',
                !isDescriptionExpanded && 'line-clamp-4',
              )}
            >
              {displayDescription}
            </p>
            {/* Only offered when the description is actually long enough to
                need it — a short one just shows in full with no dead
                "Read more" button that expands nothing new. */}
            {displayDescription && displayDescription.length > 220 && (
              <button
                type="button"
                onClick={() => setIsDescriptionExpanded((prev) => !prev)}
                className="not-prose mt-1 text-sm font-semibold text-primary hover:underline"
              >
                {isDescriptionExpanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
        </TabsContent>

        <TabsContent value="details">
          <div className="rounded-xl border bg-card p-6 space-y-8">
            <div>
              <dl className="divide-y rounded-xl border">
                {product.category && (
                  <div className="grid grid-cols-2 gap-4 px-4 py-3.5 sm:grid-cols-3">
                    <dt className="text-sm text-muted-foreground">Category</dt>
                    <dd className="col-span-1 text-sm font-medium sm:col-span-2">
                      <Link
                        href={`/categories/${product.category.slug}`}
                        className="text-primary hover:underline"
                      >
                        {product.category.name}
                      </Link>
                    </dd>
                  </div>
                )}
                {(displaySku || product.sku) && (
                  <div className="grid grid-cols-2 gap-4 px-4 py-3.5 sm:grid-cols-3">
                    <dt className="text-sm text-muted-foreground">SKU</dt>
                    <dd className="col-span-1 font-mono text-sm font-medium sm:col-span-2">
                      {displaySku || product.sku}
                    </dd>
                  </div>
                )}
                {product.type?.name && (
                  <div className="grid grid-cols-2 gap-4 px-4 py-3.5 sm:grid-cols-3">
                    <dt className="text-sm text-muted-foreground">Product type</dt>
                    <dd className="col-span-1 text-sm font-medium sm:col-span-2">
                      {product.type.name}
                    </dd>
                  </div>
                )}
                {product.weight && (
                  <div className="grid grid-cols-2 gap-4 px-4 py-3.5 sm:grid-cols-3">
                    <dt className="text-sm text-muted-foreground">Weight</dt>
                    <dd className="col-span-1 text-sm font-medium sm:col-span-2">
                      {product.weight} kg
                    </dd>
                  </div>
                )}
                {product.barcode && (
                  <div className="grid grid-cols-2 gap-4 px-4 py-3.5 sm:grid-cols-3">
                    <dt className="text-sm text-muted-foreground">Barcode</dt>
                    <dd className="col-span-1 font-mono text-sm font-medium sm:col-span-2">
                      {product.barcode}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {hasVariants && !isSimpleVariant && (
              <div>
                <h3 className="mb-5 text-lg font-semibold">All variants</h3>
                <div className="overflow-hidden rounded-xl border">
                  <div className="overflow-x-auto" data-lenis-prevent>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40 text-left">
                          <th className="px-4 py-3 font-semibold">Variant</th>
                          <th className="px-4 py-3 font-semibold">SKU</th>
                          <th className="px-4 py-3 font-semibold">Price</th>
                          <th className="px-4 py-3 font-semibold">Stock</th>
                          <th className="px-4 py-3 font-semibold">Attributes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {variants.map((variant) => {
                          const isSelected = selectedVariant?.id === variant.id;
                          return (
                            <tr
                              key={variant.id}
                              className={cn('transition-colors', isSelected && 'bg-primary/5')}
                            >
                              <td className="px-4 py-3.5 font-medium">
                                {formatVariantLabel(variant, attributeKeys, attributeLabels)}
                              </td>
                              <td className="px-4 py-3.5 font-mono text-muted-foreground">
                                {variant.sku}
                              </td>
                              <td className="px-4 py-3.5 font-semibold text-primary">
                                ${variant.price.toFixed(2)}
                              </td>
                              <td className="px-4 py-3.5">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'font-normal',
                                    variant.stock > 0
                                      ? 'border-green-200 text-green-600'
                                      : 'border-red-200 text-red-600',
                                  )}
                                >
                                  {variant.stock}
                                </Badge>
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="flex flex-wrap gap-1">
                                  {Object.entries(variant.attributes ?? {}).map(([key, value]) => (
                                    <Badge
                                      key={`${variant.id}-${key}`}
                                      variant="secondary"
                                      className="font-normal"
                                    >
                                      {attributeLabels[key] ?? key}: {value}
                                    </Badge>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="reviews">
          <div className="rounded-xl border bg-card p-6 sm:p-8">
            <ProductReviews
              productId={product.id}
              rating={product.rating}
              totalReviews={product.totalReviews}
              ratingDistribution={product.ratingDistribution}
            />
          </div>
        </TabsContent>
      </Tabs>
      </div>

      {product.seller && (
        <SellerProducts
          sellerId={product.seller.id}
          sellerName={product.seller.storeName}
          currentProductId={product.id}
        />
      )}

      <RelatedProducts currentProductId={product.id} />

      <RecentlyViewedSection excludeId={product.id} />

      {/* Mobile sticky buy bar — Tau ba karreta/Sosa agora open the shared
          BuyBottomSheet (quantity + municipality confirm) instead of
          calling handleAddToCart/handleBuyNow directly; the sheet calls
          them itself once confirmed. Desktop keeps its own inline buttons
          inside the hidden lg:block section above, unchanged. */}
      <StickyBuyBar
        onAddToCart={() => openBuySheet('cart')}
        onBuyNow={() => openBuySheet('buyNow')}
        disabled={buyDisabled}
      />
      <div className="h-[76px] lg:hidden" aria-hidden="true" />

      <BuyBottomSheet
        open={isBuySheetOpen}
        onOpenChange={setIsBuySheetOpen}
        imageUrl={mainImageUrl}
        title={product.name}
        price={pricing.currentPrice}
        comparePrice={pricing.originalPrice}
        stock={displayStock}
        quantity={quantity}
        setQuantity={setQuantity}
        onConfirm={handleSheetConfirm}
        isSubmitting={buySheetMode === 'cart' ? isAddingToCart : isBuyingNow}
        confirmLabel={buySheetMode === 'cart' ? 'Tau ba karreta' : 'Sosa agora'}
      />
    </div>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.89h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91C21.95 6.45 17.5 2 12.04 2Zm5.8 14c-.25.7-1.22 1.29-2.06 1.42-.55.08-1.26.15-3.66-.78-3.07-1.19-5.05-4.31-5.2-4.51-.15-.2-1.24-1.65-1.24-3.15s.78-2.23 1.06-2.53c.27-.3.6-.37.8-.37h.58c.19 0 .43-.07.68.52.25.6.87 2.1.94 2.25.08.15.13.32.03.52-.11.2-.16.32-.31.5-.15.18-.32.4-.46.53-.15.15-.31.31-.13.61.18.3.79 1.31 1.7 2.11 1.17 1.04 2.15 1.37 2.45 1.52.3.15.48.13.65-.07.18-.2.76-.88.96-1.18.2-.3.4-.25.68-.15.27.1 1.75.82 2.05.97.3.15.5.22.58.35.08.13.08.75-.17 1.45Z" />
    </svg>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M21.94 5.36 18.6 20.24c-.25 1.1-.9 1.37-1.83.86l-5.06-3.73-2.44 2.35c-.27.27-.5.5-1.02.5l.36-5.15 9.37-8.47c.41-.36-.09-.56-.63-.2L6.4 12.6l-5.02-1.57c-1.09-.34-1.1-1.09.23-1.61L20.6 4.06c.91-.34 1.7.21 1.34 1.3Z" />
    </svg>
  );
}
