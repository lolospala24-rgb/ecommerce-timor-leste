'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Product } from '@/types/product';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface QuickAddButtonProps {
  product: Product;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
  onAdd?: () => void;
}

export function QuickAddButton({
  product,
  size = 'default',
  variant = 'default',
  className,
  onAdd,
}: QuickAddButtonProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const { toast } = useToast();
  const isInStock = (product.stock ?? 0) > 0;

  const handleAdd = async () => {
    if (!isInStock) {
      toast({
        title: 'Out of Stock',
        description: 'This product is currently out of stock.',
        variant: 'destructive',
        duration: 3000,
      });
      return;
    }

    setIsAdding(true);
    try {
      // API call would go here
      await new Promise((resolve) => setTimeout(resolve, 500));
      setIsAdded(true);
      onAdd?.();

      toast({
        title: 'Added to Cart',
        description: `${product.name} has been added to your cart.`,
        duration: 3000,
      });

      setTimeout(() => setIsAdded(false), 2000);
    } catch {
      toast({
        title: 'Failed to Add',
        description: 'Please try again.',
        variant: 'destructive',
        duration: 3000,
      });
    } finally {
      setIsAdding(false);
    }
  };

  const sizes = {
    sm: 'h-8 text-xs px-3',
    default: 'h-9 text-sm px-4',
    lg: 'h-11 text-base px-6',
  };

  const variants = {
    default: 'bg-[#FF3B5C] text-white hover:bg-[#FF3B5C]/90',
    outline: 'border border-[rgba(255,255,255,0.08)] text-white hover:bg-[#1C1C1C]',
    ghost: 'text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C]',
  };

  return (
    <Button
      size={size}
      variant={variant === 'default' ? 'default' : 'outline'}
      className={cn(
        'transition-all duration-200',
        sizes[size],
        variants[variant],
        isAdded && 'bg-emerald-500 text-white hover:bg-emerald-500/90',
        !isInStock && 'opacity-50 cursor-not-allowed',
        className
      )}
      onClick={handleAdd}
      disabled={!isInStock || isAdding}
    >
      <AnimatePresence mode="wait">
        {isAdding ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Adding...</span>
          </motion.div>
        ) : isAdded ? (
          <motion.div
            key="added"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2"
          >
            <Check className="h-4 w-4" />
            <span>Added</span>
          </motion.div>
        ) : (
          <motion.div
            key="default"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Add to Cart</span>
          </motion.div>
        )}
      </AnimatePresence>
    </Button>
  );
}