'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { useFeaturedCreators } from '@/hooks/useVideos';
import { FollowButton } from '../creator/FollowButton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Sparkles, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecommendedCreator {
  id: string;
  name: string;
  username: string;
  avatar: string;
  isVerified: boolean;
  followers: number;
  bio: string;
  category: string;
  isFollowed: boolean;
}

interface RecommendedCreatorsProps {
  className?: string;
}

export function RecommendedCreators({ className }: RecommendedCreatorsProps) {
  const { isAuthenticated } = useAuthStore();
  const { data, isLoading } = useFeaturedCreators(3);
  const [creators, setCreators] = useState<RecommendedCreator[]>([]);

  const handleFollow = (creatorId: string) => {
    setCreators((prev) =>
      prev.map((c) =>
        c.id === creatorId
          ? { ...c, isFollowed: !c.isFollowed, followers: c.isFollowed ? c.followers - 1 : c.followers + 1 }
          : c
      )
    );
  };

  if (!isAuthenticated) {
    return null;
  }

  const loadedCreators = (data?.data || []).map((creator: any) => ({
    id: creator.id,
    name: creator.name,
    username: creator.username,
    avatar: creator.avatar,
    isVerified: creator.isVerified,
    followers: creator.followers || 0,
    bio: creator.bio || creator.storeName || 'Creator',
    category: creator.category || 'Creator',
    isFollowed: false,
  }));

  const displayCreators = (creators.length > 0 ? creators : loadedCreators).filter((c) => !c.isFollowed);

  if (displayCreators.length === 0) {
    return (
      <div className={cn('p-4 bg-[#151515] rounded-xl text-center border border-[rgba(255,255,255,0.05)]', className)}>
        <Sparkles className="h-8 w-8 mx-auto text-[#A3A3A3]/30 mb-2" />
        <p className="text-sm text-[#A3A3A3]">All caught up!</p>
        <p className="text-xs text-[#A3A3A3]/60">
          You're following all recommended creators
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#6366F1]" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">
            Recommended Creators
          </h3>
        </div>
        <Link
          href="/creators/recommended"
          className="text-xs text-[#6366F1] hover:underline flex items-center gap-0.5"
        >
          View All
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="space-y-3">
        {displayCreators.slice(0, 3).map((creator, index) => (
          <motion.div
            key={creator.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-start gap-3 p-3 bg-[#151515] rounded-xl border border-[rgba(255,255,255,0.05)] hover:border-[#6366F1]/20 transition-all duration-200 group"
          >
            {/* Avatar */}
            <Link href={`/creators/${creator.username}`}>
              <Avatar className="h-12 w-12 ring-2 ring-[rgba(255,255,255,0.05)] hover:ring-[#6366F1]/30 transition-all">
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
              <p className="text-xs text-[#A3A3A3] truncate">{creator.bio}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-[#6366F1]/10 text-[#6366F1] text-[10px] px-1.5 py-0 h-4">
                  {creator.category}
                </Badge>
                <span className="text-xs text-[#A3A3A3]">
                  {creator.followers.toLocaleString()} followers
                </span>
              </div>
            </div>

            {/* Follow Button */}
            <FollowButton
              creatorId={creator.id}
              isFollowing={creator.isFollowed}
              onToggle={() => handleFollow(creator.id)}
              size="sm"
              className="flex-shrink-0 mt-1"
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}