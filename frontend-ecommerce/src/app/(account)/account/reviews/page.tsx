'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useUserReviews, useDeleteReview } from '@/hooks/useReviews';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, Edit, Trash2, Package } from 'lucide-react';
import { RatingStars } from '@/components/shared/RatingStars';
import { Pagination } from '@/components/shared/Pagination';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EditReviewDialog } from '@/components/account/EditReviewDialog';

export default function ReviewsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useUserReviews({ page, limit: 10 });
  const { mutateAsync: deleteReview, isPending: isDeleting } = useDeleteReview();

  const [editingReview, setEditingReview] = useState<{ id: number; rating: number; comment: string } | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteReview(deleteId);
    } finally {
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Reviews</h1>
        <p className="text-muted-foreground">Reviews you've written</p>
      </div>

      {data?.data?.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No Reviews</h3>
          <p className="text-muted-foreground">You haven't written any reviews yet</p>
          <Button className="mt-4" asChild>
            <Link href="/products">Browse Products</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {data?.data.map((review: any) => (
            <Card key={review.id}>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <RatingStars rating={review.rating} size="sm" />
                      <Badge variant={review.isApproved ? 'default' : 'secondary'}>
                        {review.isApproved ? 'Approved' : 'Pending'}
                      </Badge>
                    </div>
                    <Link href={`/products/${review.product?.slug || '#'}`} className="hover:text-primary">
                      <p className="font-medium">{review.product?.name}</p>
                    </Link>
                    <p className="text-sm text-muted-foreground">{review.comment}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={review.isApproved}
                      title={review.isApproved ? "Approved reviews can't be edited" : 'Edit review'}
                      onClick={() =>
                        setEditingReview({ id: review.id, rating: review.rating, comment: review.comment })
                      }
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setDeleteId(review.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {data?.pagination && data.pagination.totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={data.pagination.totalPages}
          totalItems={data.pagination.total}
          pageSize={data.pagination.limit}
          onPageChange={setPage}
          showTotal={false}
          className="mt-6"
        />
      )}

      <EditReviewDialog review={editingReview} onOpenChange={(open) => !open && setEditingReview(null)} />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Review"
        description="Are you sure you want to delete this review? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}
