'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { productService } from '@/services/product.service';
import { cn } from '@/lib/utils';

interface WishlistButtonProps {
  videoId: string;
  productId?: string;
  initialInWishlist?: boolean;
  variant?: 'floating' | 'inline';
  size?: 'default' | 'lg';
  className?: string;
}

export function WishlistButton({
  videoId,
  productId,
  initialInWishlist = false,
  variant = 'inline',
  size = 'default',
  className,
}: WishlistButtonProps) {
  const [inWishlist, setInWishlist] = useState(initialInWishlist);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const isFloating = variant === 'floating';
  const isLarge = size === 'lg';

  const handleToggle = async () => {
    setIsLoading(true);
    const newState = !inWishlist;
    setInWishlist(newState);

    try {
      if (productId) {
        if (newState) {
          await productService.addToWishlist(productId);
        } else {
          await productService.removeFromWishlist(productId);
        }
      }
      toast({
        title: newState ? 'Added to Wishlist' : 'Removed from Wishlist',
        description: newState
          ? 'This item has been added to your wishlist.'
          : 'This item has been removed from your wishlist.',
        duration: 2000,
      });
    } catch {
      setInWishlist(!newState);
      toast({
        title: 'Failed to update wishlist',
        description: 'Please try again.',
        variant: 'destructive',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const color = inWishlist ? '#FF3B5C' : '#A3A3A3';

  return (
    <div className="relative flex flex-col items-center">
      <Button
        variant="ghost"
        size={isLarge ? 'icon' : 'default'}
        className={cn(
          'group transition-all duration-200',
          isFloating ? 'h-12 w-12 rounded-full' : 'px-4',
          inWishlist
            ? 'text-[#FF3B5C] hover:text-[#FF3B5C] hover:bg-[#FF3B5C]/10'
            : 'text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C]',
          className
        )}
        onClick={handleToggle}
        disabled={isLoading}
      >
        <motion.div
          animate={inWishlist ? { scale: 1.15 } : { scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
        >
          <Heart
            className={cn(
              'transition-transform group-hover:scale-110',
              inWishlist ? 'fill-[#FF3B5C]' : 'fill-none',
              isLarge ? 'h-6 w-6' : 'h-5 w-5'
            )}
          />
        </motion.div>

        {!isFloating && (
          <span className="ml-2 text-sm font-medium">
            {inWishlist ? 'In Wishlist' : 'Wishlist'}
          </span>
        )}
      </Button>
    </div>
  );
}