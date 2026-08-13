'use client';

import { motion } from 'framer-motion';
import { VideoCreator } from '@/types/video';
import { useSellerFollow } from '@/hooks/video/useSellerFollow';

interface FollowButtonProps {
  creator: VideoCreator;
  isFollowing: boolean;
  size?: 'sm' | 'md';
}

export function FollowButton({ creator, isFollowing, size = 'md' }: FollowButtonProps) {
  const { toggleFollow, isToggling } = useSellerFollow(creator, isFollowing);

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      onClick={toggleFollow}
      disabled={isToggling}
      aria-label={isFollowing ? `Unfollow ${creator.storeName}` : `Follow ${creator.storeName}`}
      className={`rounded-full font-semibold transition-colors disabled:opacity-60 ${
        size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm'
      } ${
        isFollowing
          ? 'border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50'
          : 'bg-rose-600 text-white hover:bg-rose-700'
      }`}
    >
      {isFollowing ? 'Following' : 'Follow'}
    </motion.button>
  );
}
