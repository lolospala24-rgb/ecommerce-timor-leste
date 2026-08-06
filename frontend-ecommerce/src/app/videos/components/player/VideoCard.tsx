'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion'; // ✅ AnimatePresence imported
import { Video } from '@/types/video';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Heart, Clock, Eye, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface VideoCardProps {
  video: Video;
  variant?: 'vertical' | 'horizontal' | 'compact';
  showCreator?: boolean;
  showActions?: boolean;
  className?: string;
}

export function VideoCard({
  video,
  variant = 'vertical',
  showCreator = true,
  showActions = true,
  className,
}: VideoCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const formatViews = (views?: number) => {
    const safeViews = Number(views ?? 0);
    if (safeViews >= 1000000) return `${(safeViews / 1000000).toFixed(1)}M`;
    if (safeViews >= 1000) return `${(safeViews / 1000).toFixed(1)}K`;
    return safeViews.toString();
  };

  const formatTimeAgo = (date?: string) => {
    if (!date) return 'Recently added';
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return `${minutes}m ago`;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (variant === 'compact') {
    return (
      <Link
        href={`/videos/${video.id}`}
        className={cn('flex gap-3 p-2 rounded-lg hover:bg-[#1C1C1C] transition-all duration-200 group', className)}
      >
        <div className="relative flex-shrink-0">
          <div className="relative h-[104px] w-[176px] rounded-xl overflow-hidden bg-[#0B0B0D]">
            <img
              src={video.thumbnailUrl || '/images/placeholder.png'}
              alt={video.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0D] to-transparent opacity-30" />
            <div className="absolute bottom-1 right-1 bg-[#0B0B0D]/80 text-white text-[10px] px-1.5 py-0.5 rounded">
              {Number(video.duration || 0)}s
            </div>
            <Play className="absolute inset-0 m-auto h-5 w-5 text-white/30" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white group-hover:text-[#6366F1] transition-colors line-clamp-2">
            {video.title}
          </p>
          <p className="text-xs text-[#A3A3A3]">
            {formatViews(video.views)} views • {formatTimeAgo(video.createdAt)}
          </p>
        </div>
      </Link>
    );
  }

  if (variant === 'horizontal') {
    return (
      <div
        className={cn(
          'flex gap-4 p-3 bg-[#151515] rounded-xl border border-[rgba(255,255,255,0.05)] hover:border-[#6366F1]/20 transition-all duration-200 group',
          className
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Thumbnail */}
        <Link href={`/videos/${video.id}`} className="relative flex-shrink-0">
          <div className="relative h-24 w-40 rounded-lg overflow-hidden bg-[#0B0B0D]">
            <img
              src={video.thumbnailUrl || '/images/placeholder.png'}
              alt={video.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0D] to-transparent opacity-30" />
            <div className="absolute bottom-1 right-1 bg-[#0B0B0D]/80 text-white text-[10px] px-1.5 py-0.5 rounded">
              {Number(video.duration || 0)}s
            </div>
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-[#0B0B0D]/40 flex items-center justify-center"
                >
                  <Play className="h-8 w-8 text-white/60" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Link>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <Link href={`/videos/${video.id}`}>
              <h3 className="font-semibold text-white hover:text-[#6366F1] transition-colors line-clamp-2">
                {video.title}
              </h3>
            </Link>
            {video.description && (
              <p className="text-sm text-[#A3A3A3] line-clamp-1 mt-0.5">
                {video.description}
              </p>
            )}
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3 text-xs text-[#A3A3A3]">
              <span>{formatViews(video.views)} views</span>
              <span>•</span>
              <span>{formatTimeAgo(video.createdAt)}</span>
            </div>
            {showActions && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-[#A3A3A3] hover:text-[#FF3B5C] hover:bg-[#FF3B5C]/10"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsLiked(!isLiked);
                  }}
                >
                  <Heart
                    className={cn('h-3.5 w-3.5', isLiked && 'fill-[#FF3B5C] text-[#FF3B5C]')}
                  />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C]"
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="bg-[#151515] border-[rgba(255,255,255,0.08)] text-white min-w-[140px]"
                  >
                    <DropdownMenuItem className="cursor-pointer hover:bg-[#1C1C1C]">
                      Save to Watch Later
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer hover:bg-[#1C1C1C]">
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer hover:bg-[#1C1C1C] text-red-500">
                      Report
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default: Vertical
  return (
    <div
      className={cn(
        'group relative bg-[#151515] rounded-xl overflow-hidden border border-[rgba(255,255,255,0.05)] transition-all duration-300 hover:border-[#6366F1]/20 hover:shadow-xl hover:shadow-[#6366F1]/5',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Thumbnail */}
      <Link href={`/videos/${video.id}`} className="block aspect-[9/16] relative">
        <div className="absolute inset-0 bg-[#0B0B0D]">
          <img
            src={video.thumbnailUrl || '/images/placeholder.png'}
            alt={video.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#FF3B5C]/10 to-[#6366F1]/10" />
        </div>

        {/* Duration Badge */}
        <Badge className="absolute bottom-2 right-2 bg-[#0B0B0D]/80 text-white text-[10px] px-1.5 py-0.5 h-5">
          {Number(video.duration || 0)}s
        </Badge>

        {/* Play Overlay */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0B0B0D]/40 flex items-center justify-center"
            >
              <div className="w-14 h-14 rounded-full bg-[#FF3B5C]/90 flex items-center justify-center backdrop-blur-sm shadow-2xl shadow-[#FF3B5C]/20">
                <Play className="h-6 w-6 text-white ml-0.5" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Link>

      {/* Info */}
      <div className="p-3 space-y-2">
        <Link href={`/videos/${video.id}`}>
          <h3 className="font-medium text-white hover:text-[#6366F1] transition-colors line-clamp-2 text-sm">
            {video.title}
          </h3>
        </Link>

        {showCreator && video.creator && (
          <Link
            href={`/creators/${video.creator.username}`}
            className="flex items-center gap-2 group/creator"
          >
            <Avatar className="h-5 w-5 ring-2 ring-[rgba(255,255,255,0.05)]">
              <AvatarImage src={video.creator?.avatar || '/images/placeholder.png'} alt={video.creator?.name || 'Creator'} />
              <AvatarFallback className="bg-gradient-to-br from-[#FF3B5C] to-[#6366F1] text-white text-[8px]">
                {getInitials(video.creator?.name || 'Creator')}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-[#A3A3A3] group-hover/creator:text-white transition-colors">
              {video.creator?.name || 'Creator'}
            </span>
          </Link>
        )}

        <div className="flex items-center justify-between text-xs text-[#A3A3A3]">
          <div className="flex items-center gap-3">
            <span>{formatViews(video.views)} views</span>
            <span>•</span>
            <span>{formatTimeAgo(video.createdAt)}</span>
          </div>
          {showActions && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-[#A3A3A3] hover:text-[#FF3B5C] hover:bg-[#FF3B5C]/10"
              onClick={(e) => {
                e.preventDefault();
                setIsLiked(!isLiked);
              }}
            >
              <Heart
                className={cn('h-3.5 w-3.5', isLiked && 'fill-[#FF3B5C] text-[#FF3B5C]')}
              />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}