'use client';

import { Loader2, MessageCircle } from 'lucide-react';
import { useComments } from '@/hooks/useComments';
import { CommentItem } from './comments/CommentItem';
import { CommentInput } from './comments/CommentInput';

// The desktop right panel's always-visible comments card — same
// useComments/CommentItem/CommentInput plumbing as CommentDrawer (the
// mobile/tablet overlay), just laid out inline instead of as a sheet.
export function VideoCommentsPanel({ videoId }: { videoId: number }) {
  const { comments, total, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, addComment, isPosting, likeComment } =
    useComments(videoId);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-neutral-900">Comments ({total})</h3>
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-neutral-300" />
          </div>
        ) : comments.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-8 text-center text-neutral-400">
            <MessageCircle className="h-6 w-6" />
            <p className="text-xs">No comments yet. Be the first to say something.</p>
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
    </div>
  );
}
