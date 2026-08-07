'use client';

import { Product } from '@/types/product';
import { ProductPrice } from './ProductPrice';
import { ProductRating } from './ProductRating';
import { Truck, Shield, RotateCcw, Package, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductInfoProps {
  product: Product;
  className?: string;
  showShipping?: boolean;
  showDescription?: boolean;
}

export function ProductInfo({
  product,
  className,
  showShipping = true,
  showDescription = true,
}: ProductInfoProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Name & Category */}
      <div>
        <h2 className="text-xl font-bold text-white mt-1">{product.name}</h2>
        {product.category?.name && (
          <p className="text-sm text-[#A3A3A3] mt-1">{product.category.name}</p>
        )}
      </div>

      {/* Price */}
      <ProductPrice
        price={product.price}
        oldPrice={product.comparePrice ?? undefined}
        size="xl"
      />

      {/* Rating */}
      <ProductRating
        rating={product.rating ?? 0}
        count={product.totalReviews ?? 0}
        size="default"
      />

      {/* Stock Status */}
      <div className="flex items-center gap-2">
        {(product.stock ?? 0) > 0 ? (
          <>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span className="text-sm text-emerald-500 font-medium">In Stock</span>
            <span className="text-sm text-[#A3A3A3]">({product.stock} units available)</span>
          </>
        ) : (
          <>
            <Package className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-500 font-medium">Out of Stock</span>
          </>
        )}
      </div>

      {/* Description */}
      {showDescription && product.description && (
        <div className="pt-4 border-t border-[rgba(255,255,255,0.05)]">
          <h4 className="text-sm font-medium text-white mb-2">Description</h4>
          <p className="text-sm text-[#A3A3A3] leading-relaxed">
            {product.description}
          </p>
        </div>
      )}

      {/* Shipping Info */}
      {showShipping && (
        <div className="pt-4 border-t border-[rgba(255,255,255,0.05)] space-y-2">
          <h4 className="text-sm font-medium text-white mb-2">Shipping & Returns</h4>
          <div className="flex items-center gap-2 text-sm text-[#A3A3A3]">
            <Truck className="h-4 w-4" />
            <span>Free shipping on orders over $50</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#A3A3A3]">
            <RotateCcw className="h-4 w-4" />
            <span>30-day return policy</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#A3A3A3]">
            <Shield className="h-4 w-4" />
            <span>100% authentic products</span>
          </div>
        </div>
      )}
    </div>
  );
}