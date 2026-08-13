'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import { VideoProduct } from '@/types/video';
import { useCart } from '@/hooks/useCart';
import { formatCurrency as formatPrice } from '@/lib/formatters';

export function ProductShoppingCard({ product }: { product: VideoProduct }) {
  const { addToCart } = useCart();
  const hasDiscount = product.comparePrice != null && product.comparePrice > product.price;
  const outOfStock = product.stock <= 0;

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (outOfStock) return;
    await addToCart(product, 1);
    toast.success('Product added to cart');
  };

  return (
    <Link
      href={`/products/${product.slug}`}
      className="pointer-events-auto flex min-w-0 items-center gap-3 rounded-2xl bg-white/95 p-2.5 pr-3 shadow-lg backdrop-blur transition hover:bg-white"
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
        {product.thumbnail ? (
          <Image src={product.thumbnail} alt={product.name} fill sizes="56px" className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-neutral-300">
            <ShoppingCart className="h-6 w-6" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-neutral-900">{product.name}</p>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-rose-600">{formatPrice(product.price)}</span>
          {hasDiscount && (
            <span className="text-xs text-neutral-400 line-through">{formatPrice(product.comparePrice as number)}</span>
          )}
        </div>
        {outOfStock && <span className="text-xs font-medium text-neutral-400">Out of stock</span>}
      </div>

      <button
        type="button"
        onClick={handleQuickAdd}
        disabled={outOfStock}
        aria-label="Add to cart"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-40"
      >
        <ShoppingCart className="h-4 w-4" />
      </button>

      <span className="flex shrink-0 items-center gap-1 rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white">
        Shop Now
        <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}
