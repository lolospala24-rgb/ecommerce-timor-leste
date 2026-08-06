'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Product } from '@/types/product.types';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Eye, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CartPreviewProps {
  product: Product;
  className?: string;
}

export function CartPreview({ product, className }: CartPreviewProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={cn(
        'group relative bg-[#151515] rounded-xl overflow-hidden border border-[rgba(255,255,255,0.05)] transition-all duration-300',
        isHovered && 'shadow-xl shadow-[#FF3B5C]/5 border-[#FF3B5C]/20',
        className,
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image */}
      <Link href={`/products/${product.id}`} className="block aspect-square relative">
        <Image
          src={product.thumbnail ?? '/images/placeholder.png'}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {product.comparePrice && product.comparePrice > 0 && product.price > 0 &&
          product.comparePrice > product.price && (
            <Badge className="absolute top-2 left-2 bg-[#FF3B5C] text-white text-xs">
              -{Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)}%
            </Badge>
          )}

        {product.stock <= 0 && (
          <div className="absolute inset-0 bg-[#0B0B0D]/80 flex items-center justify-center">
            <Badge className="bg-red-500/90 text-white text-sm px-4 py-1.5">Out of Stock</Badge>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Brand & Name */}
        <div>
          <p className="text-xs text-[#A3A3A3]">
            {product.seller?.storeName ?? product.category?.name ?? 'Brand'}
          </p>

          <Link
            href={`/products/${product.id}`}
            className="text-sm font-medium text-white hover:text-[#6366F1] transition-colors line-clamp-1"
          >
            {product.name}
          </Link>
        </div>

        {/* Price */}
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-white">${product.price.toFixed(2)}</span>

          {product.comparePrice &&
            product.comparePrice > 0 &&
            product.comparePrice > product.price && (
              <span className="text-xs text-[#A3A3A3] line-through">
                ${(product.comparePrice ?? 0).toFixed(2)}
              </span>
            )}
        </div>

        {/* Rating */}
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <span
                key={i}
                className={cn(
                  'text-xs',
                  i < Math.floor(product.rating)
                    ? 'text-yellow-500'
                    : 'text-[#A3A3A3]/30',
                )}
              >
                ★
              </span>
            ))}
          </div>

        <span className="text-xs text-[#A3A3A3]">({Number(product.totalReviews ?? 0)})</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-[rgba(255,255,255,0.05)]">
          <Button
            size="sm"
            className="flex-1 bg-[#FF3B5C] hover:bg-[#FF3B5C]/90 text-white text-xs h-8"
            disabled={product.stock <= 0}
          >
            <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />
            Add to Cart
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C]"
          >
            <Heart className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C]"
            asChild
          >
            <Link href={`/products/${product.id}`}>
              <Eye className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Hover Glow Effect */}
      {isHovered && (
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#FF3B5C]/5 to-transparent opacity-50" />
      )}
    </motion.div>
  );
}

