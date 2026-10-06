'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReviewSummaryProps {
  rating: number;
  totalReviews: number;
}

// "Review" tab header per spec item 5 — big number + 5 stars + "Bazeia ba
// review n". The rest of the tab (filters, write-review form, review
// list, pagination) still comes from the existing <ProductReviews>, which
// renders right below this.
export function ReviewSummary({ rating, totalReviews }: ReviewSummaryProps) {
  if (totalReviews === 0) return null;

  const fullStars = Math.round(rating);

  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-[#DDE3DE] bg-white p-6 text-center">
      <span className="text-5xl font-extrabold leading-none text-[#142019]">{rating.toFixed(1)}</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={cn('h-5 w-5', n <= fullStars ? 'fill-[#C27803] text-[#C27803]' : 'text-[#D5DBD6]')}
          />
        ))}
      </div>
      <p className="text-sm text-[#56635B]">
        Bazeia ba review {totalReviews}
      </p>
    </div>
  );
}
