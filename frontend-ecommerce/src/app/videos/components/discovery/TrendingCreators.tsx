'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useFeaturedCreators } from '@/hooks/useVideos';
import { FollowButton } from '../creator/FollowButton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ChevronRight, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrendingCreatorsProps {
  className?: string;
  limit?: number;
}

export function TrendingCreators({ className, limit = 5 }: TrendingCreatorsProps) {
  const { data, isLoading } = useFeaturedCreators(limit);
  const [followed, setFollowed] = useState<Record<string, boolean>>({});

  const handleFollow = (creatorId: string) => {
    setFollowed((prev) => ({ ...prev, [creatorId]: !prev[creatorId] }));
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32 bg-[#151515]" />
          <Skeleton className="h-4 w-16 bg-[#151515]" />
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full bg-[#151515]" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-24 bg-[#151515]" />
              <Skeleton className="h-3 w-16 bg-[#151515]" />
            </div>
            <Skeleton className="h-8 w-16 bg-[#151515]" />
          </div>
        ))}
      </div>
    );
  }

  const creators = data?.data || [];

  if (creators.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-[#FF3B5C]" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">
            Trending Creators
          </h3>
        </div>
        <Link
          href="/creators"
          className="text-xs text-[#6366F1] hover:underline flex items-center gap-0.5"
        >
          View All
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="space-y-2">
        {creators.map((creator, index) => (
          <motion.div
            key={creator.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              'flex items-center gap-3 p-2 rounded-lg hover:bg-[#1C1C1C] transition-all duration-200 group',
              index === 0 && 'bg-[#151515] border border-[rgba(255,255,255,0.05)]'
            )}
          >
            {/* Rank */}
            {index < 3 && (
              <span
                className={cn(
                  'text-xs font-bold w-5 text-center',
                  index === 0 ? 'text-yellow-400' : index === 1 ? 'text-[#A3A3A3]' : 'text-amber-400'
                )}
              >
                #{index + 1}
              </span>
            )}

            {/* Avatar */}
            <Link href={`/creators/${creator.username}`}>
              <Avatar className="h-10 w-10 ring-2 ring-[rgba(255,255,255,0.05)] hover:ring-[#6366F1]/30 transition-all">
                <AvatarImage src={creator.avatar} alt={creator.name} />
                <AvatarFallback className="bg-gradient-to-br from-[#FF3B5C] to-[#6366F1] text-white">
                  {creator.name[0]}
                </AvatarFallback>
              </Avatar>
            </Link>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <Link href={`/creators/${creator.username}`} className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-white hover:text-[#6366F1] transition-colors truncate">
                  {creator.name}
                </span>
                {creator.isVerified && (
                  <CheckCircle className="h-3.5 w-3.5 text-[#6366F1] flex-shrink-0" />
                )}
              </Link>
              <p className="text-xs text-[#A3A3A3]">
                {creator.followers.toLocaleString()} followers
              </p>
            </div>

            {/* Follow Button */}
            <FollowButton
              creatorId={creator.id}
              isFollowing={followed[creator.id] || false}
              onToggle={() => handleFollow(creator.id)}
              size="sm"
              variant="outline"
              className="flex-shrink-0"
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}