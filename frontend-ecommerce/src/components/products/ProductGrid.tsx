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
    4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
  };

  return (
    <div className="space-y-6">
      <div className={`grid gap-4 md:gap-6 ${gridCols[columns]}`}>
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
          />
        ))}
      </div>

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