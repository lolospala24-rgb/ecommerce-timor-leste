'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { useCreator } from '@/hooks/useCreator';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, CheckCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Following {
  id: string;
  name: string;
  username: string;
  avatar: string;
  isVerified: boolean;
  isLive: boolean;
  lastActive: string;
}

interface FollowingProps {
  className?: string;
}

export function Following({ className }: FollowingProps) {
  const { isAuthenticated } = useAuthStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [following] = useState<Following[]>([]);

  if (!isAuthenticated) {
    return (
      <div className={cn('p-4 bg-[#151515] rounded-xl text-center border border-[rgba(255,255,255,0.05)]', className)}>
        <Users className="h-8 w-8 mx-auto text-[#A3A3A3]/30 mb-2" />
        <p className="text-sm text-[#A3A3A3]">Sign in to see who you follow</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 text-[#A3A3A3] border-[rgba(255,255,255,0.08)] hover:text-white hover:bg-[#1C1C1C]"
          asChild
        >
          <Link href="/login">Sign In</Link>
        </Button>
      </div>
    );
  }

  if (following.length === 0) {
    return (
      <div className={cn('p-4 bg-[#151515] rounded-xl text-center border border-[rgba(255,255,255,0.05)]', className)}>
        <UserPlus className="h-8 w-8 mx-auto text-[#A3A3A3]/30 mb-2" />
        <p className="text-sm text-[#A3A3A3]">No following yet</p>
        <p className="text-xs text-[#A3A3A3]/60">
          Follow creators to see their content here
        </p>
      </div>
    );
  }

  const displayFollowing = isExpanded ? following : following.slice(0, 3);

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">
          Following
          <span className="ml-1.5 text-[#A3A3A3]/60 text-[10px]">({following.length})</span>
        </h3>
        {following.length > 3 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-[#6366F1] hover:underline"
          >
            {isExpanded ? 'Show Less' : 'Show All'}
          </button>
        )}
      </div>

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {displayFollowing.map((creator) => (
            <motion.div
              key={creator.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#1C1C1C] transition-all duration-200 group"
            >
              <Link href={`/creators/${creator.username}`}>
                <div className="relative">
                  <Avatar className="h-10 w-10 ring-2 ring-[rgba(255,255,255,0.05)] hover:ring-[#6366F1]/30 transition-all">
                    <AvatarImage src={creator.avatar} alt={creator.name} />
                    <AvatarFallback className="bg-gradient-to-br from-[#FF3B5C] to-[#6366F1] text-white">
                      {creator.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  {creator.isLive && (
                    <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-red-500 ring-2 ring-[#0B0B0D] animate-pulse" />
                  )}
                </div>
              </Link>

              <div className="flex-1 min-w-0">
                <Link href={`/creators/${creator.username}`} className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-white hover:text-[#6366F1] transition-colors truncate">
                    {creator.name}
                  </span>
                  {creator.isVerified && (
                    <CheckCircle className="h-3.5 w-3.5 text-[#6366F1] flex-shrink-0" />
                  )}
                </Link>
                <div className="flex items-center gap-2">
                  {creator.isLive ? (
                    <Badge className="bg-red-500/20 text-red-400 text-[10px] px-1.5 py-0 h-4">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500 mr-1 animate-pulse" />
                      LIVE
                    </Badge>
                  ) : (
                    <span className="text-xs text-[#A3A3A3] flex items-center gap-0.5">
                      <Clock className="h-3 w-3" />
                      {creator.lastActive}
                    </span>
                  )}
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-[#A3A3A3] hover:text-[#FF3B5C] hover:bg-[#FF3B5C]/10 h-7 px-2"
              >
                Unfollow
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}