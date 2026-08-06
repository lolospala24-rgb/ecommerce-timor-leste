'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductRatingProps {
  rating: number;
  count?: number;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  showCount?: boolean;
}

export function ProductRating({
  rating,
  count,
  size = 'default',
  className,
  showCount = true,
}: ProductRatingProps) {
  const sizes = {
    sm: { star: 'h-3 w-3', text: 'text-xs' },
    default: { star: 'h-4 w-4', text: 'text-sm' },
    lg: { star: 'h-5 w-5', text: 'text-base' },
  };

  const fullStars = Math.floor(rating);
  const hasHalfStar = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  if (rating === 0) {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <span className={cn('text-[#A3A3A3]', sizes[size].text)}>No reviews</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div className="flex">
        {[...Array(fullStars)].map((_, i) => (
          <Star
            key={`full-${i}`}
            className={cn(
              'fill-yellow-400 text-yellow-400',
              sizes[size].star
            )}
          />
        ))}
        {hasHalfStar && (
          <div className="relative">
            <Star
              className={cn('text-yellow-400', sizes[size].star)}
              style={{ fill: 'none' }}
            />
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <Star
                className={cn('fill-yellow-400 text-yellow-400', sizes[size].star)}
              />
            </div>
          </div>
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <Star
            key={`empty-${i}`}
            className={cn('text-[#A3A3A3]/30', sizes[size].star)}
          />
        ))}
      </div>

      <span className={cn('text-[#A3A3A3]', sizes[size].text)}>
        {rating.toFixed(1)}
        {showCount && count !== undefined && count > 0 && (
          <span className="ml-1">({count})</span>
        )}
      </span>
    </div>
  );
}