'use client';

import { Product } from '@/types/product';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ProductBadgeProps {
  product: Product;
  className?: string;
}

export function ProductBadge({ product, className }: ProductBadgeProps) {
  const badges = [];

  // Discount badge
  const discount = product.oldPrice
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0;

  if (discount > 0) {
    badges.push({
      label: `-${discount}%`,
      variant: 'default' as const,
      className: 'bg-[#FF3B5C] text-white',
    });
  }

  // New badge (within 7 days)
  const isNew = new Date(product.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  if (isNew) {
    badges.push({
      label: 'New',
      variant: 'secondary' as const,
      className: 'bg-[#6366F1] text-white',
    });
  }

  // Best seller badge
  if (product.sold > 1000) {
    badges.push({
      label: 'Best Seller',
      variant: 'success' as const,
      className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20',
    });
  }

  // Limited stock badge
  if (product.stock < 10 && product.stock > 0) {
    badges.push({
      label: `Only ${product.stock} left`,
      variant: 'warning' as const,
      className: 'bg-amber-500/20 text-amber-400 border-amber-500/20',
    });
  }

  if (badges.length === 0) return null;

  return (
    <div className={cn('absolute top-2 left-2 flex flex-col gap-1', className)}>
      {badges.map((badge, index) => (
        <Badge
          key={index}
          className={cn(
            'text-[10px] px-2 py-0.5 h-5 font-medium',
            badge.className
          )}
          variant={badge.variant}
        >
          {badge.label}
        </Badge>
      ))}
    </div>
  );
}