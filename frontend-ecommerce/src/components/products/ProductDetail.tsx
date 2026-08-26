'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/stores/cartStore';
import { useWishlistStore } from '@/stores/wishlistStore';
import { useAuthStore } from '@/stores/authStore';
import { useProductVariantSelection } from '@/hooks/useProductVariantSelection';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuantitySelector } from './QuantitySelector';
import { ProductVariantSelector } from './ProductVariantSelector';
import { ProductImages } from './ProductImages';
import { RatingStars } from '@/components/shared/RatingStars';
import { ProductReviews } from './ProductReviews';
import { RelatedProducts } from './RelatedProducts';
import { RecentlyViewedSection } from './RecentlyViewedSection';
import { ShippingEstimator } from './ShippingEstimator';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { Product } from '@/types/product.types';
import { formatVariantLabel, parseProductTypeFields } from '@/lib/product';
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

// wa.me links need digits only (no "+", spaces, or dashes) — storePhone is
// admin-entered free text (e.g. "+670 8765 4321"), so it isn't safe to use
// as-is.
function sanitizePhoneForWhatsApp(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function ProductDetail({ product, onAddToCart }: ProductDetailProps) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isBuyingNow, setIsBuyingNow] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const { addItem } = useCartStore();
  const { toggleItem, isInWishlist } = useWishlistStore();
  const { isAuthenticated } = useAuthStore();
  const { data: settings } = usePublicSettings();
  const { addProduct: recordRecentlyViewed } = useRecentlyViewed();

  useEffect(() => {
    if (product.id) recordRecentlyViewed(product.id);
    // Only re-run when the viewed product actually changes, not on every
    // recordRecentlyViewed identity change (it's stable via useCallback,
    // but this makes the intent explicit either way).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  const {
    variants,
    hasVariants,
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
    displayStock,
    displaySku,
    galleryImages,
    thumbnailGallery,
    mainImageUrl,
    selectThumbnail,
    setMainImageUrl,
    hasChosenVariant,
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

  const discount =
    displayComparePrice && displayComparePrice > displayPrice
      ? Math.round(((displayComparePrice - displayPrice) / displayComparePrice) * 100)
      : 0;

  const savings =
    displayComparePrice && displayComparePrice > displayPrice
      ? displayComparePrice - displayPrice
      : 0;

  // Wholesale/packaging pricing is reference information entered by the
  // seller — it is not purchasable through Add to Cart/Buy Now at these
  // rates (those always charge displayPrice), so it's only shown for
  // simple products, where "the product's price" is unambiguous. For a
  // variant product, which variant's packaging would this even describe?
  const hasWholesaleInfo = !hasVariants && !!product.wholesalePrice && !!product.wholesaleMinQty;
  const hasPackagingInfo =
    !hasVariants && !!product.packagingName && !!product.packagingUnitCount && !!product.packagingPrice;
  const packagingPerUnit = hasPackagingInfo ? product.packagingPrice! / product.packagingUnitCount! : 0;

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

  useEffect(() => {
    if (product?.id) {
      setIsWishlisted(isInWishlist(product.id));
    }
  }, [product, isInWishlist]);

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

  const handleWishlistToggle = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to add to wishlist');
      return;
    }
    try {
      await toggleItem(product);
      setIsWishlisted(!isWishlisted);
      toast.success(isWishlisted ? 'Removed from wishlist' : 'Added to wishlist');
    } catch {
      toast.error('Failed to update wishlist');
    }
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

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-primary transition-colors">
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/products" className="hover:text-primary transition-colors">
          Products
        </Link>
        {product.category && (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link
              href={`/categories/${product.category.slug}`}
              className="hover:text-primary transition-colors"
            >
              {product.category.name}
            </Link>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground line-clamp-1">{product.name}</span>
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
              hasChosenVariant && selectedVariant?.images?.length && selectedVariantLabel
                ? selectedVariantLabel
                : 'Product'
            }
            isVariantGallery={Boolean(
              hasChosenVariant && selectedVariant?.images?.length,
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

            {product.nameTetum && (
              <p className="text-sm text-muted-foreground">{product.nameTetum}</p>
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <RatingStars rating={product.rating || 0} size="sm" />
                <span>({product.totalReviews || 0} reviews)</span>
              </span>
              {!!product.salesCount && (
                <>
                  <span className="text-border">•</span>
                  <span>
                    <span className="font-semibold text-primary">{product.salesCount}</span> sold
                  </span>
                </>
              )}
              {displaySku && (
                <>
                  <span className="text-border">•</span>
                  <span>
                    SKU: <span className="font-mono text-foreground">{displaySku}</span>
                  </span>
                </>
              )}
            </div>

            {product.type && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Badge variant="secondary" className="gap-1.5 rounded-md px-2.5 py-1 font-normal">
                  <Layers className="h-3.5 w-3.5" />
                  {product.type.name}
                </Badge>
                {parseProductTypeFields(product.type.fields).map((field) => (
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
                  ${displayPrice.toFixed(2)}
                </span>
              )}
              {displayComparePrice && displayComparePrice > displayPrice && (
                <span className="pb-1 text-base text-muted-foreground line-through">
                  ${displayComparePrice.toFixed(2)}
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
                In stock — {displayStock} available
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

          {/* Wholesale / packaging — informational reference pricing only;
              Add to Cart / Buy Now always charge displayPrice regardless of
              what's shown here. The seller's contact button further down
              the page is the correct next step for a bulk order. */}
          {(hasWholesaleInfo || hasPackagingInfo) && (
            <div className="space-y-2 rounded-lg border border-dashed p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Package className="h-4 w-4 text-primary" />
                Bulk &amp; packaging options
              </div>
              {hasWholesaleInfo && (
                <p className="text-sm text-muted-foreground">
                  Buy <span className="font-semibold text-foreground">{product.wholesaleMinQty}+ units</span> for{' '}
                  <span className="font-semibold text-foreground">${product.wholesalePrice!.toFixed(2)} each</span>
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
                These are reference prices — contact the seller below to place a bulk or package order.
              </p>
            </div>
          )}

          {/* Shipping — lets the buyer check real cost/ETA for their own
              municipality before adding to cart, using the same public
              shipping-options data checkout's courier picker is built
              from. Final cost is still confirmed at checkout against the
              buyer's actual saved address. */}
          <ShippingEstimator />
          {settings?.enableCOD && (
            <p className="-mt-1 pl-8 text-xs text-muted-foreground">Cash on Delivery available.</p>
          )}

          {/* Variants */}
          {hasVariants && (
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

            {selectedVariantLabel && (
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
                className="h-12 flex-1 bg-primary text-base font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:bg-blue-800"
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

            <div className="flex items-start gap-2.5 rounded-lg bg-blue-50 p-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="text-xs leading-relaxed">
                <p className="font-medium text-foreground">Secure checkout guaranteed</p>
                <p className="text-muted-foreground">Your payment information is safe with us.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Seller — its own section, real fields only (no chat/response-time
          stats: this store has no messaging feature, and those numbers
          aren't in the product API response — showing them would mean
          making them up). */}
      {product.seller && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-5">
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
              {product.seller.storeAddress && (
                <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{product.seller.storeAddress}</span>
                </div>
              )}
            </div>
          </Link>
          <div className="flex items-center gap-2">
            {product.seller.storePhone && (
              <Button size="sm" className="bg-[#25D366] text-white hover:bg-[#1fbd5a]" asChild>
                <a
                  href={`https://wa.me/${sanitizePhoneForWhatsApp(product.seller.storePhone)}?text=${encodeURIComponent(
                    `Hi, I'm interested in "${product.name}" (${typeof window !== 'undefined' ? window.location.href : ''})`,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <WhatsAppIcon className="mr-1.5 h-4 w-4" />
                  Contact Seller
                </a>
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href={`/sellers/${product.seller.id}`}>
                Visit Store
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
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
        </TabsList>

        <TabsContent value="description" className="mt-6">
          <div className="prose prose-sm max-w-none">
            <p className="leading-relaxed text-foreground">{product.description}</p>
            {product.descriptionTetum && (
              <div className="mt-6 rounded-xl border border-dashed bg-muted/30 p-5 not-prose">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Tetun
                </p>
                <p className="text-muted-foreground leading-relaxed">{product.descriptionTetum}</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="details">
          <div className="rounded-2xl border bg-card p-6 space-y-8">
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

            {hasVariants && (
              <div>
                <h3 className="mb-5 text-lg font-semibold">All variants</h3>
                <div className="overflow-hidden rounded-xl border">
                  <div className="overflow-x-auto">
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
      </Tabs>

      {/* Trust row */}
      <div className="grid gap-4 border-t pt-6 sm:grid-cols-3">
        <div className="flex items-start gap-3">
          <Truck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0 text-sm">
            <p className="font-medium text-foreground">
              {product.seller?.storeAddress
                ? `Ships from ${product.seller.storeAddress}`
                : 'Shipping'}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Cost and delivery estimate calculated at checkout.
              {settings?.enableCOD && ' Cash on Delivery available.'}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0 text-sm">
            <p className="font-medium text-foreground">100% authentic products</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              We guarantee all products are original.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <RotateCcw className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0 text-sm">
            <p className="font-medium text-foreground">7-day return policy</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Not satisfied? Return within 7 days.
            </p>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div id="reviews" className="rounded-2xl border bg-card p-6 sm:p-8">
        <ProductReviews
          productId={product.id}
          rating={product.rating}
          totalReviews={product.totalReviews}
          ratingDistribution={product.ratingDistribution}
        />
      </div>

      <RelatedProducts currentProductId={product.id} />

      <RecentlyViewedSection excludeId={product.id} />

      {/* Mobile sticky buy bar — on a long product page, the inline Add to
          Cart/Buy Now buttons (still shown as-is on lg: and up) end up
          mid-scroll once a shopper reaches the description or reviews.
          Pinning the same two actions to the bottom of the viewport keeps
          them in the thumb zone the whole time, matching how Shopee/
          Tokopedia and most mobile storefronts handle this. Spacer below
          reserves the matching height so this bar never covers page
          content (particularly the reviews/related-products sections). */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur-sm lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center gap-3 px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold text-primary">${displayPrice.toFixed(2)}</p>
            {selectionHint ? (
              <p className="truncate text-xs text-amber-700">{selectionHint}</p>
            ) : (
              <p className="truncate text-xs text-muted-foreground">
                {displayStock > 0 ? `${displayStock} available` : 'Out of stock'}
              </p>
            )}
          </div>
          <Button
            size="icon"
            variant="outline"
            className="h-11 w-11 shrink-0 border-primary text-primary hover:bg-primary/5"
            disabled={buyDisabled || isAddingToCart}
            onClick={handleAddToCart}
            aria-label="Add to cart"
          >
            {isAddingToCart ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ShoppingCart className="h-5 w-5" />
            )}
          </Button>
          <Button
            size="lg"
            className="h-11 shrink-0 bg-primary px-6 font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:bg-blue-800"
            disabled={buyDisabled || isBuyingNow}
            onClick={handleBuyNow}
          >
            {isBuyingNow ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
            Buy Now
          </Button>
        </div>
      </div>
      <div className="h-[76px] lg:hidden" aria-hidden="true" />
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
