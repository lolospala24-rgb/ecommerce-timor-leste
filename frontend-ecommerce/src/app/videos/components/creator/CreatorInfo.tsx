'use client';

import { Creator } from '@/types/creator';
import { FollowButton } from './FollowButton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckCircle } from 'lucide-react';

interface CreatorInfoProps {
  creator: Creator;
}

export function CreatorInfo({ creator }: CreatorInfoProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-[#151515] rounded-xl border border-[rgba(255,255,255,0.05)]">
      <Avatar className="h-10 w-10">
        <AvatarImage src={creator.avatar} alt={creator.name} />
        <AvatarFallback className="bg-gradient-to-br from-[#FF3B5C] to-[#6366F1] text-white font-bold">
          {creator.name[0]}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-white">{creator.name}</span>
          {creator.isVerified && <CheckCircle className="h-3.5 w-3.5 text-[#6366F1]" />}
        </div>
        <p className="text-xs text-[#A3A3A3]">
          {(creator?.followers ?? 0).toLocaleString()} followers
          {creator.storeName && ` • ${creator.storeName}`}
        </p>
      </div>

      <FollowButton
        creatorId={creator.id}
        isFollowing={false}
        onToggle={() => {}}
        size="sm"
      />
    </div>
  );
}