'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWishlistStore } from '@/stores/wishlistStore';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Loader2, Bell, BellRing, MapPin, Star, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import toast from 'react-hot-toast';
import {
  useNotifyMeStatus,
  useSubscribeNotifyMe,
  useUnsubscribeNotifyMe,
} from '@/hooks/useStockNotifications';
import { getProductPricing } from '@/lib/pricing';
import type { ActivePromotion } from '@/types/product.types';

const PLACEHOLDER_IMAGE = '/images/placeholder.png';
// A product created within this many days is badged "New" — a display
// convenience derived from the real createdAt timestamp, not a business
// decision, so it's fine to compute here rather than have the backend flag it.
const NEW_PRODUCT_WINDOW_DAYS = 14;
const LOW_STOCK_THRESHOLD = 5;

interface ProductCardProps {
  product: {
    id: number;
    name: string;
    slug: string;
    price: number;
    comparePrice?: number | null;
    effectivePrice?: number;
    promotion?: ActivePromotion | null;
    thumbnail: string | null;
    stock: number;
    isActive: boolean;
    isFeatured?: boolean;
    hasVariants?: boolean;
    createdAt?: string;
    rating?: number;
    totalReviews?: number;
    /** Server-resolved — never re-derive origin client-side from seller/product fields directly. */
    resolvedOrigin?: {
      municipality: string;
      postoAdmin: string | null;
      suco: string | null;
      aldeia: string | null;
    } | null;
    seller?: { storeName?: string } | null;
  };
  /** Whether this product is locally made in Timor-Leste. Callers pass
   *  product.isLocallyMade explicitly (no default guess here) so a card
   *  never mislabels a product just because it forgot to wire the flag. */
  isLocal?: boolean;
  /** Set for the first few cards in an above-the-fold grid so the image
   *  loads eagerly instead of lazily — one of these is typically the page's
   *  LCP element, and lazy-loading it directly delays LCP. */
  priority?: boolean;
}

export function ProductCard({ product, isLocal = false, priority = false }: ProductCardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [imageError, setImageError] = useState(false);
  const { toggleItem, isInWishlist } = useWishlistStore();
  const { isAuthenticated } = useAuthStore();
  const addItem = useCartStore((state) => state.addItem);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const isWishlisted = isInWishlist(product.id);

  const isOutOfStock = product.stock === 0;
  const { data: notifyStatus } = useNotifyMeStatus(product.id, isAuthenticated && isOutOfStock);
  const subscribeNotifyMe = useSubscribeNotifyMe(product.id);
  const unsubscribeNotifyMe = useUnsubscribeNotifyMe(product.id);
  const isSubscribed = !!notifyStatus?.subscribed;

  const handleNotifyMe = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error('Please login to get notified');
      return;
    }
    try {
      if (isSubscribed) {
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

  const pricing = getProductPricing(product);

  const isNew = useMemo(() => {
    if (!product.createdAt) return false;
    const ageMs = Date.now() - new Date(product.createdAt).getTime();
    return ageMs >= 0 && ageMs <= NEW_PRODUCT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  }, [product.createdAt]);

  const stockStatus = product.stock === 0
    ? { label: t('product.outOfStock'), textClassName: 'text-destructive', dotClassName: 'bg-destructive' }
    : product.stock <= LOW_STOCK_THRESHOLD
      ? { label: t('product.onlyLeft', { count: product.stock }), textClassName: 'text-amber-700 dark:text-amber-400', dotClassName: 'bg-amber-500' }
      : { label: t('product.inStock'), textClassName: 'text-green-700 dark:text-green-400', dotClassName: 'bg-green-600' };

  // Every candidate badge in one priority-ordered list — Discount > Local >
  // New > Popular — capped at 2 total across the whole card (not 2 per
  // corner), so a locally-made, freshly-listed, on-sale product shows its
  // discount + Local only, never a third/fourth badge crowding the image.
  type BadgeDef = { key: string; label: string; className: string };
  const discountBadge: BadgeDef | null = pricing.badgeLabel
    ? { key: 'discount', label: pricing.badgeLabel, className: 'bg-red-600 text-white' }
    : null;
  const localBadge: BadgeDef | null = isLocal
    ? { key: 'local', label: t('product.badge.local'), className: 'bg-secondary text-secondary-foreground' }
    : null;
  // New/Popular share one neutral style — only Local (a real differentiator)
  // and the discount badge get color.
  const newBadge: BadgeDef | null = isNew
    ? { key: 'new', label: t('product.badge.new'), className: 'bg-foreground text-background' }
    : null;
  const popularBadge: BadgeDef | null = product.isFeatured
    ? { key: 'popular', label: t('product.badge.popular'), className: 'bg-foreground text-background' }
    : null;
  const shownBadges = [discountBadge, localBadge, newBadge, popularBadge]
    .filter((b): b is BadgeDef => !!b)
    .slice(0, 2);
  const shownDiscountBadge = shownBadges.find((b) => b.key === 'discount') ?? null;
  const statusBadges = shownBadges.filter((b) => b.key !== 'discount');

  const imageSrc = imageError || !product.thumbnail ? PLACEHOLDER_IMAGE : product.thumbnail;
  const hasRating = (product.totalReviews ?? 0) > 0;

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error('Please login to add to wishlist');
      return;
    }
    try {
      await toggleItem(product);
    } catch (error) {
      toast.error('Failed to update wishlist');
    }
  };

  // Variant-bearing products can't be added straight from a listing card —
  // the customer has to choose Size/Warna/etc first, which only the product
  // page's selector can do — so the cart icon just takes them there instead
  // of silently adding the wrong (or no) variant.
  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.hasVariants) {
      router.push(`/products/${product.slug}`);
      return;
    }
    if (!isAuthenticated) {
      toast.error('Please login to add to cart');
      return;
    }
    setIsAddingToCart(true);
    try {
      await addItem(product, 1, null);
    } catch {
      // addItem already surfaces its own error toast.
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <Card className="group flex h-full flex-col overflow-hidden rounded-xl border shadow-none transition-shadow hover:shadow-md">
      <div className="relative aspect-square overflow-hidden bg-muted/40">
        <Link href={`/products/${product.slug}`} aria-label={product.name}>
          <Image
            src={imageSrc}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            priority={priority}
            loading={priority ? undefined : 'lazy'}
            onError={() => setImageError(true)}
          />
        </Link>

        {shownDiscountBadge && (
          <Badge className="absolute left-2.5 top-2.5 z-10 rounded-md border-0 bg-red-600 px-2 py-1 text-white hover:bg-red-600">
            {shownDiscountBadge.label}
          </Badge>
        )}

        {statusBadges.length > 0 && (
          <div className="absolute bottom-2.5 left-2.5 z-10 flex flex-col gap-1">
            {statusBadges.map((badge) => (
              <Badge
                key={badge.key}
                className={cn('w-fit rounded-md border-0 px-2 py-1', badge.className)}
              >
                {badge.label}
              </Badge>
            ))}
          </div>
        )}

        {product.stock === 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/55">
            <Badge className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white">{t('product.outOfStock')}</Badge>
          </div>
        )}

        <button
          type="button"
          onClick={handleWishlist}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          className="absolute right-2.5 top-2.5 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 transition-colors hover:bg-background"
        >
          <Heart className={cn('h-4 w-4 text-foreground', isWishlisted && 'fill-red-600 text-red-600')} />
        </button>
      </div>

      <div className="flex flex-1 flex-col">
      <Link href={`/products/${product.slug}`} className="flex flex-1 flex-col">
        <CardContent className="flex flex-1 flex-col p-2.5 pb-2">
          <h3 className="line-clamp-2 min-h-[2rem] text-xs font-medium leading-tight text-foreground transition-colors group-hover:text-primary">
            {product.name}
          </h3>

          <div className="mt-1.5 flex flex-nowrap items-center gap-x-1.5 overflow-hidden text-[11px]">
            {/* A product with zero reviews shows no rating at all — never a
                fake "⭐ 0.0 (0)". Real rating only, only once it exists. */}
            {hasRating && (
              <>
                <span className="inline-flex shrink-0 items-center gap-0.5">
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                  <span className="font-medium text-foreground">{(product.rating || 0).toFixed(1)}</span>
                  <span className="text-muted-foreground">({product.totalReviews})</span>
                </span>
                <span className="shrink-0 text-border">|</span>
              </>
            )}
            <span className={cn('inline-flex min-w-0 items-center gap-1 truncate font-medium', stockStatus.textClassName)}>
              <span aria-hidden className={cn('h-1.5 w-1.5 shrink-0 rounded-full', stockStatus.dotClassName)} />
              <span className="truncate">{stockStatus.label}</span>
            </span>
          </div>

          {isLocal && product.resolvedOrigin && (
            <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="line-clamp-1">
                {[product.resolvedOrigin.suco, product.resolvedOrigin.municipality]
                  .filter(Boolean)
                  .join(', ')}
                {product.seller?.storeName ? ` · ${product.seller.storeName}` : ''}
              </span>
            </p>
          )}
        </CardContent>
      </Link>

      {/* Price + cart action live outside the title/content Link — a
          <button> nested inside a Next.js Link's <a> is invalid HTML and
          behaves inconsistently across browsers, so the cart action is a
          true sibling here instead, with its own stopPropagation guarding
          navigation. Price keeps its own separate Link (still tappable to
          open the product) since it's not nested inside anything else. */}
      <div className="mt-auto flex items-end justify-between gap-1.5 px-2.5 pb-2.5">
        <Link href={`/products/${product.slug}`} className="flex min-w-0 flex-nowrap items-baseline gap-1.5">
          <span className="text-base font-bold text-primary">
            ${pricing.currentPrice.toFixed(2)}
          </span>
          {pricing.originalPrice != null && (
            <span className="text-[11px] text-muted-foreground line-through">
              ${pricing.originalPrice.toFixed(2)}
            </span>
          )}
        </Link>
        {!isOutOfStock && (
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isAddingToCart}
            aria-label={t('product.addToCart')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {isAddingToCart ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShoppingCart className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
      </div>

      {isOutOfStock && (
        <div className="px-3.5 pb-3.5">
          <Button
            size="sm"
            variant={isSubscribed ? 'secondary' : 'outline'}
            className="w-full rounded-lg"
            onClick={handleNotifyMe}
            disabled={subscribeNotifyMe.isPending || unsubscribeNotifyMe.isPending}
          >
            {subscribeNotifyMe.isPending || unsubscribeNotifyMe.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isSubscribed ? (
              <BellRing className="mr-2 h-4 w-4" />
            ) : (
              <Bell className="mr-2 h-4 w-4" />
            )}
            {isSubscribed ? t('product.notifySubscribed') : t('product.notifyMe')}
          </Button>
        </div>
      )}
    </Card>
  );
}
