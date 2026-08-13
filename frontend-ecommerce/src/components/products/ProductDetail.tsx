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
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuantitySelector } from './QuantitySelector';
import { ProductVariantSelector } from './ProductVariantSelector';
import { ProductImages } from './ProductImages';
import { RatingStars } from '@/components/shared/RatingStars';
import { ProductReviews } from './ProductReviews';
import { RelatedProducts } from './RelatedProducts';
import { Product } from '@/types/product.types';
import { formatVariantLabel, parseProductTypeFields } from '@/lib/product';
import { cn } from '@/lib/utils';
import {
  ShoppingCart,
  Zap,
  Heart,
  Share2,
  Truck,
  Shield,
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
  Package,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ProductDetailProps {
  product: Product;
  onAddToCart?: () => void;
}

const TRUST_ITEMS = [
  { icon: Shield, label: '100% authentic products' },
  { icon: RotateCcw, label: '7-day return policy' },
] as const;

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

  const discount =
    displayComparePrice && displayComparePrice > displayPrice
      ? Math.round(((displayComparePrice - displayPrice) / displayComparePrice) * 100)
      : 0;

  const savings =
    displayComparePrice && displayComparePrice > displayPrice
      ? displayComparePrice - displayPrice
      : 0;

  // Only worth telling the customer "price may change" if it actually can —
  // no point hinting at variation that doesn't exist for this product.
  const priceVariesByOption = hasVariants && variants.some((variant) => variant.price !== product.price);

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

  // Mirrors the Add to Cart / Buy Now guard above, surfaced inline in the
  // buy box so the customer doesn't have to click the button to find out
  // why it's disabled.
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

  const handleShare = async () => {
    try {
      await navigator.share({
        title: product.name,
        text: `Check out ${product.name} on E-commerce Timor-Leste`,
        url: window.location.href,
      });
    } catch {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const subtotal = displayPrice * quantity;

  return (
    <div className="space-y-10">
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

      {/* Main product section: gallery | info | sticky buy box */}
      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)] xl:grid-cols-[420px_minmax(0,1fr)_320px] xl:gap-8">
        {/* Column 1 — Gallery */}
        <div className="lg:sticky lg:top-24 lg:self-start">
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
        </div>

        {/* Column 2 — Info */}
        <div className="min-w-0 space-y-6">
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
              {!!product.salesCount && (
                <>
                  <span>
                    <span className="font-semibold text-primary">{product.salesCount}</span> sold
                  </span>
                  <span className="text-border">•</span>
                </>
              )}
              <span className="inline-flex items-center gap-1.5">
                <RatingStars rating={product.rating || 0} size="sm" />
                <span>({product.totalReviews || 0} reviews)</span>
              </span>
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

          {/* Price — primary blue is this storefront's established
              commerce accent (see checkout's CTA and the header's cart
              preview), kept for the truly transactional elements only so
              it reads as "this is the money" rather than washing the whole
              page in one color. */}
          <div className="relative overflow-hidden rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 via-blue-50/40 to-background p-4">
            <div className="flex flex-wrap items-end gap-2.5">
              <span className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
                ${displayPrice.toFixed(2)}
              </span>
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
            {!selectedVariant && priceVariesByOption && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Price shown is the starting price — select options below to see the exact price.
              </p>
            )}
            <div className="mt-3 flex items-center gap-2">
              {displayStock > 0 ? (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 ring-1 ring-green-600/15">
                  <Check className="h-3.5 w-3.5" />
                  In stock · {displayStock} available
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600 ring-1 ring-red-600/15">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Out of stock
                </div>
              )}
            </div>
          </div>

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

          {/* Mobile/tablet buy box — the sticky column-3 box only appears at
              xl+; below that this is the only way to buy. */}
          <div className="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/40 to-card p-4 shadow-sm xl:hidden">
            <BuyBoxContent
              quantity={quantity}
              setQuantity={setQuantity}
              displayStock={displayStock}
              subtotal={subtotal}
              selectedVariantLabel={selectedVariantLabel}
              selectionHint={selectionHint}
              isAddingToCart={isAddingToCart}
              isBuyingNow={isBuyingNow}
              disabled={displayStock === 0 || (hasVariants && !selectedVariant)}
              onAddToCart={handleAddToCart}
              onBuyNow={handleBuyNow}
              onWishlistToggle={handleWishlistToggle}
              onShare={handleShare}
              isWishlisted={isWishlisted}
            />
          </div>

          {/* Details tabs */}
          <Tabs defaultValue="description" className="space-y-4">
            <TabsList className="h-auto w-full justify-start gap-1 rounded-xl bg-muted/50 p-1 sm:w-auto">
              <TabsTrigger value="description" className="rounded-lg px-5 py-2.5">
                Description
              </TabsTrigger>
              <TabsTrigger value="details" className="rounded-lg px-5 py-2.5">
                Specifications
              </TabsTrigger>
            </TabsList>

            <TabsContent value="description">
              <div className="rounded-2xl border bg-card p-6">
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

          {/* Seller */}
          {product.seller && (
            <div className="rounded-2xl border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <Link href={`/sellers/${product.seller.id}`} className="group flex min-w-0 items-center gap-3">
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted ring-1 ring-border">
                    {product.seller.storeLogo ? (
                      <Image
                        src={product.seller.storeLogo}
                        alt={product.seller.storeName}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    ) : (
                      <Store className="h-5 w-5 text-primary" />
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
                    {product.seller.storeAddress && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{product.seller.storeAddress}</span>
                      </div>
                    )}
                  </div>
                </Link>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/sellers/${product.seller.id}`}>
                    Visit Store
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {/* Shipping */}
          <div className="rounded-2xl border bg-muted/20 p-4">
            <div className="flex items-start gap-3">
              <Truck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0 text-sm">
                <p className="font-medium text-foreground">
                  {product.seller?.storeAddress
                    ? `Ships from ${product.seller.storeAddress}`
                    : 'Shipping'}
                </p>
                <p className="mt-0.5 text-muted-foreground">
                  Cost and delivery estimate are calculated at checkout based on your address.
                  {settings?.enableCOD && ' Cash on Delivery available.'}
                </p>
              </div>
            </div>
          </div>

          {/* Trust badges */}
          <div className="grid gap-3 sm:grid-cols-2">
            {TRUST_ITEMS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 rounded-xl border bg-muted/20 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-xs font-medium leading-snug text-muted-foreground sm:text-sm">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3 — Sticky buy box (xl+ only) */}
        <div className="hidden xl:sticky xl:top-24 xl:block xl:self-start">
          <div className="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/40 to-card p-5 shadow-sm">
            <BuyBoxContent
              quantity={quantity}
              setQuantity={setQuantity}
              displayStock={displayStock}
              subtotal={subtotal}
              selectedVariantLabel={selectedVariantLabel}
              selectionHint={selectionHint}
              isAddingToCart={isAddingToCart}
              isBuyingNow={isBuyingNow}
              disabled={displayStock === 0 || (hasVariants && !selectedVariant)}
              onAddToCart={handleAddToCart}
              onBuyNow={handleBuyNow}
              onWishlistToggle={handleWishlistToggle}
              onShare={handleShare}
              isWishlisted={isWishlisted}
            />
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
    </div>
  );
}

// Shared between the sticky xl+ sidebar and the inline mobile/tablet card —
// same real state and handlers, just two different places to render it.
function BuyBoxContent({
  quantity,
  setQuantity,
  displayStock,
  subtotal,
  selectedVariantLabel,
  selectionHint,
  isAddingToCart,
  isBuyingNow,
  disabled,
  onAddToCart,
  onBuyNow,
  onWishlistToggle,
  onShare,
  isWishlisted,
}: {
  quantity: number;
  setQuantity: (q: number) => void;
  displayStock: number;
  subtotal: number;
  selectedVariantLabel: string | null;
  selectionHint: string | null;
  isAddingToCart: boolean;
  isBuyingNow: boolean;
  disabled: boolean;
  onAddToCart: () => void;
  onBuyNow: () => void;
  onWishlistToggle: () => void;
  onShare: () => void;
  isWishlisted: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Set quantity</p>
        {displayStock > 0 && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Package className="h-3.5 w-3.5" />
            Stock: {displayStock}
          </span>
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

      <QuantitySelector quantity={quantity} setQuantity={setQuantity} max={displayStock} />

      <Separator />

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Subtotal</span>
        <span className="text-xl font-bold text-primary">${subtotal.toFixed(2)}</span>
      </div>

      <div className="flex flex-col gap-2">
        {/* Same primary-blue gradient as checkout's "Place Order" — the
            two moments in the funnel that actually move money should look
            like the same action, not two different brands. */}
        <Button
          size="lg"
          className="h-12 w-full bg-gradient-to-r from-primary to-blue-600 text-base font-semibold text-white shadow-md shadow-primary/20 transition hover:-translate-y-0.5 hover:from-blue-900 hover:to-blue-700 hover:shadow-lg disabled:translate-y-0 disabled:shadow-md"
          disabled={disabled || isBuyingNow}
          onClick={onBuyNow}
        >
          {isBuyingNow ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Zap className="mr-2 h-5 w-5" />
          )}
          Buy Now
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-12 w-full border-primary text-base font-semibold text-primary hover:bg-blue-50 hover:text-primary"
          disabled={disabled || isAddingToCart}
          onClick={onAddToCart}
        >
          {isAddingToCart ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <ShoppingCart className="mr-2 h-5 w-5" />
          )}
          Add to Cart
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="h-10 flex-1"
          onClick={onWishlistToggle}
          aria-label="Add to wishlist"
        >
          <Heart className={cn('mr-2 h-4 w-4 transition-colors', isWishlisted && 'fill-red-600 text-red-600')} />
          Wishlist
        </Button>
        <Button variant="outline" className="h-10 w-10 p-0" onClick={onShare} aria-label="Share product">
          <Share2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
