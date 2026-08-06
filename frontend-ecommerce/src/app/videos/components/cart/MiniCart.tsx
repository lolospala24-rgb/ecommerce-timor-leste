'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Minus, ShoppingBag, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MiniCartProps {
  className?: string;
}

export function MiniCart({ className }: MiniCartProps) {
  const { items, totalItems, subtotal, removeItem, updateQuantity, clearCart } = useCart();
  const [isExpanded, setIsExpanded] = useState(false);

  if (totalItems === 0) {
    return (
      <div className={cn('p-4 text-center', className)}>
        <ShoppingBag className="h-12 w-12 mx-auto text-[#A3A3A3]/30 mb-3" />
        <p className="text-[#A3A3A3]">Your cart is empty</p>
        <p className="text-sm text-[#A3A3A3]/60">
          Start adding items to your cart
        </p>
      </div>
    );
  }

  return (
    <div className={cn('bg-[#151515] rounded-xl border border-[rgba(255,255,255,0.05)]', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[rgba(255,255,255,0.05)]">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-[#A3A3A3]" />
          <span className="font-medium text-white">
            Cart ({totalItems} {totalItems === 1 ? 'item' : 'items'})
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-red-500 hover:text-red-400 hover:bg-red-500/10"
          onClick={clearCart}
        >
          Clear All
        </Button>
      </div>

      {/* Items */}
      <div className="max-h-80 overflow-y-auto divide-y divide-[rgba(255,255,255,0.05)]">
        {items.map((item) => (
          <motion.div
            key={item.productId}
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 flex gap-3 group hover:bg-[#1C1C1C] transition-colors"
          >
            {/* Image */}
            <Link
              href={`/products/${item.slug}`}
              className="relative h-16 w-16 flex-shrink-0 rounded-lg overflow-hidden bg-[#0B0B0D]"
            >
              {item.thumbnail ? (
                <Image
                  src={item.thumbnail}
                  alt={item.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-[#A3A3A3]">
                  <ShoppingBag className="h-6 w-6" />
                </div>
              )}
            </Link>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <Link
                href={`/products/${item.slug}`}
                className="text-sm font-medium text-white hover:text-[#6366F1] transition-colors line-clamp-1"
              >
                {item.name}
              </Link>
              <p className="text-xs text-[#A3A3A3]">${item.price.toFixed(2)}</p>

              <div className="flex items-center gap-2 mt-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C]"
                  onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="text-xs text-white w-4 text-center">
                  {item.quantity}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C]"
                  onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                  disabled={item.quantity >= item.stock}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Price & Remove */}
            <div className="flex flex-col items-end gap-1">
              <span className="text-sm font-medium text-white">
                ${(item.price * item.quantity).toFixed(2)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-[#A3A3A3] hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeItem(item.productId)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[rgba(255,255,255,0.05)] space-y-3">
        <div className="flex justify-between">
          <span className="text-[#A3A3A3]">Subtotal</span>
          <span className="font-semibold text-white">${subtotal.toFixed(2)}</span>
        </div>

        <Button className="w-full bg-[#FF3B5C] hover:bg-[#FF3B5C]/90 text-white" asChild>
          <Link href="/checkout">Proceed to Checkout</Link>
        </Button>

        <Button
          variant="ghost"
          className="w-full text-[#A3A3A3] hover:text-white"
          asChild
        >
          <Link href="/cart">View Full Cart</Link>
        </Button>
      </div>
    </div>
  );
}