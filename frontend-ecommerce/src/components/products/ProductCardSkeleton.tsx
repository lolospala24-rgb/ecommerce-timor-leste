import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Mirrors ProductCard.tsx's exact structure/classnames (aspect-square image,
// badge corner, wishlist-button corner, 2-line title reserving the same
// min-h-[2rem], rating+stock row, price row) so the grid doesn't visibly
// reflow — cards don't grow, shrink, or shift — once real products replace
// this. Never import ProductCard here or vice versa; keep both in sync by
// hand if ProductCard's layout ever changes.
export function ProductCardSkeleton() {
  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-xl border shadow-none">
      <div className="relative aspect-square overflow-hidden bg-muted/40">
        <Skeleton className="absolute inset-0 rounded-none" />
        {/* Discount badge placeholder */}
        <Skeleton className="absolute left-2.5 top-2.5 z-10 h-5 w-10 rounded-md" />
        {/* Wishlist button placeholder */}
        <Skeleton className="absolute right-2.5 top-2.5 z-20 h-8 w-8 rounded-full" />
      </div>

      <CardContent className="flex flex-1 flex-col p-2.5 pb-2">
        {/* Title — two lines, same min-h-[2rem] reservation as the real h3 */}
        <div className="min-h-[2rem] space-y-1">
          <Skeleton className="h-2.5 w-full rounded" />
          <Skeleton className="h-2.5 w-2/3 rounded" />
        </div>

        {/* Rating + stock row */}
        <div className="mt-1.5 flex items-center gap-1.5">
          <Skeleton className="h-3 w-10 rounded" />
          <Skeleton className="h-3 w-16 rounded" />
        </div>

        {/* Price row */}
        <div className="mt-auto flex items-baseline gap-1.5 pt-2">
          <Skeleton className="h-4 w-14 rounded" />
          <Skeleton className="h-3 w-10 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}
