'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useUserReviews, useDeleteReview } from '@/hooks/useReviews';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, Pencil, Trash2 } from 'lucide-react';
import { RatingStars } from '@/components/shared/RatingStars';
import { Pagination } from '@/components/shared/Pagination';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EditReviewDialog } from '@/components/account/EditReviewDialog';
import { AccountAppBar } from '@/components/account/AccountAppBar';
import { StatusPill } from '@/components/account/StatusPill';

// The design calls for "Seidauk review / Review ona" tabs (reviews still to
// write vs. already written), but there's no backend endpoint that lists
// "delivered order items missing a review" in aggregate — eligibility is
// only checked per product. This renders the one real list that exists:
// reviews the user has already submitted, pending/approved either way.
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

  return (
    <div className="space-y-5">
      <AccountAppBar title="Ha'u-nia review" backHref="/account" />

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : data?.data?.length === 0 ? (
        <div className="rounded-2xl border py-12 text-center">
          <Star className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-medium">Seidauk iha review</h3>
          <p className="text-muted-foreground">Ita seidauk hakerek review ida</p>
          <Button className="mt-4" asChild>
            <Link href="/products">Buka produtu</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.data.map((review: any) => (
            <div key={review.id} className="space-y-2 rounded-2xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <RatingStars rating={review.rating} size="sm" />
                    <StatusPill
                      label={review.isApproved ? 'Aprova ona' : 'Hein aprovasaun'}
                      tone={review.isApproved ? 'success' : 'warning'}
                    />
                  </div>
                  <Link href={`/products/${review.product?.slug || '#'}`} className="hover:text-primary">
                    <p className="truncate font-medium text-foreground">{review.product?.name}</p>
                  </Link>
                  <p className="text-sm text-muted-foreground">{review.comment}</p>
                  <p className="text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={review.isApproved}
                    title={review.isApproved ? "Review aprova ona la bele edita" : 'Edita review'}
                    onClick={() => setEditingReview({ id: review.id, rating: review.rating, comment: review.comment })}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(review.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
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
        title="Hamoos review"
        description="Ita boot iha serteza katak atu hamoos review ida-ne'e? Asaun ida-ne'e labele troka fali."
        confirmText="Hamoos"
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}
