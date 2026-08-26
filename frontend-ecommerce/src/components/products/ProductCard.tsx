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
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { RatingStars } from '@/components/shared/RatingStars';
import { ShoppingCart, Heart, Eye, Loader2, Bell, BellRing } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import toast from 'react-hot-toast';
import {
  useNotifyMeStatus,
  useSubscribeNotifyMe,
  useUnsubscribeNotifyMe,
} from '@/hooks/useStockNotifications';

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
    thumbnail: string | null;
    stock: number;
    isActive: boolean;
    isFeatured?: boolean;
    createdAt?: string;
    rating?: number;
    totalReviews?: number;
  };
  /** Set by sections that already know every product they render is local
   *  (e.g. the Local Products section) — there's no generic per-product
   *  "is local" flag from the API, so this is opt-in rather than guessed. */
  isLocal?: boolean;
}

export function ProductCard({ product, isLocal = false }: ProductCardProps) {
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

  const discount = product.comparePrice && product.comparePrice > product.price
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : 0;

  const isNew = useMemo(() => {
    if (!product.createdAt) return false;
    const ageMs = Date.now() - new Date(product.createdAt).getTime();
    return ageMs >= 0 && ageMs <= NEW_PRODUCT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  }, [product.createdAt]);

  const stockStatus = product.stock === 0
    ? { label: t('product.outOfStock'), className: 'text-destructive' }
    : product.stock <= LOW_STOCK_THRESHOLD
      ? { label: t('product.onlyLeft', { count: product.stock }), className: 'text-amber-600' }
      : { label: t('product.inStock'), className: 'text-green-600' };

  // Capped to the single most relevant status badge (plus the discount
  // badge below, so 2 max) — stacking new+popular+local at once crowded
  // the image corner on narrow mobile cards and, realistically, buyers
  // only register the first one or two badges anyway.
  const statusBadges = [
    isNew && { key: 'new', label: t('product.badge.new'), className: 'bg-blue-600 text-white hover:bg-blue-600' },
    product.isFeatured && { key: 'popular', label: t('product.badge.popular'), className: 'bg-amber-500 text-white hover:bg-amber-500' },
    isLocal && { key: 'local', label: t('product.badge.local'), className: 'bg-secondary text-secondary-foreground hover:bg-secondary' },
  ]
    .filter((b): b is { key: string; label: string; className: string } => !!b)
    .slice(0, 1);

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
      <Card className="group flex h-full flex-col overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
        <div className="relative aspect-square overflow-hidden bg-slate-100">
          <Link href={`/products/${product.slug}`} aria-label={product.name}>
            <Image
              src={imageSrc}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              onError={() => setImageError(true)}
            />
          </Link>

          {/* Badge stack */}
          <div className="absolute left-2 top-2 z-10 flex flex-col gap-1.5">
            {discount > 0 && (
              <Badge className="bg-red-600 text-white hover:bg-red-600">-{discount}%</Badge>
            )}
            {statusBadges.map((badge) => (
              <Badge key={badge.key} className={badge.className}>{badge.label}</Badge>
            ))}
          </div>

          {product.stock === 0 && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60">
              <Badge className="bg-red-600 px-4 py-2 text-sm text-white">{t('product.outOfStock')}</Badge>
            </div>
          )}

          {/* Always visible on touch devices; fades in on hover for pointer devices */}
          <div className="absolute right-2 top-2 z-20 flex flex-col gap-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 rounded-full shadow-md"
              onClick={handleWishlist}
              aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Heart className={cn('h-4 w-4', isWishlisted && 'fill-red-600 text-red-600')} />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 rounded-full shadow-md"
              onClick={handleQuickView}
              aria-label="Quick view"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Link href={`/products/${product.slug}`} className="flex flex-1 flex-col">
          <CardContent className="flex-1 p-4 pb-2">
            <h3 className="line-clamp-2 min-h-[2.5rem] font-medium leading-tight group-hover:text-primary transition-colors">
              {product.name}
            </h3>

            <div className="mt-2">
              <RatingStars
                rating={product.rating || 0}
                totalReviews={product.totalReviews ?? 0}
                showCount
                size="sm"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col items-start gap-1 p-4 pt-0">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-lg font-bold text-primary">
                ${typeof product.price === 'number' ? product.price.toFixed(2) : '0.00'}
              </span>
              {discount > 0 && product.comparePrice && (
                <span className="text-sm text-muted-foreground line-through">
                  ${product.comparePrice.toFixed(2)}
                </span>
              )}
            </div>
            {discount > 0 && product.comparePrice && (
              <p className="text-xs font-semibold text-red-600">
                {t('product.save', { amount: (product.comparePrice - product.price).toFixed(2) })}
              </p>
            )}
            <p className={cn('text-xs font-medium', stockStatus.className)}>
              {stockStatus.label}
            </p>
          </CardFooter>
        </Link>

        <div className="px-4 pb-4">
          {isOutOfStock ? (
            <Button
              size="sm"
              variant={isSubscribed ? 'secondary' : 'outline'}
              className="w-full"
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
            <Button
              size="sm"
              className="w-full"
              onClick={handleAddToCart}
              disabled={isAddingToCart}
            >
              {isAddingToCart ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('product.adding')}
                </>
              ) : (
                <>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {t('product.addToCart')}
                </>
              )}
            </Button>
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
