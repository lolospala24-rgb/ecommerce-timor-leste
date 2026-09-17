'use client';

import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { useCartStore } from '@/stores/cartStore';
import { useWishlistStore } from '@/stores/wishlistStore';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart, Heart, ArrowRight, Loader2, Bell, BellRing, MapPin, Star, Truck } from 'lucide-react';
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

// Only loaded once a shopper actually opens Quick View — keeps the variant
// selector / product-detail logic it pulls in out of every page that
// merely renders a grid of product cards.
const QuickViewModal = dynamic(
  () => import('@/components/modals/QuickViewModal').then((mod) => mod.QuickViewModal),
  { ssr: false },
);

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
    /** When true, this product can't be added to the cart directly — it
     *  needs a variant chosen first (see handleAddToCart). */
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
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const { addItem } = useCartStore();
  const { toggleItem, isInWishlist } = useWishlistStore();
  const { isAuthenticated } = useAuthStore();

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
    ? { label: t('product.outOfStock'), className: 'text-destructive' }
    : product.stock <= LOW_STOCK_THRESHOLD
      ? { label: t('product.onlyLeft', { count: product.stock }), className: 'text-amber-700 dark:text-amber-400' }
      : { label: t('product.inStock'), className: 'text-green-700 dark:text-green-400' };

  // Local always shows when applicable — it's a distinct marketplace feature,
  // not just another status flag, so it must never be silently bumped out by
  // New/Popular. Capped at one additional badge on top of it (plus the
  // discount badge below) to keep the image corner from crowding on mobile.
  // New/Popular deliberately share one neutral style (not their own colors)
  // — only Local (a real differentiator) and the discount badge get color.
  const localBadge = isLocal
    ? { key: 'local', label: t('product.badge.local'), className: 'bg-secondary text-secondary-foreground' }
    : null;
  const otherBadges = [
    isNew && { key: 'new', label: t('product.badge.new'), className: 'bg-foreground text-background' },
    product.isFeatured && { key: 'popular', label: t('product.badge.popular'), className: 'bg-foreground text-background' },
  ]
    .filter((b): b is { key: string; label: string; className: string } => !!b)
    .slice(0, 1);
  const statusBadges = localBadge ? [localBadge, ...otherBadges] : otherBadges;

  const imageSrc = imageError || !product.thumbnail ? PLACEHOLDER_IMAGE : product.thumbnail;

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

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error('Please login to add to cart');
      return;
    }

    if (product.stock === 0) {
      toast.error('Product is out of stock');
      return;
    }

    // The grid has no variant picker — a variant product would otherwise
    // hit the backend's "please select a variant" error with no way to
    // actually choose one from here. Quick View already has the real
    // variant selector, so open that instead of failing silently.
    if (product.hasVariants) {
      setQuickViewOpen(true);
      return;
    }

    setIsAddingToCart(true);
    try {
      await addItem(product, 1);
    } catch (error: any) {
      console.error('Add to cart error:', error);
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQuickViewOpen(true);
  };

  return (
    <>
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

          {pricing.badgeLabel && (
            <Badge className="absolute left-2.5 top-2.5 z-10 rounded-md border-0 bg-red-600 px-2 py-1 text-white hover:bg-red-600">
              {pricing.badgeLabel}
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

        <Link href={`/products/${product.slug}`} className="flex flex-1 flex-col">
          <CardContent className="flex flex-1 flex-col p-3.5 pb-3">
            <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-snug text-foreground transition-colors group-hover:text-primary">
              {product.name}
            </h3>

            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                <span className="font-medium text-foreground">{(product.rating || 0).toFixed(1)}</span>
                <span className="text-muted-foreground">({product.totalReviews ?? 0})</span>
              </span>
              <span className="text-border">|</span>
              <span className={cn('inline-flex items-center gap-1 font-medium', stockStatus.className)}>
                <Truck className="h-3.5 w-3.5" />
                {stockStatus.label}
              </span>
            </div>

            {isLocal && product.resolvedOrigin && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="line-clamp-1">
                  {[product.resolvedOrigin.suco, product.resolvedOrigin.municipality]
                    .filter(Boolean)
                    .join(', ')}
                  {product.seller?.storeName ? ` · ${product.seller.storeName}` : ''}
                </span>
              </p>
            )}

            <div className="mt-auto flex flex-wrap items-baseline gap-2 pt-3">
              <span className="text-lg font-bold text-primary">
                ${pricing.currentPrice.toFixed(2)}
              </span>
              {pricing.originalPrice != null && (
                <span className="text-xs text-muted-foreground line-through">
                  ${pricing.originalPrice.toFixed(2)}
                </span>
              )}
            </div>
          </CardContent>
        </Link>

        <div className="flex items-center gap-2 px-3.5 pb-3.5">
          {isOutOfStock ? (
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
          ) : (
            <>
              <Button
                size="sm"
                className="min-w-0 flex-1 gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-2 text-primary shadow-none hover:bg-primary/15"
                onClick={handleAddToCart}
                disabled={isAddingToCart}
              >
                {isAddingToCart ? (
                  <>
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                    <span className="truncate">{t('product.adding')}</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4 shrink-0" />
                    <span className="truncate">{t('product.addToCart')}</span>
                  </>
                )}
              </Button>
              <Button
                size="icon"
                className="h-9 w-9 shrink-0 rounded-lg"
                onClick={handleQuickView}
                aria-label="Quick view"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </Card>

      {quickViewOpen && (
        <QuickViewModal
          open={quickViewOpen}
          onOpenChange={setQuickViewOpen}
          productId={product.id}
        />
      )}
    </>
  );
}
