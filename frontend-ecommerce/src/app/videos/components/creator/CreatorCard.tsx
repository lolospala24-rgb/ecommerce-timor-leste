'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Creator } from '@/types/creator';
import { FollowButton } from './FollowButton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, MessageCircle, Store } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreatorCardProps {
  creator: Creator;
  variant?: 'default' | 'compact' | 'featured';
  className?: string;
}

export function CreatorCard({ creator, variant = 'default', className }: CreatorCardProps) {
  const [isFollowing, setIsFollowing] = useState(creator.isFollowed);
  const [followers, setFollowers] = useState(creator.followers);

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    setFollowers(isFollowing ? followers - 1 : followers + 1);
  };

  if (variant === 'compact') {
    return (
      <Link
        href={`/creators/${creator.username}`}
        className={cn(
          'flex items-center gap-3 p-2 rounded-lg hover:bg-[#1C1C1C] transition-all duration-200 group',
          className
        )}
      >
        <Avatar className="h-10 w-10 ring-2 ring-[rgba(255,255,255,0.05)] hover:ring-[#6366F1]/30 transition-all">
          <AvatarImage src={creator.avatar} alt={creator.name} />
          <AvatarFallback className="bg-gradient-to-br from-[#FF3B5C] to-[#6366F1] text-white">
            {creator.name[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-white group-hover:text-[#6366F1] transition-colors truncate">
              {creator.name}
            </span>
            {creator.isVerified && (
              <CheckCircle className="h-3.5 w-3.5 text-[#6366F1] flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-[#A3A3A3]">
            {followers.toLocaleString()} followers
          </p>
        </div>
        <FollowButton
          creatorId={creator.id}
          isFollowing={isFollowing}
          onToggle={handleFollow}
          size="sm"
          variant="outline"
        />
      </Link>
    );
  }

  if (variant === 'featured') {
    return (
      <motion.div
        whileHover={{ y: -4 }}
        className={cn(
          'bg-[#151515] rounded-xl overflow-hidden border border-[rgba(255,255,255,0.05)] transition-all duration-300 hover:border-[#6366F1]/20 hover:shadow-xl hover:shadow-[#6366F1]/5',
          className
        )}
      >
        {/* Cover/Banner */}
        <div className="relative h-24 bg-gradient-to-r from-[#FF3B5C]/20 to-[#6366F1]/20">
          <div className="absolute -bottom-8 left-4">
            <Link href={`/creators/${creator.username}`}>
              <Avatar className="h-16 w-16 ring-4 ring-[#151515] hover:ring-[#6366F1]/30 transition-all">
                <AvatarImage src={creator.avatar} alt={creator.name} />
                <AvatarFallback className="bg-gradient-to-br from-[#FF3B5C] to-[#6366F1] text-white text-lg">
                  {creator.name[0]}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>

        <div className="pt-10 p-4">
          <div className="flex items-start justify-between">
            <div>
              <Link href={`/creators/${creator.username}`}>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-white hover:text-[#6366F1] transition-colors">
                    {creator.name}
                  </span>
                  {creator.isVerified && (
                    <CheckCircle className="h-4 w-4 text-[#6366F1]" />
                  )}
                </div>
              </Link>
              <p className="text-sm text-[#A3A3A3] line-clamp-1">{creator.bio}</p>
            </div>
            <FollowButton
              creatorId={creator.id}
              isFollowing={isFollowing}
              onToggle={handleFollow}
              size="sm"
            />
          </div>

          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[rgba(255,255,255,0.05)]">
            <div>
              <p className="text-xs text-[#A3A3A3]">Followers</p>
              <p className="text-sm font-medium text-white">
                {followers.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#A3A3A3]">Products</p>
              <p className="text-sm font-medium text-white">
                {creator.products?.length || 0}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#A3A3A3]">Videos</p>
              <p className="text-sm font-medium text-white">
                {creator.videos?.length || 0}
              </p>
            </div>
          </div>

          {creator.storeName && (
            <Link
              href={`/stores/${creator.storeName}`}
              className="flex items-center gap-1.5 mt-3 text-xs text-[#6366F1] hover:underline"
            >
              <Store className="h-3.5 w-3.5" />
              <span>Visit Store</span>
            </Link>
          )}
        </div>
      </motion.div>
    );
  }

  // Default variant
  return (
    <Link
      href={`/creators/${creator.username}`}
      className={cn(
        'flex items-center gap-4 p-4 bg-[#151515] rounded-xl border border-[rgba(255,255,255,0.05)] hover:border-[#6366F1]/20 transition-all duration-200 group',
        className
      )}
    >
      <Avatar className="h-14 w-14 ring-2 ring-[rgba(255,255,255,0.05)] group-hover:ring-[#6366F1]/30 transition-all">
        <AvatarImage src={creator.avatar} alt={creator.name} />
        <AvatarFallback className="bg-gradient-to-br from-[#FF3B5C] to-[#6366F1] text-white text-lg">
          {creator.name[0]}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-white group-hover:text-[#6366F1] transition-colors">
            {creator.name}
          </span>
          {creator.isVerified && (
            <CheckCircle className="h-4 w-4 text-[#6366F1] flex-shrink-0" />
          )}
        </div>
        <p className="text-sm text-[#A3A3A3] line-clamp-1">{creator.bio}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-[#A3A3A3]">
            {followers.toLocaleString()} followers
          </span>
          {creator.storeName && (
            <>
              <span className="text-xs text-[#A3A3A3]">•</span>
              <span className="text-xs text-[#6366F1]">{creator.storeName}</span>
            </>
          )}
        </div>
      </div>

      <FollowButton
        creatorId={creator.id}
        isFollowing={isFollowing}
        onToggle={handleFollow}
        size="default"
      />
    </Link>
  );
}