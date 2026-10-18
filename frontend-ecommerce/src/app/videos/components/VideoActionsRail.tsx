import Link from 'next/link';
import Image from 'next/image';
import { Plus, ShoppingBag, Music2 } from 'lucide-react';
import { Video } from '@/types/video';
import { useSellerFollow } from '@/hooks/video/useSellerFollow';
import { LikeButton } from './LikeButton';
import { SaveButton } from './SaveButton';
import { ShareButton } from './ShareButton';
import { CommentButton } from './CommentButton';

interface VideoActionsRailProps {
  video: Video;
  onOpenComments: () => void;
}

export function VideoActionsRail({ video, onOpenComments }: VideoActionsRailProps) {
  const creator = video.product?.seller;
  // Hook must run unconditionally (creator may be null) — toggleFollow is
  // simply never wired up to a control when there's no creator to follow.
  const { toggleFollow, isToggling } = useSellerFollow(
    creator ?? { id: 0, storeName: '', storeLogo: null, isVerified: false, followersCount: 0 },
    video.isFollowingCreator,
  );

  return (
    <div className="pointer-events-auto flex shrink-0 flex-col items-center gap-3 sm:gap-4">
      {creator && (
        <div className="relative h-9 w-9 shrink-0 sm:h-11 sm:w-11">
          <div className="relative h-full w-full overflow-hidden rounded-full border-2 border-white bg-neutral-200 shadow-sm">
            {creator.storeLogo ? (
              <Image src={creator.storeLogo} alt={creator.storeName} fill sizes="44px" className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-neutral-500">
                {creator.storeName.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          {/* Desktop/tablet already has a Follow/Following pill in
              CreatorHeader — this "+" badge is the mobile/tablet
              replacement for that affordance, so it only shows up where
              CreatorHeader is hidden (see VideoFeedItem). Hides once
              followed rather than flipping to a checkmark, matching the
              redesign reference. */}
          {!video.isFollowingCreator && (
            <button
              type="button"
              onClick={toggleFollow}
              disabled={isToggling}
              aria-label={`Follow ${creator.storeName}`}
              className="absolute -bottom-1 left-1/2 flex h-4 w-4 -translate-x-1/2 items-center justify-center rounded-full bg-rose-600 text-white shadow ring-2 ring-black/10 disabled:opacity-60 lg:hidden"
            >
              <Plus className="h-2.5 w-2.5" strokeWidth={3} />
            </button>
          )}
        </div>
      )}

      {video.allowLikes && <LikeButton video={video} />}
      {video.allowComments && <CommentButton video={video} onOpen={onOpenComments} />}
      {video.allowSave && <SaveButton video={video} />}
      {video.allowSharing && <ShareButton video={video} />}

      {/* Shop-shortcut and sound-disc icons stay desktop/tablet-only — on
          mobile the product card below already carries the shopping CTA,
          so repeating it here would be redundant against the redesign
          reference. */}
      {video.enableShopping && video.product && (
        <Link
          href={`/products/${video.product.slug}`}
          aria-label={`Shop ${video.product.name}`}
          className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:bg-white active:scale-95 lg:flex lg:h-11 lg:w-11"
        >
          <ShoppingBag className="h-5 w-5 text-neutral-800" />
        </Link>
      )}

      <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900/80 text-white lg:flex">
        <Music2 className="h-4 w-4" />
      </span>
    </div>
  );
}
