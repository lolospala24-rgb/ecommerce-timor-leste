'use client';

import { Product } from '@/types/product';
import { QuickAddButton } from './QuickAddButton';
import { BuyNowButton } from './BuyNowButton';
import { Button } from '@/components/ui/button';
import { Heart, Share2, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductActionsProps {
  product: Product;
  variant?: 'default' | 'compact' | 'floating';
  className?: string;
  onQuickAdd?: (product: Product) => void;
  onBuyNow?: (product: Product) => void;
  onWishlist?: (product: Product) => void;
  onShare?: (product: Product) => void;
}

export function ProductActions({
  product,
  variant = 'default',
  className,
  onQuickAdd,
  onBuyNow,
  onWishlist,
  onShare,
}: ProductActionsProps) {
  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <QuickAddButton
          product={product}
          size="sm"
          onAdd={() => onQuickAdd?.(product)}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-[#A3A3A3] hover:text-[#FF3B5C] hover:bg-[#FF3B5C]/10"
          onClick={() => onWishlist?.(product)}
        >
          <Heart className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (variant === 'floating') {
    return (
      <div className={cn('flex flex-col items-center gap-3', className)}>
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full text-[#A3A3A3] hover:text-[#FF3B5C] hover:bg-[#FF3B5C]/10"
          onClick={() => onWishlist?.(product)}
        >
          <Heart className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C]"
          onClick={() => onShare?.(product)}
        >
          <Share2 className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C]"
        >
          <Eye className="h-5 w-5" />
        </Button>
        <BuyNowButton
          product={product}
          size="sm"
          onBuy={() => onBuyNow?.(product)}
        />
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <QuickAddButton
        product={product}
        className="flex-1"
        onAdd={() => onQuickAdd?.(product)}
      />
      <BuyNowButton
        product={product}
        className="flex-1"
        onBuy={() => onBuyNow?.(product)}
      />
      <Button
        variant="ghost"
        size="icon"
        className="text-[#A3A3A3] hover:text-[#FF3B5C] hover:bg-[#FF3B5C]/10"
        onClick={() => onWishlist?.(product)}
      >
        <Heart className="h-5 w-5" />
      </Button>
    </div>
  );
}