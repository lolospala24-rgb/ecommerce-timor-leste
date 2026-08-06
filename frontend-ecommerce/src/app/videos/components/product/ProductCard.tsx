'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Product } from '@/types/product.types';
import { Button } from '@/components/ui/button';
import { Heart, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  variant?: 'default' | 'compact' | 'horizontal';
  className?: string;
}

export function ProductCard({ product, variant = 'default', className }: ProductCardProps) {
  const [isWishlisted, setIsWishlisted] = useState(false);

  const comparePrice = product.comparePrice ?? product.price;
  const discount = comparePrice && comparePrice > product.price
    ? Math.round(((comparePrice - product.price) / comparePrice) * 100)
    : 0;
  const hasStock = (product.stock ?? 0) > 0;
  const rating = product.rating?.toFixed(1) ?? '0';
  const reviews = product.totalReviews ?? 0;

  if (variant === 'compact') {
    return (
      <div className={cn(
        'flex gap-3 p-2 bg-[#0B0B0D] rounded-xl hover:bg-[#1C1C1C] transition-all cursor-pointer border border-transparent hover:border-[rgba(255,255,255,0.05)]',
        className
      )}>
        <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-[#0B0B0D] flex-shrink-0">
          <Image
            src={product.thumbnail || '/images/placeholder.png'}
            alt={product.name}
            fill
            className="object-cover"
          />
          {discount > 0 && (
            <span className="absolute top-0.5 right-0.5 text-[8px] font-bold text-[#FF3B5C] bg-black/60 px-1 rounded">
              -{discount}%
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{product.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm font-bold text-white">${product.price.toFixed(2)}</span>
            {comparePrice > product.price && (
              <span className="text-xs text-[#A3A3A3] line-through">${comparePrice.toFixed(2)}</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-[#A3A3A3]">
            <span>⭐ {rating}</span>
            <span>•</span>
            <span>{reviews} reviews</span>
          </div>
        </div>
        <button className="h-8 w-8 rounded-full bg-[#FF3B5C] text-white hover:bg-[#FF3B5C]/90 transition-colors flex items-center justify-center flex-shrink-0">
          <Plus className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className={cn(
      'group bg-[#151515] rounded-xl overflow-hidden border border-[rgba(255,255,255,0.05)] hover:border-[#6366F1]/20 transition-all',
      className
    )}>
      <div className="relative aspect-square bg-[#0B0B0D]">
        <Image
          src={product.thumbnail || '/images/placeholder.png'}
          alt={product.name}
          fill
          className="object-cover transition-transform group-hover:scale-105"
        />
        {discount > 0 && (
          <span className="absolute top-2 left-2 bg-[#FF3B5C] text-white text-xs px-2 py-0.5 rounded-full">
            -{discount}%
          </span>
        )}
        {!hasStock && (
          <div className="absolute inset-0 bg-[#0B0B0D]/80 flex items-center justify-center">
            <span className="bg-red-500/90 text-white text-sm px-4 py-1.5 rounded-full">Out of Stock</span>
          </div>
        )}
      </div>
      <div className="p-3 space-y-2">
        <p className="font-medium text-white truncate">{product.name}</p>
        <p className="text-xs text-[#A3A3A3]">{product.category?.name || 'Featured Item'}</p>
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-white">${product.price.toFixed(2)}</span>
          {comparePrice > product.price && (
            <span className="text-xs text-[#A3A3A3] line-through">${comparePrice.toFixed(2)}</span>
          )}
        </div>
        <Button
          size="sm"
          className="w-full bg-[#FF3B5C] hover:bg-[#FF3B5C]/90 text-white"
          disabled={!hasStock}
        >
          Add to Cart
        </Button>
      </div>
    </div>
  );
}