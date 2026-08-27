'use client';

import { ProductCard } from './ProductCard';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { Package } from 'lucide-react';

interface ProductGridProps {
  products: any[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onPageChange?: (page: number) => void;
  columns?: 2 | 3 | 4;
}

export function ProductGrid({
  products,
  pagination,
  onPageChange,
  columns = 4,
}: ProductGridProps) {
  if (!products || products.length === 0) {
    return (
      <EmptyState
        title="No products found"
        description="Try adjusting your search or filter criteria"
        icon={<Package className="h-10 w-10 text-muted-foreground" />}
      />
    );
  }

  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
  };

  return (
    <div className="space-y-6">
      {columns === 4 ? (
        // Flex-wrap with a fixed per-card basis instead of CSS grid: a grid
        // leaves a large empty gap to the right of a trailing partial row
        // (e.g. 5 products in a 4-column grid strands 1 card alone on row
        // 2). Centering a wrapped flex row only affects that leftover
        // row — full rows have no slack to redistribute, so they render
        // identically to before.
        <div className="flex flex-wrap justify-center gap-4 md:gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="w-[calc(50%-0.5rem)] sm:w-[calc(33.333%-0.667rem)] md:w-[calc(33.333%-1rem)] lg:w-[calc(25%-1.125rem)]"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      ) : (
        <div className={`grid gap-4 md:gap-6 ${gridCols[columns]}`}>
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
            />
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && onPageChange && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.total}
          pageSize={pagination.limit}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}