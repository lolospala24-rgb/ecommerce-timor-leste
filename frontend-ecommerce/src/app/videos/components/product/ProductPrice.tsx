'use client';

import { cn } from '@/lib/utils';

interface ProductPriceProps {
  price: number;
  oldPrice?: number;
  currency?: string;
  size?: 'sm' | 'default' | 'lg' | 'xl';
  className?: string;
}

export function ProductPrice({
  price,
  oldPrice,
  currency = '$',
  size = 'default',
  className,
}: ProductPriceProps) {
  const sizes = {
    sm: {
      price: 'text-sm',
      oldPrice: 'text-xs',
    },
    default: {
      price: 'text-base',
      oldPrice: 'text-sm',
    },
    lg: {
      price: 'text-xl',
      oldPrice: 'text-base',
    },
    xl: {
      price: 'text-2xl',
      oldPrice: 'text-lg',
    },
  };

  const discount = oldPrice ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;

  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      <span className={cn(
        'font-bold text-white',
        sizes[size].price
      )}>
        {currency}{price.toFixed(2)}
      </span>

      {oldPrice && (
        <span className={cn(
          'text-[#A3A3A3] line-through',
          sizes[size].oldPrice
        )}>
          {currency}{oldPrice.toFixed(2)}
        </span>
      )}

      {discount > 0 && (
        <span className="text-[10px] font-semibold text-[#FF3B5C] bg-[#FF3B5C]/10 px-1.5 py-0.5 rounded">
          -{discount}%
        </span>
      )}
    </div>
  );
}