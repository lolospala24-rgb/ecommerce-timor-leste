'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { Star, MessageSquare, Send, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSellerReviews, useReplyToReview } from '@/hooks/useReviews';
import type { SellerReview } from '@/types/notification.types';

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={i < rating ? 'h-4 w-4 fill-warning text-warning' : 'h-4 w-4 text-muted-foreground/30'}
        />
      ))}
    </div>
  );
}

function ReplyForm({ review }: { review: SellerReview }) {
  const [text, setText] = useState('');
  const [editing, setEditing] = useState(false);
  const replyToReview = useReplyToReview();

  const handleSubmit = async () => {
    if (!text.trim()) return;
    await replyToReview.mutateAsync({ id: review.id, reply: text.trim() });
    setText('');
    setEditing(false);
  };

  if (review.sellerReply && !editing) {
    return (
      <div className="mt-3 rounded-lg bg-muted/50 p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground">Your reply</p>
          <div className="flex items-center gap-3">
            {review.sellerReplyAt && (
              <p className="text-xs text-muted-foreground">{format(new Date(review.sellerReplyAt), 'MMM d, yyyy')}</p>
            )}
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline"
              onClick={() => {
                setText(review.sellerReply ?? '');
                setEditing(true);
              }}
            >
              Edit
            </button>
          </div>
        </div>
        <p className="mt-1 text-sm">{review.sellerReply}</p>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a public reply to this review…"
        rows={2}
        className="text-sm"
      />
      <div className="flex justify-end gap-2">
        {editing && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        )}
        <Button size="sm" onClick={handleSubmit} disabled={!text.trim() || replyToReview.isPending} className="gap-1.5">
          {replyToReview.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Reply
        </Button>
      </div>
    </div>
  );
}

export default function ReviewsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'all' | 'pending' | 'approved'>('all');
  const { data, isLoading } = useSellerReviews({
    page,
    limit: 10,
    status: status === 'all' ? undefined : status,
  });

  const reviews = data?.data.data ?? [];
  const pagination = data?.data.pagination;

  return (
    <div>
      <PageHeader
        title="Reviews"
        description="What customers say about your products — reply publicly to build trust."
      />

      {!isLoading && data && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border bg-card p-4">
          <Stars rating={Math.round(data.sellerRating)} />
          <p className="text-sm font-medium">{data.sellerRating.toFixed(1)} average</p>
          <p className="text-sm text-muted-foreground">· {data.totalSellerReviews} approved review{data.totalSellerReviews === 1 ? '' : 's'}</p>
        </div>
      )}

      <div className="mb-4 flex gap-2">
        {(['all', 'pending', 'approved'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className={
              status === s
                ? 'rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground'
                : 'rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted'
            }
          >
            {s === 'all' ? 'All' : s === 'pending' ? 'Pending Approval' : 'Approved'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No reviews yet"
          description="Once customers review your products, they'll show up here."
        />
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  {review.product.thumbnail && (
                    <Image
                      src={review.product.thumbnail}
                      alt={review.product.name}
                      width={44}
                      height={44}
                      className="rounded-md border object-cover"
                    />
                  )}
                  <div>
                    <Link href={`/products/${review.product.id}`} className="text-sm font-medium hover:text-primary">
                      {review.product.name}
                    </Link>
                    <div className="mt-1 flex items-center gap-2">
                      <Stars rating={review.rating} />
                      <span className="text-xs text-muted-foreground">by {review.user.name}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  {!review.isApproved && <Badge variant="secondary">Pending Approval</Badge>}
                  <span className="text-xs text-muted-foreground">{format(new Date(review.createdAt), 'MMM d, yyyy')}</span>
                </div>
              </div>

              {review.title && <p className="mt-3 text-sm font-semibold">{review.title}</p>}
              <p className="mt-1 text-sm text-muted-foreground">{review.comment}</p>

              {review.images.length > 0 && (
                <div className="mt-2 flex gap-2">
                  {review.images.map((img, i) => (
                    <Image key={i} src={img} alt="" width={56} height={56} className="rounded-md border object-cover" />
                  ))}
                </div>
              )}

              <ReplyForm review={review} />
            </div>
          ))}
        </div>
      )}

      {pagination && (
        <PaginationControls
          page={pagination.page}
          totalPages={pagination.totalPages}
          hasNext={pagination.hasNext}
          hasPrev={pagination.hasPrev}
          onPageChange={setPage}
          total={pagination.total}
        />
      )}
    </div>
  );
}
