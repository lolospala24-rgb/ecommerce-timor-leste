'use client';

import { useRef, useState, useEffect } from 'react';
import { Product } from '@/types/product.types';
import { ProductCard } from './ProductCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProductCarouselProps {
  products: Product[];
}

export function ProductCarousel({ products }: ProductCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const container = containerRef.current;
    if (!container) return;
    setCanScrollLeft(container.scrollLeft > 10);
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 10
    );
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [products]);

  const scroll = (direction: 'left' | 'right') => {
    const container = containerRef.current;
    if (!container) return;
    const scrollAmount = 200;
    const newScroll = container.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
    container.scrollTo({ left: newScroll, behavior: 'smooth' });
    setTimeout(checkScroll, 300);
  };

  return (
    <div className="relative h-[210px]">
      <div
        ref={containerRef}
        className="flex h-full items-stretch gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2"
        onScroll={checkScroll}
      >
        {products.map((product) => (
          <div key={product.id} className="flex-shrink-0 w-[176px] snap-start">
            <ProductCard product={product} variant="compact" className="h-full" />
          </div>
        ))}
      </div>

      {canScrollLeft && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 h-8 w-8 rounded-full shadow-lg bg-[#1C1C1C] hover:bg-[#2C2C2C] text-white border border-[rgba(255,255,255,0.08)]"
          onClick={() => scroll('left')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      {canScrollRight && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 h-8 w-8 rounded-full shadow-lg bg-[#1C1C1C] hover:bg-[#2C2C2C] text-white border border-[rgba(255,255,255,0.08)]"
          onClick={() => scroll('right')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}