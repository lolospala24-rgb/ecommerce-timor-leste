'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Star, Loader2, Reply } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { useReplyToReview, useSellerReviews } from '@/hooks/useReviews';

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i < rating ? 'fill-warning text-warning' : 'text-muted-foreground/30'}`} />
      ))}
    </div>
  );
}

export function ReviewsPanel() {
  const { data, isLoading } = useSellerReviews({ page: 1, limit: 5 });
  const replyToReview = useReplyToReview();
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');

  const reviews = data?.data?.data || [];

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-medium">Customer Reviews</h3>
        {typeof data?.sellerRating === 'number' && (
          <div className="flex items-center gap-1.5 text-sm">
            <Star className="h-4 w-4 fill-warning text-warning" />
            <span className="font-medium">{data.sellerRating.toFixed(1)}</span>
            <span className="text-muted-foreground">({data.totalSellerReviews})</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <EmptyState icon={Star} title="No reviews yet" description="Reviews from your customers will appear here." />
      ) : (
        <div className="divide-y">
          {reviews.map((review) => (
            <div key={review.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{review.user.name}</p>
                <span className="text-xs text-muted-foreground">{format(new Date(review.createdAt), 'MMM d, yyyy')}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Stars rating={review.rating} />
                <span className="truncate text-xs text-muted-foreground">{review.product.name}</span>
              </div>
              {review.comment && <p className="mt-1.5 text-sm text-muted-foreground">{review.comment}</p>}

              {review.sellerReply ? (
                <div className="mt-2 rounded-md bg-accent/60 p-2.5 text-sm">
                  <p className="text-xs font-medium text-muted-foreground">Your reply</p>
                  <p>{review.sellerReply}</p>
                </div>
              ) : replyingTo === review.id ? (
                <div className="mt-2 space-y-2">
                  <Textarea rows={2} value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Write a reply…" />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={!replyText.trim() || replyToReview.isPending}
                      onClick={() =>
                        replyToReview.mutate(
                          { id: review.id, reply: replyText.trim() },
                          { onSuccess: () => { setReplyingTo(null); setReplyText(''); } },
                        )
                      }
                    >
                      {replyToReview.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Post reply'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setReplyingTo(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setReplyingTo(review.id)}
                  className="mt-1.5 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <Reply className="h-3 w-3" /> Reply
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
