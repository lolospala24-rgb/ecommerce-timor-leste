'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { UserPlus, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FollowButtonProps {
  creatorId: string;
  isFollowing: boolean;
  onToggle: () => void;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
}

export function FollowButton({
  creatorId,
  isFollowing,
  onToggle,
  size = 'default',
  variant = 'default',
  className,
}: FollowButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      await onToggle();
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'h-7 text-xs px-3',
    default: 'h-9 text-sm px-4',
    lg: 'h-11 text-base px-6',
  };

  const variantClasses = {
    default: isFollowing
      ? 'bg-[#1C1C1C] text-white hover:bg-red-500/10 hover:text-red-500'
      : 'bg-[#FF3B5C] text-white hover:bg-[#FF3B5C]/90',
    outline: isFollowing
      ? 'border-[rgba(255,255,255,0.08)] text-[#A3A3A3] hover:border-red-500 hover:text-red-500 hover:bg-red-500/10'
      : 'border-[#FF3B5C] text-[#FF3B5C] hover:bg-[#FF3B5C] hover:text-white',
    ghost: isFollowing
      ? 'text-[#A3A3A3] hover:text-red-500 hover:bg-red-500/10'
      : 'text-[#FF3B5C] hover:bg-[#FF3B5C]/10',
  };

  const getLabel = () => {
    if (isFollowing && isHovered) return 'Unfollow';
    if (isFollowing) return 'Following';
    return 'Follow';
  };

  const getIcon = () => {
    if (isFollowing && isHovered) return null;
    if (isFollowing) return <UserCheck className="h-3.5 w-3.5" />;
    return <UserPlus className="h-3.5 w-3.5" />;
  };

  return (
    <Button
      variant={variant === 'default' ? 'default' : 'outline'}
      size={size}
      className={cn(
        'transition-all duration-200 min-w-[80px]',
        sizeClasses[size],
        variantClasses[variant],
        isLoading && 'opacity-70 cursor-not-allowed',
        className
      )}
      onClick={handleClick}
      disabled={isLoading}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        key={isFollowing ? 'following' : 'follow'}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="flex items-center gap-1.5"
      >
        {getIcon()}
        {isLoading ? (
          <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <span>{getLabel()}</span>
        )}
      </motion.div>
    </Button>
  );
}