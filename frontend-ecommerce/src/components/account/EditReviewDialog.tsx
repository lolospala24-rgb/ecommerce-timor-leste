'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Star, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useUpdateReview } from '@/hooks/useReviews';

const MIN_COMMENT_LENGTH = 10;
const MAX_COMMENT_LENGTH = 1000;

interface EditReviewDialogProps {
  review: { id: number; rating: number; comment: string } | null;
  onOpenChange: (open: boolean) => void;
}

// Mirrors the "Write a Review" star-rating + textarea pattern in
// ProductReviews.tsx — same interaction, just pre-filled and PATCHing an
// existing review instead of POSTing a new one.
export function EditReviewDialog({ review, onOpenChange }: EditReviewDialogProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const { mutateAsync: updateReview, isPending } = useUpdateReview();

  useEffect(() => {
    if (review) {
      setRating(review.rating);
      setComment(review.comment);
    }
  }, [review]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!review) return;
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    if (comment.trim().length < MIN_COMMENT_LENGTH) {
      toast.error(`Review must be at least ${MIN_COMMENT_LENGTH} characters`);
      return;
    }

    try {
      await updateReview({ id: review.id, rating, comment: comment.trim() });
      onOpenChange(false);
    } catch {
      // useUpdateReview's onError already shows a toast.
    }
  };

  return (
    <Dialog open={!!review} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Review</DialogTitle>
          <DialogDescription>Update your rating and comment.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="mb-2 block">Rating</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
                  onClick={() => setRating(star)}
                  aria-label={`Rate ${star} out of 5 stars`}
                  aria-pressed={star <= rating}
                >
                  <Star
                    className={cn(
                      'h-8 w-8 transition-colors',
                      star <= rating ? 'fill-amber-500 text-amber-500' : 'text-slate-300',
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="edit-review-comment">Review</Label>
              <span
                className={cn(
                  'text-xs',
                  comment.length > MAX_COMMENT_LENGTH ? 'text-destructive' : 'text-muted-foreground',
                )}
              >
                {comment.length}/{MAX_COMMENT_LENGTH}
              </span>
            </div>
            <Textarea
              id="edit-review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={MAX_COMMENT_LENGTH}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
