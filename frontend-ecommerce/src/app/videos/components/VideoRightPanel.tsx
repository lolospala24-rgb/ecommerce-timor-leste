'use client';

import Image from 'next/image';
import Link from 'next/link';
import { BadgeCheck, ShoppingCart, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { Video } from '@/types/video';
import { useCart } from '@/hooks/useCart';
import { formatCurrency, formatCompactNumber } from '@/lib/formatters';
import { FollowButton } from './FollowButton';
import { VideoCommentsPanel } from './VideoCommentsPanel';
import { VideoUpNext } from './VideoUpNext';

interface VideoRightPanelProps {
  video: Video;
  upNext: Video[];
  onSelectUpNext: (videoId: number) => void;
}

// The persistent desktop (lg+) companion panel for whichever video is
// currently active in the feed — mobile/tablet keep the existing overlay +
// drawer pattern (VideoActionsRail / ProductShoppingCard / CommentDrawer)
// untouched. Every section here reuses real data already on `video` or
// already-fetched hooks; nothing is fabricated (e.g. the reference design
// shows a product rating and a multi-product list, neither of which the
// current data model has — a video carries at most one product with no
// rating field — so this shows exactly what's real instead of inventing
// numbers).
export function VideoRightPanel({ video, upNext, onSelectUpNext }: VideoRightPanelProps) {
  const { addToCart } = useCart();
  const product = video.product;
  const creator = product?.seller;

  const handleAddToCart = async () => {
    if (!product || product.stock <= 0) return;
    await addToCart(product, 1);
    toast.success('Product added to cart');
  };

  return (
    <aside className="hidden h-full w-[360px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-neutral-200 bg-neutral-50/60 p-4 xl:flex">
      {product && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-900">Products in this video</h3>
            <span className="text-xs font-medium text-neutral-400">1 Product</span>
          </div>

          <Link
            href={`/products/${product.slug}`}
            className="mt-3 flex items-center gap-3 rounded-xl p-1.5 transition hover:bg-neutral-50"
          >
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
              {product.thumbnail ? (
                <Image src={product.thumbnail} alt={product.name} fill sizes="56px" className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-neutral-300">
                  <Package className="h-6 w-6" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-neutral-900">{product.name}</p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="text-sm font-bold text-rose-600">{formatCurrency(product.price)}</span>
                {product.comparePrice != null && product.comparePrice > product.price && (
                  <span className="text-xs text-neutral-400 line-through">{formatCurrency(product.comparePrice)}</span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                void handleAddToCart();
              }}
              disabled={product.stock <= 0}
              aria-label="Add to cart"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-40"
            >
              <ShoppingCart className="h-4 w-4" />
            </button>
          </Link>
        </div>
      )}

      <VideoCommentsPanel videoId={video.id} />

      {creator && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-neutral-900">About the seller</h3>
          <div className="mt-3 flex items-center gap-3">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-neutral-200">
              {creator.storeLogo ? (
                <Image src={creator.storeLogo} alt={creator.storeName} fill sizes="44px" className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-neutral-500">
                  {creator.storeName.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="truncate text-sm font-semibold text-neutral-900">{creator.storeName}</span>
                {creator.isVerified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 fill-sky-500 text-white" />}
              </div>
              <p className="text-xs text-neutral-500">{formatCompactNumber(creator.followersCount)} Followers</p>
            </div>
            <FollowButton creator={creator} isFollowing={video.isFollowingCreator} size="sm" />
          </div>
        </div>
      )}

      <VideoUpNext videos={upNext} onSelect={onSelectUpNext} />
    </aside>
  );
}
