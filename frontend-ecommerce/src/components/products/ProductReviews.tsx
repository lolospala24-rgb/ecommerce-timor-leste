'use client';

import { useState } from 'react';
import { useProductReviews, useCreateReview, useReviewEligibility } from '@/hooks/useReviews';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RatingStars, StaticRatingStars } from '@/components/shared/RatingStars';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Star, MessageSquare, ShieldCheck, Info, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ProductReviewsProps {
  productId: number;
  rating?: number;
  totalReviews?: number;
  ratingDistribution?: { rating: number; count: number }[];
}

const MIN_COMMENT_LENGTH = 10;
const MAX_COMMENT_LENGTH = 1000;

export function ProductReviews({
  productId,
  rating = 0,
  totalReviews = 0,
  ratingDistribution,
}: ProductReviewsProps) {
  const [page, setPage] = useState(1);
  const [ratingInput, setRatingInput] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const { data, isLoading } = useProductReviews(productId, { page, limit: 10 });
  const { mutateAsync: createReview } = useCreateReview();
  const { isAuthenticated } = useAuthStore();
  const { data: eligibility, isLoading: eligibilityLoading } = useReviewEligibility(
    productId,
    isAuthenticated,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ratingInput === 0) {
      toast.error('Please select a rating');
      return;
    }
    if (comment.trim().length < MIN_COMMENT_LENGTH) {
      toast.error(`Review must be at least ${MIN_COMMENT_LENGTH} characters`);
      return;
    }

    setIsSubmitting(true);
    try {
      await createReview({
        productId,
        rating: ratingInput,
        comment: comment.trim(),
      });
      setRatingInput(0);
      setComment('');
      setJustSubmitted(true);
    } catch {
      // useCreateReview's onError already shows a toast with the specific
      // reason (not purchased, already reviewed, etc.) — nothing else to do.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Rating Summary */}
      <ReviewSummary
        rating={rating}
        totalReviews={totalReviews}
        distribution={ratingDistribution}
      />

      {/* Write Review */}
      {isAuthenticated ? (
        eligibilityLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking review eligibility...
            </CardContent>
          </Card>
        ) : eligibility && !eligibility.canReview ? (
          justSubmitted && eligibility.reason === 'already_reviewed' ? (
            <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
              <CardContent className="flex items-start gap-3 p-6">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">
                    Thanks — your review has been submitted!
                  </p>
                  <p className="mt-1 text-sm text-green-700 dark:text-green-400">
                    It's awaiting approval and will appear on this page once it's reviewed.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed bg-muted/20">
              <CardContent className="flex items-start gap-3 p-6">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {eligibility.reason === 'already_reviewed'
                      ? "You've already reviewed this product"
                      : eligibility.reason === 'not_purchased'
                        ? 'Purchase required to review'
                        : 'Reviews unavailable'}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{eligibility.message}</p>
                </div>
              </CardContent>
            </Card>
          )
        ) : (
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Write a Review</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="mb-2 block">Rating</Label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
                        onClick={() => setRatingInput(star)}
                        aria-label={`Rate ${star} out of 5 stars`}
                        aria-pressed={star <= ratingInput}
                      >
                        <Star
                          className={cn(
                            'h-8 w-8 transition-colors',
                            star <= ratingInput
                              ? 'fill-amber-500 text-amber-500'
                              : 'text-slate-300',
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="review-comment">Review</Label>
                    <span
                      className={cn(
                        'text-xs',
                        comment.length > MAX_COMMENT_LENGTH
                          ? 'text-destructive'
                          : 'text-muted-foreground',
                      )}
                    >
                      {comment.length}/{MAX_COMMENT_LENGTH}
                    </span>
                  </div>
                  <Textarea
                    id="review-comment"
                    placeholder="Tell other customers about this product..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={MAX_COMMENT_LENGTH}
                    rows={4}
                  />
                </div>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Review'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )
      ) : (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Please login to leave a review for this product.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">
            <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
            <p className="text-muted-foreground">Loading reviews...</p>
          </div>
        ) : data?.data?.length === 0 ? (
          <div className="text-center py-8 border rounded-lg">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No reviews yet</p>
            <p className="text-sm text-muted-foreground">
              Be the first to review this product
            </p>
          </div>
        ) : (
          data?.data.map((review: any) => (
            <ReviewCard key={review.id} review={review} />
          ))
        )}
      </div>

      {/* Pagination */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm">
            Page {page} of {data.pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
            disabled={page === data.pagination.totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function ReviewSummary({
  rating,
  totalReviews,
  distribution,
}: {
  rating: number;
  totalReviews: number;
  distribution?: { rating: number; count: number }[];
}) {
  if (totalReviews === 0) return null;

  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const d of distribution ?? []) {
    counts[d.rating] = d.count;
  }

  return (
    <div className="rounded-2xl border bg-card p-6 sm:p-8">
      <h3 className="text-lg font-semibold mb-6">Customer Reviews</h3>
      <div className="grid gap-8 sm:grid-cols-[auto_1fr] sm:gap-12">
        <div className="flex flex-col items-center justify-center gap-2 sm:items-start">
          <span className="text-5xl font-bold tracking-tight">{rating.toFixed(1)}</span>
          <StaticRatingStars rating={rating} size="lg" />
          <p className="text-sm text-muted-foreground">
            Based on {totalReviews} review{totalReviews === 1 ? '' : 's'}
          </p>
        </div>

        <div className="flex flex-col justify-center gap-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = counts[star] ?? 0;
            const percentage = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
            return (
              <div key={star} className="flex items-center gap-3 text-sm">
                <span className="flex w-10 shrink-0 items-center gap-1 text-muted-foreground">
                  {star} <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right text-muted-foreground">
                  {percentage}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ReviewCard({ review }: { review: any }) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar>
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(review.user?.name || 'User')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="space-y-1">
                <p className="font-semibold">{review.user?.name || 'Anonymous'}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <RatingStars rating={review.rating} size="sm" />
                  <Badge
                    variant="secondary"
                    className="gap-1 border-0 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
                  >
                    <ShieldCheck className="h-3 w-3" />
                    Verified Purchase
                  </Badge>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(review.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p className="mt-2">{review.comment}</p>
            {review.sellerReply && (
              <div className="mt-3 pl-4 border-l-2 border-primary">
                <p className="text-sm font-medium text-primary">Seller Response</p>
                <p className="text-sm text-muted-foreground">{review.sellerReply}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(review.sellerReplyAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
