'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { productService } from '@/services/product.service';
import { cn } from '@/lib/utils';

interface CartButtonProps {
  videoId: string;
  productId?: string;
  variant?: 'floating' | 'inline';
  size?: 'default' | 'lg';
  className?: string;
}

export function CartButton({
  videoId,
  productId,
  variant = 'inline',
  size = 'default',
  className,
}: CartButtonProps) {
  const [isInCart, setIsInCart] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCheck, setShowCheck] = useState(false);
  const { toast } = useToast();

  const isFloating = variant === 'floating';
  const isLarge = size === 'lg';

  const handleAddToCart = async () => {
    if (isInCart) return;

    setIsLoading(true);
    try {
      if (productId) {
        await productService.addToCart(productId);
      }
      setIsInCart(true);
      setShowCheck(true);

      toast({
        title: 'Added to Cart',
        description: 'Item has been added to your shopping cart.',
        duration: 3000,
      });

      setTimeout(() => setShowCheck(false), 2000);
    } catch {
      toast({
        title: 'Failed to add',
        description: 'Please try again.',
        variant: 'destructive',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col items-center">
      <Button
        variant={isInCart ? 'default' : 'ghost'}
        size={isLarge ? 'icon' : 'default'}
        className={cn(
          'group transition-all duration-200',
          isFloating ? 'h-12 w-12 rounded-full' : 'px-4',
          isInCart
            ? 'bg-[#FF3B5C] text-white hover:bg-[#FF3B5C]/90'
            : 'text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C]',
          className
        )}
        onClick={handleAddToCart}
        disabled={isLoading || isInCart}
      >
        <AnimatePresence mode="wait">
          {showCheck ? (
            <motion.div
              key="check"
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 90 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <Check className={cn('h-5 w-5', isLarge && 'h-6 w-6')} />
            </motion.div>
          ) : (
            <motion.div
              key="bag"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <ShoppingBag
                className={cn(
                  'transition-transform group-hover:scale-110',
                  isLarge ? 'h-6 w-6' : 'h-5 w-5'
                )}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {!isFloating && !isInCart && (
          <span className="ml-2 text-sm font-medium">Add to Cart</span>
        )}
        {!isFloating && isInCart && (
          <span className="ml-2 text-sm font-medium">In Cart</span>
        )}
      </Button>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="h-6 w-6 rounded-full border-2 border-[#FF3B5C] border-t-transparent"
          />
        </div>
      )}
    </div>
  );
}