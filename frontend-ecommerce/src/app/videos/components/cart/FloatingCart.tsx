'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/hooks/useCart';
import { MiniCart } from './MiniCart';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge'; // ✅ ADD THIS IMPORT
import { ShoppingBag, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingCartProps {
  className?: string;
}

export function FloatingCart({ className }: FloatingCartProps) {
  const { totalItems, subtotal } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isVisible || totalItems === 0) {
    return null;
  }

  return (
    <>
      {/* Floating Button */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Button
          className="h-14 w-14 rounded-full bg-[#FF3B5C] hover:bg-[#FF3B5C]/90 text-white shadow-2xl shadow-[#FF3B5C]/20"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <div className="relative">
              <ShoppingBag className="h-6 w-6" />
              <Badge className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center p-1 text-[10px] bg-white text-[#FF3B5C]">
                {totalItems > 9 ? '9+' : totalItems}
              </Badge>
            </div>
          )}
        </Button>
      </motion.div>

      {/* Cart Popup */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-2rem)]"
          >
            <MiniCart className="shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}