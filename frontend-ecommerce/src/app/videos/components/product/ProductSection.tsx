'use client';

import { Product } from '@/types/product';
import { ProductCarousel } from './ProductCarousel';

interface ProductSectionProps {
  products: Product[];
  title?: string;
}

export function ProductSection({ products, title = 'Shop the Products' }: ProductSectionProps) {
  if (!products || products.length === 0) {
    return (
      <div className="text-center py-4 text-[#A3A3A3]">
        <p className="text-sm">No products available</p>
      </div>
    );
  }

  return (
    <div className="rounded-[24px] border border-white/10 bg-[#111114]/85 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.24)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <span className="text-xs text-[#A3A3A3]">{products.length} items</span>
      </div>
      <ProductCarousel products={products} />
    </div>
  );
}