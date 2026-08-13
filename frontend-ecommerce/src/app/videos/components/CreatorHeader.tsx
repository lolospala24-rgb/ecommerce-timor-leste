import Image from 'next/image';
import { BadgeCheck } from 'lucide-react';
import { Video } from '@/types/video';
import { FollowButton } from './FollowButton';

function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

interface CreatorHeaderProps {
  video: Video;
}

export function CreatorHeader({ video }: CreatorHeaderProps) {
  const creator = video.product?.seller;
  if (!creator) return null;

  return (
    <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-black/30 py-1.5 pl-1.5 pr-3 backdrop-blur-sm">
      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/40 bg-neutral-200">
        {creator.storeLogo ? (
          <Image src={creator.storeLogo} alt={creator.storeName} fill sizes="36px" className="object-cover" />
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

      <FollowButton creator={creator} isFollowing={video.isFollowingCreator} size="sm" />
    </div>
  );
}
