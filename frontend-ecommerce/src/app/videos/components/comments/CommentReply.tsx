'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Comment } from '@/types/comment';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ThumbsUp, UserCheck, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatTimeAgo } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface CommentReplyProps {
  reply: Comment;
  videoId: string;
  className?: string;
}

export function CommentReply({ reply, videoId, className }: CommentReplyProps) {
  const [isLiked, setIsLiked] = useState(reply.isLiked || false);
  const [likes, setLikes] = useState(reply.likes || 0);
  const [isLoading, setIsLoading] = useState(false);

  const isCreator = reply.user?.id === reply.creatorId;
  const isVerifiedBuyer = reply.isVerifiedBuyer || false;

  const handleLike = async () => {
    setIsLoading(true);
    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    setLikes((prev) => (newLikedState ? prev + 1 : prev - 1));
    // API call would go here
    setTimeout(() => setIsLoading(false), 300);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn('flex gap-3 group', className)}
    >
      <Link href={`/creators/${reply.user?.username || 'profile'}`}>
        <Avatar className="h-8 w-8">
          <AvatarImage src={reply.user?.avatar} alt={reply.user?.name} />
          <AvatarFallback className="bg-gradient-to-br from-[#FF3B5C] to-[#6366F1] text-white text-xs">
            {reply.user?.name ? getInitials(reply.user.name) : 'U'}
          </AvatarFallback>
        </Avatar>
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/creators/${reply.user?.username || 'profile'}`}
            className="font-medium text-sm text-white hover:text-[#6366F1] transition-colors"
          >
            {reply.user?.name || 'Anonymous'}
          </Link>

          {isCreator && (
            <Badge className="bg-[#6366F1] text-white text-[10px] px-1.5 py-0 h-4">
              Creator
            </Badge>
          )}

          {isVerifiedBuyer && (
            <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0 h-4">
              <UserCheck className="h-3 w-3 mr-0.5" />
              Verified
            </Badge>
          )}

          <span className="text-xs text-[#A3A3A3]">
            {formatTimeAgo(reply.createdAt)}
          </span>
        </div>

        <p className="mt-0.5 text-sm text-white/80 leading-relaxed">
          {reply.content}
        </p>

        <div className="flex items-center gap-3 mt-1">
          <button
            onClick={handleLike}
            disabled={isLoading}
            className={cn(
              'flex items-center gap-1 text-xs transition-colors',
              isLiked
                ? 'text-[#FF3B5C] hover:text-[#FF3B5C]/80'
                : 'text-[#A3A3A3] hover:text-white'
            )}
          >
            <ThumbsUp className={cn('h-3 w-3', isLiked && 'fill-[#FF3B5C]')} />
            <span>{likes > 0 ? likes : ''}</span>
          </button>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C]"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-48 bg-[#151515] border-[rgba(255,255,255,0.08)] text-white"
        >
          <DropdownMenuItem className="hover:bg-[#1C1C1C] cursor-pointer gap-3">
            <span>Report</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
}