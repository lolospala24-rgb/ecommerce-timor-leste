import { ThumbsUp } from 'lucide-react';
import { Comment } from '@/types/comment';

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return new Date(dateString).toLocaleDateString();
}

interface CommentItemProps {
  comment: Comment;
  onLike: (commentId: number) => void;
}

export function CommentItem({ comment, onLike }: CommentItemProps) {
  return (
    <div className="flex gap-3 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-600">
        {comment.user.name.slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-neutral-900">{comment.user.name}</span>
          <span className="text-xs text-neutral-400">{timeAgo(comment.createdAt)}</span>
        </div>
        <p className="mt-0.5 text-sm text-neutral-700">{comment.content}</p>
        <button
          type="button"
          onClick={() => onLike(comment.id)}
          className="mt-1 flex items-center gap-1 text-xs text-neutral-400 transition hover:text-rose-600"
        >
          <ThumbsUp className="h-3 w-3" />
          {comment.likes > 0 ? comment.likes : 'Like'}
        </button>

        {comment.replies.length > 0 && (
          <div className="mt-2 space-y-2 border-l border-neutral-100 pl-3">
            {comment.replies.map((reply) => (
              <div key={reply.id} className="flex gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-[10px] font-semibold text-neutral-600">
                  {reply.user.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold text-neutral-900">{reply.user.name}</span>
                    <span className="text-[11px] text-neutral-400">{timeAgo(reply.createdAt)}</span>
                  </div>
                  <p className="text-xs text-neutral-700">{reply.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
