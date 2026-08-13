'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X, Loader2, MessageCircle } from 'lucide-react';
import { useComments } from '@/hooks/useComments';
import { CommentItem } from './CommentItem';
import { CommentInput } from './CommentInput';

interface CommentDrawerProps {
  videoId: number | null;
  open: boolean;
  onClose: () => void;
}

export function CommentDrawer({ videoId, open, onClose }: CommentDrawerProps) {
  const { comments, total, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, addComment, isPosting, likeComment } =
    useComments(open ? videoId : null);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/30"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-50 flex h-[75vh] flex-col rounded-t-2xl bg-white shadow-2xl md:inset-y-0 md:right-0 md:left-auto md:h-full md:w-[400px] md:rounded-none md:rounded-l-2xl"
            role="dialog"
            aria-label="Comments"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 p-4">
              <h2 className="text-sm font-semibold text-neutral-900">{total} Comments</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close comments"
                className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4">
              {isLoading ? (
                <div className="flex h-full items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-neutral-300" />
                </div>
              ) : comments.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center text-neutral-400">
                  <MessageCircle className="h-8 w-8" />
                  <p className="text-sm">No comments yet. Be the first to say something.</p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-neutral-50">
                    {comments.map((comment) => (
                      <CommentItem key={comment.id} comment={comment} onLike={likeComment} />
                    ))}
                  </div>
                  {hasNextPage && (
                    <button
                      type="button"
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                      className="w-full py-3 text-center text-xs font-medium text-neutral-500 hover:text-neutral-800"
                    >
                      {isFetchingNextPage ? 'Loading...' : 'Load more comments'}
                    </button>
                  )}
                </>
              )}
            </div>

            <CommentInput onSubmit={addComment} isPosting={isPosting} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
