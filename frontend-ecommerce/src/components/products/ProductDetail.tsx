'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCartStore } from '@/stores/cartStore';
import { useWishlistStore } from '@/stores/wishlistStore';
import { useAuthStore } from '@/stores/authStore';
import { useProductVariantSelection } from '@/hooks/useProductVariantSelection';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuantitySelector } from './QuantitySelector';
import { ProductVariantSelector } from './ProductVariantSelector';
import { ProductImages } from './ProductImages';
import { RatingStars } from '@/components/shared/RatingStars';
import { ProductReviews } from './ProductReviews';
import { RelatedProducts } from './RelatedProducts';
import { Product } from '@/types/product.types';
import { formatVariantLabel, parseProductTypeFields, getProductThumbnail } from '@/lib/product';
import { cn } from '@/lib/utils';
import {
  ShoppingCart,
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
  Play,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ProductDetailProps {
  product: Product;
  onAddToCart?: () => void;
}

const TRUST_ITEMS = [
  { icon: Truck, label: 'Free shipping over $50' },
  { icon: Shield, label: '100% authentic products' },
  { icon: RotateCcw, label: '7-day return policy' },
] as const;

export function ProductDetail({ product, onAddToCart }: ProductDetailProps) {
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const { addItem } = useCartStore();
  const { toggleItem, isInWishlist } = useWishlistStore();
  const { isAuthenticated } = useAuthStore();

  const {
    variants,
    hasVariants,
    attributeKeys,
    attributeOptions,
    attributeLabels,
    selectedVariant,
    selectedVariantLabel,
    selectedAttributes,
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

  useEffect(() => {
    if (product?.id) {
      setIsWishlisted(isInWishlist(product.id));
    }
  }, [product, isInWishlist]);

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to add items to cart');
      return;
    }
    if (hasVariants && !selectedVariant) {
      toast.error('Please select a variant');
      return;
    }
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

      {/* Main product section */}
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-16">
        {/* Gallery */}
        <div className="lg:sticky lg:top-24 lg:self-start space-y-4">
          {/* Video Section with Badge */}
          {product.videoUrl && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1.5 rounded-full bg-blue-50 text-blue-700 border-blue-200">
                  <Play className="h-3.5 w-3.5" />
                  Product Video
                </Badge>
              </div>
              <div className="group overflow-hidden rounded-2xl border-2 border-blue-100 bg-slate-950 shadow-lg hover:shadow-xl transition-shadow">
                <div className="relative aspect-video w-full bg-slate-900">
                  <video
                    controls
                    preload="metadata"
                    poster={getProductThumbnail(product)}
                    className="w-full h-full bg-black object-cover"
                  >
                    <source src={product.videoUrl} />
                    Your browser does not support the video tag.
                  </video>
                  
                  {/* Fallback overlay for when video hasn't started */}
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-black/40 via-transparent to-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform group-hover:scale-110">
                      <Play className="h-7 w-7 fill-slate-950 text-slate-950 ml-0.5" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Images Section with Badge */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1.5 rounded-full">
                <Layers className="h-3.5 w-3.5" />
                Product Images
              </Badge>
            </div>
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
        </div>

        {/* Product info */}
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="space-y-3">
            {product.category && (
              <Link
                href={`/categories/${product.category.slug}`}
                className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-primary hover:underline"
              >
                {product.category.name}
              </Link>
            )}

            <h1 className="text-2xl font-bold leading-tight text-foreground sm:text-3xl lg:text-4xl">
              {product.name}
            </h1>

            {product.nameTetum && (
              <p className="text-base text-muted-foreground">{product.nameTetum}</p>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <RatingStars rating={product.rating || 0} size="md" />
              <span className="text-sm text-muted-foreground">
                {product.totalReviews || 0} reviews
              </span>
              {displaySku && (
                <span className="hidden text-sm text-muted-foreground sm:inline">
                  · SKU: <span className="font-mono text-foreground">{displaySku}</span>
                </span>
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

          {/* Price card */}
          <div className="rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-background p-5 shadow-sm">
            <div className="flex flex-wrap items-end gap-3">
              <span className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
                ${displayPrice.toFixed(2)}
              </span>
              {displayComparePrice && displayComparePrice > displayPrice && (
                <span className="pb-1 text-lg text-muted-foreground line-through">
                  ${displayComparePrice.toFixed(2)}
                </span>
              )}
              {discount > 0 && (
                <Badge className="mb-1 border-0 bg-red-500/10 text-red-600 hover:bg-red-500/10">
                  Save ${savings.toFixed(2)} ({discount}%)
                </Badge>
              )}
            </div>

            <div className="mt-4 flex items-center gap-2">
              {displayStock > 0 ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 ring-1 ring-green-600/15">
                  <Check className="h-4 w-4" />
                  In stock · {displayStock} available
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 ring-1 ring-red-600/15">
                  <AlertCircle className="h-4 w-4" />
                  Out of stock
                </div>
              )}
            </div>
          </div>

          {/* Short description */}
          <p className="text-sm leading-relaxed text-muted-foreground line-clamp-4 sm:text-base">
            {product.description}
          </p>

          {product.seller && (
            <Link
              href={`/sellers/${product.seller.id}`}
              className="inline-flex w-fit items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm transition-colors hover:bg-muted/60"
            >
              <Store className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Sold by</span>
              <span className="font-medium text-foreground">{product.seller.storeName}</span>
            </Link>
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

          {/* Purchase box */}
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Quantity</p>
                <QuantitySelector
                  quantity={quantity}
                  setQuantity={setQuantity}
                  max={displayStock}
                />
              </div>
              {selectedVariantLabel && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Tag className="h-4 w-4 shrink-0" />
                  <span>{selectedVariantLabel}</span>
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                className="h-12 flex-1 text-base font-semibold shadow-md"
                disabled={displayStock === 0 || isAddingToCart || (hasVariants && !selectedVariant)}
                onClick={handleAddToCart}
              >
                {isAddingToCart ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Adding to cart...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Add to Cart
                  </>
                )}
              </Button>
              <div className="flex gap-2 sm:shrink-0">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 w-12 p-0"
                  onClick={handleWishlistToggle}
                  aria-label="Add to wishlist"
                >
                  <Heart
                    className={cn(
                      'h-5 w-5 transition-colors',
                      isWishlisted && 'fill-red-500 text-red-500',
                    )}
                  />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 w-12 p-0"
                  onClick={handleShare}
                  aria-label="Share product"
                >
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Trust badges */}
          <div className="grid gap-3 sm:grid-cols-3">
            {TRUST_ITEMS.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-xl border bg-muted/20 px-4 py-3"
              >
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
      </div>

      {/* Tabs */}
      <Tabs defaultValue="description" className="space-y-6">
        <TabsList className="h-auto w-full justify-start gap-1 rounded-xl bg-muted/50 p-1 sm:w-auto">
          <TabsTrigger value="description" className="rounded-lg px-5 py-2.5">
            Description
          </TabsTrigger>
          <TabsTrigger value="reviews" className="rounded-lg px-5 py-2.5">
            Reviews ({product.totalReviews || 0})
          </TabsTrigger>
          <TabsTrigger value="details" className="rounded-lg px-5 py-2.5">
            Specifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="description">
          <div className="rounded-2xl border bg-card p-6 sm:p-8">
            <div className="prose prose-sm max-w-none sm:prose-base">
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

        <TabsContent value="reviews">
          <div className="rounded-2xl border bg-card p-6">
            <ProductReviews productId={product.id} />
          </div>
        </TabsContent>

        <TabsContent value="details">
          <div className="rounded-2xl border bg-card p-6 sm:p-8 space-y-8">
            <div>
              <h3 className="mb-5 text-lg font-semibold">Product specifications</h3>
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
                {product.brand && (
                  <div className="grid grid-cols-2 gap-4 px-4 py-3.5 sm:grid-cols-3">
                    <dt className="text-sm text-muted-foreground">Brand</dt>
                    <dd className="col-span-1 text-sm font-medium sm:col-span-2">
                      {product.brand}
                    </dd>
                  </div>
                )}
                {product.specifications &&
                  Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-2 gap-4 px-4 py-3.5 sm:grid-cols-3">
                      <dt className="text-sm text-muted-foreground">{key}</dt>
                      <dd className="col-span-1 text-sm font-medium sm:col-span-2">
                        {String(value)}
                      </dd>
                    </div>
                  ))}
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
                              className={cn(
                                'transition-colors',
                                isSelected && 'bg-primary/5',
                              )}
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
                                      ? 'border-green-200 text-green-700'
                                      : 'border-red-200 text-red-700',
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

      <RelatedProducts currentProductId={product.id} />
    </div>
  );
}
