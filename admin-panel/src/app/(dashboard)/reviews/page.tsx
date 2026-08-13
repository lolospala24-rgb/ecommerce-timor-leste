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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Star, CheckCircle, XCircle, MessageSquareText, Loader2, Search, ShieldCheck } from 'lucide-react';
import {
  useAdminReviews,
  useApproveReview,
  useRejectReview,
  type PendingReview,
  type ReviewStatusFilter,
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

function StatusBadge({ review }: { review: PendingReview }) {
  if (review.isApproved) {
    return <Badge className="bg-green-600 hover:bg-green-600">Approved</Badge>;
  }
  if (review.rejectionReason) {
    return <Badge variant="destructive">Rejected</Badge>;
  }
  return <Badge variant="secondary">Pending</Badge>;
}

const STATUS_TABS: { value: ReviewStatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export default function ReviewsPage() {
  const [status, setStatus] = useState<ReviewStatusFilter>('pending');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching } = useAdminReviews(status, search, page);
  const approveReview = useApproveReview();
  const rejectReview = useRejectReview();

  const [rejectTarget, setRejectTarget] = useState<PendingReview | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const reviews = data?.data || [];

  const handleTabChange = (value: string) => {
    setStatus(value as ReviewStatusFilter);
    setPage(1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

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
          Search, filter, and moderate product reviews submitted by customers
        </p>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Reviews</CardTitle>
              <CardDescription>
                {data?.pagination?.total ?? 0} review{(data?.pagination?.total ?? 0) === 1 ? '' : 's'}
                {status !== 'all' ? ` · ${status}` : ''}
              </CardDescription>
            </div>
            <form onSubmit={handleSearchSubmit} className="flex w-full gap-2 sm:w-72">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search review, customer, product..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button type="submit" variant="outline" size="icon" aria-label="Search">
                <Search className="h-4 w-4" />
              </Button>
            </form>
          </div>

          <Tabs value={status} onValueChange={handleTabChange}>
            <TabsList>
              {STATUS_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
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
              <h3 className="text-lg font-semibold">
                {search ? 'No matching reviews' : 'All caught up'}
              </h3>
              <p className="text-muted-foreground">
                {search
                  ? `No reviews match "${search}".`
                  : status === 'pending'
                    ? 'There are no reviews waiting for moderation.'
                    : 'No reviews found for this filter.'}
              </p>
            </div>
          ) : (
            <div className={`space-y-4 transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
              {reviews.map((review) => (
                <Card key={review.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-4 md:items-start md:justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <StarRating rating={review.rating} />
                          <StatusBadge review={review} />
                          <Badge
                            variant="outline"
                            className="gap-1 border-green-200 text-green-700 dark:border-green-900 dark:text-green-400"
                          >
                            <ShieldCheck className="h-3 w-3" />
                            Verified Purchase
                          </Badge>
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
                        {review.rejectionReason && (
                          <p className="text-sm text-destructive">
                            Rejection reason: {review.rejectionReason}
                          </p>
                        )}
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
                      {!review.isApproved && !review.rejectionReason && (
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
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm text-muted-foreground">
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
