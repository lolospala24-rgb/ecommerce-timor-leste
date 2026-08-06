'use client';

import { Product } from '@/types/product';
import { ProductPrice } from './ProductPrice';
import { ProductRating } from './ProductRating';
import { Badge } from '@/components/ui/badge';
import { Truck, Clock, Shield, RotateCcw, Package, CheckCircle } from 'lucide-react';
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
      {/* Brand & Name */}
      <div>
        <p className="text-sm text-[#6366F1] font-medium">{product.brand}</p>
        <h2 className="text-xl font-bold text-white mt-1">{product.name}</h2>
        <p className="text-sm text-[#A3A3A3] mt-1">{product.category}</p>
      </div>

      {/* Price */}
      <ProductPrice
        price={product.price}
        oldPrice={product.oldPrice}
        size="xl"
      />

      {/* Rating */}
      <ProductRating
        rating={product.rating}
        count={product.reviews}
        size="default"
      />

      {/* Stock Status */}
      <div className="flex items-center gap-2">
        {product.isInStock ? (
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
            <Clock className="h-4 w-4" />
            <span>Estimated delivery in {product.shipping.estimatedDays} business days</span>
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

      {/* Vouchers */}
      {product.vouchers && product.vouchers.length > 0 && (
        <div className="pt-4 border-t border-[rgba(255,255,255,0.05)]">
          <h4 className="text-sm font-medium text-white mb-2">Available Vouchers</h4>
          <div className="flex flex-wrap gap-2">
            {product.vouchers.map((voucher) => (
              <Badge
                key={voucher.id}
                className="bg-[#6366F1]/10 text-[#6366F1] border border-[#6366F1]/20 text-xs px-2 py-1"
              >
                {voucher.type === 'PERCENTAGE' ? `${voucher.discount}% OFF` : `$${voucher.discount} OFF`}
                {voucher.minPurchase > 0 && ` (min $${voucher.minPurchase})`}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}