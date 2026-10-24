'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { Video } from '@/types/video';
import { FollowButton } from './FollowButton';
import { formatCompactNumber as formatCount } from '@/lib/formatters';

interface CreatorHeaderProps {
  video: Video;
}

export function CreatorHeader({ video }: CreatorHeaderProps) {
  const creator = video.product?.seller;
  // storeLogo being set only means a URL exists, not that it actually
  // loads — a 404/CORS/broken asset otherwise leaves the browser's own
  // broken-image glyph here instead of falling back to the initial-letter
  // avatar below (same fix as VideoActionsRail's mobile avatar).
  const [logoError, setLogoError] = useState(false);
  if (!creator) return null;

  return (
    <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-black/30 py-1.5 pl-1.5 pr-3 backdrop-blur-sm">
      <Link href={`/sellers/${creator.id}`} className="flex min-w-0 items-center gap-3">
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/40 bg-neutral-200">
          {creator.storeLogo && !logoError ? (
            <Image
              src={creator.storeLogo}
              alt={creator.storeName}
              fill
              sizes="36px"
              className="object-cover"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-neutral-500">
              {creator.storeName.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <span className="truncate text-sm font-semibold text-white">{creator.storeName}</span>
            {creator.isVerified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 fill-sky-400 text-white" />}
          </div>
          <span className="text-xs text-white/80">{formatCount(creator.followersCount)} Followers</span>
        </div>
      </Link>

      <FollowButton creator={creator} isFollowing={video.isFollowingCreator} size="sm" />
    </div>
  );
}
