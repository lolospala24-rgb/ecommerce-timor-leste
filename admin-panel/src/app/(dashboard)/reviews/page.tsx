'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Star, CheckCircle, XCircle, MessageSquareText, Loader2 } from 'lucide-react';
import {
  usePendingReviews,
  useApproveReview,
  useRejectReview,
  type PendingReview,
} from '@/hooks/useReviews';

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`}
        />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const { data, isLoading } = usePendingReviews();
  const approveReview = useApproveReview();
  const rejectReview = useRejectReview();

  const [rejectTarget, setRejectTarget] = useState<PendingReview | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const reviews = data?.data || [];

  const handleReject = async () => {
    if (!rejectTarget || !rejectionReason.trim()) return;
    await rejectReview.mutateAsync({ id: rejectTarget.id, reason: rejectionReason.trim() });
    setRejectTarget(null);
    setRejectionReason('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Review Moderation</h1>
        <p className="text-muted-foreground">
          Approve or reject product reviews awaiting publication
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Reviews</CardTitle>
          <CardDescription>
            {data?.pagination?.total ?? 0} review{(data?.pagination?.total ?? 0) === 1 ? '' : 's'} waiting for a decision
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">All caught up</h3>
              <p className="text-muted-foreground">There are no reviews waiting for moderation.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <Card key={review.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-4 md:items-start md:justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <StarRating rating={review.rating} />
                          <Badge variant="secondary">Pending</Badge>
                        </div>
                        <p className="text-sm">
                          <span className="font-medium">{review.product?.name || 'Unknown product'}</span>
                          {review.product?.seller?.storeName && (
                            <span className="text-muted-foreground"> · sold by {review.product.seller.storeName}</span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          By {review.user?.name || 'Unknown user'} ({review.user?.email || 'N/A'}) on{' '}
                          {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'N/A'}
                        </p>
                        {review.title && <p className="font-medium">{review.title}</p>}
                        <p className="text-sm">{review.comment}</p>
                        {review.images?.length > 0 && (
                          <div className="flex gap-2 pt-1">
                            {review.images.map((src, i) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                key={i}
                                src={src}
                                alt={`Review attachment ${i + 1}`}
                                className="h-16 w-16 rounded-md object-cover border"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          className="bg-green-600 hover:bg-green-700"
                          disabled={approveReview.isPending}
                          onClick={() => approveReview.mutate(review.id)}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          disabled={rejectReview.isPending}
                          onClick={() => setRejectTarget(review)}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquareText className="h-5 w-5" />
              Reject Review
            </DialogTitle>
            <DialogDescription>
              Explain why this review is being rejected. The customer will see this reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rejection-reason">Rejection Reason</Label>
            <Textarea
              id="rejection-reason"
              placeholder="e.g. Contains inappropriate language, unrelated to the product..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectionReason.trim() || rejectReview.isPending}
              onClick={handleReject}
            >
              {rejectReview.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Reject Review'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
