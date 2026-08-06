'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingStarsProps {
  rating: number;
  totalReviews?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCount?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
  xl: 'h-6 w-6',
};

const gapClasses = {
  sm: 'gap-0.5',
  md: 'gap-0.5',
  lg: 'gap-1',
  xl: 'gap-1',
};

const textSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg',
};

export function RatingStars({
  rating,
  totalReviews,
  size = 'md',
  showCount = false,
  className,
}: RatingStarsProps) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className={cn('flex items-center', gapClasses[size])}>
        {/* Full stars */}
        {[...Array(fullStars)].map((_, i) => (
          <Star
            key={`full-${i}`}
            className={cn(
              'fill-yellow-400 text-yellow-400',
              sizeClasses[size]
            )}
          />
        ))}
        
        {/* Half star */}
        {hasHalfStar && (
          <div className="relative">
            <Star
              className={cn('text-yellow-400', sizeClasses[size])}
              style={{ fill: 'none' }}
            />
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <Star
                className={cn('fill-yellow-400 text-yellow-400', sizeClasses[size])}
              />
            </div>
          </div>
        )}
        
        {/* Empty stars */}
        {[...Array(emptyStars)].map((_, i) => (
          <Star
            key={`empty-${i}`}
            className={cn('text-gray-300', sizeClasses[size])}
          />
        ))}
      </div>
      
      <span className={cn('text-muted-foreground', textSizeClasses[size])}>
        {rating.toFixed(1)}
        {showCount && totalReviews !== undefined && (
          <span className="ml-1">({totalReviews})</span>
        )}
      </span>
    </div>
  );
}

// Static version for server-side rendering
export function StaticRatingStars({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className={cn('flex items-center', gapClasses[size])}>
      {[...Array(fullStars)].map((_, i) => (
        <Star
          key={`full-${i}`}
          className={cn(
            'fill-yellow-400 text-yellow-400',
            sizeClasses[size]
          )}
        />
      ))}
      {hasHalfStar && (
        <div className="relative">
          <Star
            className={cn('text-yellow-400', sizeClasses[size])}
            style={{ fill: 'none' }}
          />
          <div className="absolute inset-0 overflow-hidden w-1/2">
            <Star
              className={cn('fill-yellow-400 text-yellow-400', sizeClasses[size])}
            />
          </div>
        </div>
      )}
      {[...Array(emptyStars)].map((_, i) => (
        <Star
          key={`empty-${i}`}
          className={cn('text-gray-300', sizeClasses[size])}
        />
      ))}
    </div>
  );
}