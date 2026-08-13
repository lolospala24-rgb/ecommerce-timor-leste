import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, Music2 } from 'lucide-react';
import { Video } from '@/types/video';
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

  return (
    <div className="pointer-events-auto flex shrink-0 flex-col items-center gap-2.5 sm:gap-4">
      {creator && (
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border-2 border-white bg-neutral-200 shadow-sm sm:h-11 sm:w-11">
          {creator.storeLogo ? (
            <Image src={creator.storeLogo} alt={creator.storeName} fill sizes="44px" className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-neutral-500">
              {creator.storeName.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
      )}

      <LikeButton video={video} />
      <CommentButton video={video} onOpen={onOpenComments} />
      <SaveButton video={video} />
      <ShareButton video={video} />

      {video.product && (
        <Link
          href={`/products/${video.product.slug}`}
          aria-label={`Shop ${video.product.name}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:bg-white active:scale-95 sm:h-11 sm:w-11"
        >
          <ShoppingBag className="h-4 w-4 text-neutral-800 sm:h-5 sm:w-5" />
        </Link>
      )}

      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900/80 text-white sm:h-9 sm:w-9">
        <Music2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </span>
    </div>
  );
}
