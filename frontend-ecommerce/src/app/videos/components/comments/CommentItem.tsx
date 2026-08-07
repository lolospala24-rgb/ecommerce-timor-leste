'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Comment } from '@/types/comment';
import { CommentReply } from './CommentReply';
import { CommentInput } from './CommentInput';
import { useAuthStore } from '@/stores/authStore';
import { useComments } from '@/hooks/useComments';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Heart,
  MessageCircle,
  Flag,
  Pin,
  ThumbsUp,
  Reply,
  MoreHorizontal,
  UserCheck,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { formatTimeAgo } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface CommentItemProps {
  comment: Comment;
  videoId: string;
  isPinned?: boolean;
  className?: string;
}

export function CommentItem({
  comment,
  videoId,
  isPinned = false,
  className,
}: CommentItemProps) {
  const { user, isAuthenticated } = useAuthStore();
  const [isLiked, setIsLiked] = useState(comment.isLiked || false);
  const [likes, setLikes] = useState(comment.likes || 0);
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { likeComment, createReply } = useComments(videoId);

  // The Comment type has no creator/author-role field to compare against —
  // there's no data source to derive a real "is this the video creator" flag.
  const isCreator = false;
  const isVerifiedBuyer = comment.isVerifiedBuyer || false;
  const repliesCount = comment.replies?.length ?? 0;

  const handleLike = async () => {
    if (!isAuthenticated) {
      window.location.href = '/login';
      return;
    }

    setIsLoading(true);
    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    setLikes((prev) => (newLikedState ? prev + 1 : prev - 1));

    try {
      await likeComment(comment.id);
    } catch {
      setIsLiked(!newLikedState);
      setLikes((prev) => (!newLikedState ? prev + 1 : prev - 1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReplySubmit = async (content: string) => {
    await createReply(comment.id, content);
    setShowReplyInput(false);
    setShowReplies(true);
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
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'group relative',
        isPinned && 'rounded-xl bg-[#151515] p-4 border border-[rgba(255,255,255,0.05)]',
        className
      )}
    >
      {/* Pinned Badge */}
      {isPinned && (
        <div className="flex items-center gap-1 text-xs text-[#A3A3A3] mb-2">
          <Pin className="h-3 w-3" />
          <span>Pinned</span>
        </div>
      )}

      <div className="flex gap-3">
        {/* Avatar */}
        <Link href={`/creators/${comment.userId || 'profile'}`}>
          <Avatar className="h-10 w-10 ring-2 ring-[rgba(255,255,255,0.05)] hover:ring-[#6366F1]/30 transition-all">
            <AvatarImage src={comment.userAvatar} alt={comment.userName} />
            <AvatarFallback className="bg-gradient-to-br from-[#FF3B5C] to-[#6366F1] text-white">
              {comment.userName ? getInitials(comment.userName) : 'U'}
            </AvatarFallback>
          </Avatar>
        </Link>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/creators/${comment.userId || 'profile'}`}
              className="font-medium text-sm text-white hover:text-[#6366F1] transition-colors"
            >
              {comment.userName || 'Anonymous'}
            </Link>

            {isCreator && (
              <Badge className="bg-[#6366F1] text-white text-[10px] px-1.5 py-0 h-4">
                Creator
              </Badge>
            )}

            {isVerifiedBuyer && (
              <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0 h-4">
                <UserCheck className="h-3 w-3 mr-0.5" />
                Verified Buyer
              </Badge>
            )}

            <span className="text-xs text-[#A3A3A3]">
              {formatTimeAgo(comment.createdAt)}
            </span>
          </div>

          {/* Content */}
          <p className="mt-1 text-sm text-white/90 leading-relaxed">
            {comment.content}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-4 mt-2">
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
              <ThumbsUp className={cn('h-3.5 w-3.5', isLiked && 'fill-[#FF3B5C]')} />
              <span>{likes > 0 ? likes : ''}</span>
            </button>

            <button
              onClick={() => setShowReplyInput(!showReplyInput)}
              className="flex items-center gap-1 text-xs text-[#A3A3A3] hover:text-white transition-colors"
            >
              <Reply className="h-3.5 w-3.5" />
              <span>Reply</span>
            </button>

            {repliesCount > 0 && (
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="text-xs text-[#6366F1] hover:underline"
              >
                {showReplies ? 'Hide' : 'View'} {repliesCount} replies
              </button>
            )}
          </div>

          {/* Reply Input */}
          <AnimatePresence>
            {showReplyInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3"
              >
                <CommentInput
                  videoId={videoId}
                  placeholder="Write a reply..."
                  onSubmit={handleReplySubmit}
                  isSubmitting={isLoading}
                  onCancel={() => setShowReplyInput(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Replies */}
          <AnimatePresence>
            {showReplies && comment.replies && comment.replies.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-3 pl-4 border-l-2 border-[rgba(255,255,255,0.05)] space-y-4"
              >
                {comment.replies.map((reply) => (
                  <CommentReply key={reply.id} reply={reply} videoId={videoId} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* More Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C]"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 bg-[#151515] border-[rgba(255,255,255,0.08)] text-white"
          >
            <DropdownMenuItem className="hover:bg-[#1C1C1C] cursor-pointer gap-3">
              <Flag className="h-4 w-4" />
              <span>Report</span>
            </DropdownMenuItem>
            {user?.id != null && String(user.id) === comment.userId && (
              <>
                <DropdownMenuSeparator className="bg-[rgba(255,255,255,0.08)]" />
                <DropdownMenuItem className="hover:bg-[#1C1C1C] cursor-pointer gap-3 text-red-500">
                  <Flag className="h-4 w-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}