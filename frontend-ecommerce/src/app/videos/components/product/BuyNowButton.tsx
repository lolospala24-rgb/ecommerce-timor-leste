'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Product } from '@/types/product';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface BuyNowButtonProps {
  product: Product;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  onBuy?: () => void;
}

export function BuyNowButton({
  product,
  size = 'default',
  className,
  onBuy,
}: BuyNowButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const isInStock = (product.stock ?? 0) > 0;

  const handleBuy = async () => {
    if (!isInStock) {
      toast({
        title: 'Out of Stock',
        description: 'This product is currently out of stock.',
        variant: 'destructive',
        duration: 3000,
      });
      return;
    }

    setIsLoading(true);
    try {
      // API call would go here
      await new Promise((resolve) => setTimeout(resolve, 500));
      onBuy?.();

      // Redirect to checkout with product
      router.push(`/checkout?product=${product.id}`);
    } catch {
      toast({
        title: 'Failed to Process',
        description: 'Please try again.',
        variant: 'destructive',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sizes = {
    sm: 'h-8 text-xs px-3',
    default: 'h-9 text-sm px-4',
    lg: 'h-11 text-base px-6',
  };

  return (
    <Button
      size={size}
      className={cn(
        'bg-[#6366F1] text-white hover:bg-[#6366F1]/90 transition-all duration-200',
        sizes[size],
        !isInStock && 'opacity-50 cursor-not-allowed',
        className
      )}
      onClick={handleBuy}
      disabled={!isInStock || isLoading}
    >
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Processing...</span>
          </motion.div>
        ) : (
          <motion.div
            key="default"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2"
          >
            <CreditCard className="h-4 w-4" />
            <span>Buy Now</span>
          </motion.div>
        )}
      </AnimatePresence>
    </Button>
  );
}