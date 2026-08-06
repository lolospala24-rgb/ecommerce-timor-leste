'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CommentItem } from './CommentItem';
import { CommentInput } from './CommentInput';
import { CommentToolbar } from './CommentToolbar';
import { useComments } from '@/hooks/useComments';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageCircle, Users, Filter, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoCommentsProps {
  videoId: string;
  className?: string;
}

export function VideoComments({ videoId, className }: VideoCommentsProps) {
  const { isAuthenticated } = useAuthStore();
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'oldest'>('recent');
  const [showAll, setShowAll] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const {
    comments,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    totalComments,
    createComment,
    isCreating,
  } = useComments(videoId, { sortBy, limit: 10 });

  const [visibleCount, setVisibleCount] = useState(3);

  useEffect(() => {
    if (showAll && commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [showAll, comments]);

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 10);
    if (hasNextPage) {
      fetchNextPage();
    }
  };

  const visibleComments = showAll ? comments : comments.slice(0, visibleCount);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32 bg-[#151515]" />
          <Skeleton className="h-8 w-24 bg-[#151515]" />
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-10 w-10 rounded-full bg-[#151515]" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32 bg-[#151515]" />
              <Skeleton className="h-4 w-full bg-[#151515]" />
              <Skeleton className="h-4 w-3/4 bg-[#151515]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-5 w-5 text-[#A3A3A3]" />
          <h3 className="text-lg font-semibold text-white">
            Comments
            <span className="ml-2 text-sm font-normal text-[#A3A3A3]">
              ({totalComments || 0})
            </span>
          </h3>
        </div>

        <CommentToolbar
          sortBy={sortBy}
          onSortChange={setSortBy}
          totalComments={totalComments || 0}
        />
      </div>

      {/* Comment Input */}
      {isAuthenticated ? (
        <CommentInput
          videoId={videoId}
          onSubmit={createComment}
          isSubmitting={isCreating}
        />
      ) : (
        <div className="rounded-xl bg-[#151515] p-4 text-center border border-[rgba(255,255,255,0.05)]">
          <p className="text-sm text-[#A3A3A3]">
            <button
              onClick={() => window.location.href = '/login'}
              className="text-[#6366F1] hover:underline font-medium"
            >
              Sign in
            </button>
            {' '}to join the conversation
          </p>
        </div>
      )}

      {/* Comments List */}
      <AnimatePresence mode="popLayout">
        <div className="space-y-6">
          {visibleComments.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <Users className="h-12 w-12 mx-auto text-[#A3A3A3]/30 mb-4" />
              <p className="text-[#A3A3A3]">No comments yet</p>
              <p className="text-sm text-[#A3A3A3]/60">
                Be the first to share your thoughts!
              </p>
            </motion.div>
          ) : (
            visibleComments.map((comment, index) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                layout
              >
                <CommentItem
                  comment={comment}
                  videoId={videoId}
                  isPinned={index === 0 && comment.likes > 5}
                />
              </motion.div>
            ))
          )}
        </div>
      </AnimatePresence>

      {/* Load More */}
      {!showAll && comments.length > visibleCount && (
        <Button
          variant="ghost"
          className="w-full text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C]"
          onClick={() => setShowAll(true)}
        >
          <ArrowDown className="h-4 w-4 mr-2" />
          Lihat Semua ({comments.length})
        </Button>
      )}

      {showAll && hasNextPage && (
        <Button
          variant="ghost"
          className="w-full text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C]"
          onClick={handleLoadMore}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? (
            <>
              <div className="h-4 w-4 mr-2 border-2 border-[#A3A3A3] border-t-transparent rounded-full animate-spin" />
              Loading...
            </>
          ) : (
            'Load more comments'
          )}
        </Button>
      )}

      <div ref={commentsEndRef} />
    </div>
  );
}