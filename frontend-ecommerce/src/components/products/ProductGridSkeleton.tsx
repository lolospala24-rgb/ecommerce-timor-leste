import { ProductCardSkeleton } from './ProductCardSkeleton';

interface ProductGridSkeletonProps {
  count?: number;
  className?: string;
}

// Same grid classes as HomepageSections' real product grid (grid-cols-2 ->
// lg:4 -> xl:6) — swapping this out for the real grid once data arrives
// causes no column-count/gap change, only card content changing.
export function ProductGridSkeleton({ count = 6, className }: ProductGridSkeletonProps) {
  return (
    <div className={`grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4 xl:grid-cols-6 ${className ?? ''}`}>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
