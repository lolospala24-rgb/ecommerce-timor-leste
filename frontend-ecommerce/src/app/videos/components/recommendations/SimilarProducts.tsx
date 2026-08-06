'use client';

import { Product } from '@/types/product';
import { ProductCard } from '@/components/product/ProductCard';
import { EmptyState } from '@/components/ui';
import { cn } from '@/lib/utils';

interface SimilarProductsProps {
  products: Product[];
  title?: string;
  className?: string;
  onProductClick?: (product: Product) => void;
}

export function SimilarProducts({
  products,
  title = 'Similar Products',
  className,
  onProductClick,
}: SimilarProductsProps) {
  if (products.length === 0) {
    return (
      <EmptyState
        iconName="shopping"
        title="No similar products"
        description="Check back later for more items"
        size="sm"
      />
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {products.slice(0, 6).map((product) => (
          <div
            key={product.id}
            className="cursor-pointer"
            onClick={() => onProductClick?.(product)}
          >
            <ProductCard
              product={product}
              variant="compact"
              showActions={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}