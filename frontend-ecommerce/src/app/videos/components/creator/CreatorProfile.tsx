'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Creator } from '@/types/creator';
import { FollowButton } from './FollowButton';
import { CreatorStats } from './CreatorStats';
import { CreatorTabs } from './CreatorTabs';
import { CreatorStoreButton } from './CreatorStoreButton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, MessageCircle, Share2, Calendar, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreatorProfileProps {
  creator: Creator;
  className?: string;
}

export function CreatorProfile({ creator, className }: CreatorProfileProps) {
  const [isFollowing, setIsFollowing] = useState(creator.isFollowed);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Cover Image */}
      <div className="relative h-32 rounded-2xl overflow-hidden bg-gradient-to-r from-[#FF3B5C]/20 to-[#6366F1]/20">
        {creator.coverImage && (
          <Image
            src={creator.coverImage}
            alt={creator.name}
            fill
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0D] to-transparent" />
      </div>

      {/* Profile Header */}
      <div className="relative -mt-12 px-4">
        <div className="flex items-end gap-4">
          <div className="relative">
            <Avatar className="h-24 w-24 ring-4 ring-[#0B0B0D]">
              <AvatarImage src={creator.avatar} alt={creator.name} />
              <AvatarFallback className="bg-gradient-to-br from-[#FF3B5C] to-[#6366F1] text-white text-2xl">
                {creator.name[0]}
              </AvatarFallback>
            </Avatar>
            {creator.isVerified && (
              <Badge className="absolute -bottom-0.5 -right-0.5 bg-[#6366F1] text-white p-0.5 h-5 w-5 flex items-center justify-center rounded-full">
                <CheckCircle className="h-3.5 w-3.5" />
              </Badge>
            )}
          </div>

          <div className="flex-1 min-w-0 pb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-white">{creator.name}</h1>
              <span className="text-sm text-[#A3A3A3]">@{creator.username}</span>
            </div>
            <p className="text-sm text-[#A3A3A3]">{creator.bio}</p>
          </div>

          <div className="flex items-center gap-2 pb-2">
            <FollowButton
              creatorId={creator.id}
              isFollowing={isFollowing}
              onToggle={() => setIsFollowing(!isFollowing)}
              size="default"
            />
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 border-[rgba(255,255,255,0.08)] text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C]"
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 border-[rgba(255,255,255,0.08)] text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C]"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <CreatorStats creator={creator} />

      {/* Store Button */}
      {creator.storeName && (
        <CreatorStoreButton storeName={creator.storeName} storeUrl={creator.storeUrl} />
      )}

      {/* Tabs */}
      <CreatorTabs creator={creator} />
    </div>
  );
}