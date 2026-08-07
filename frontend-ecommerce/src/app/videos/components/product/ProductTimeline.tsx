'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Product } from '@/types/product';
import { cn } from '@/lib/utils';

interface TimelineItem {
  timestamp: number;
  productId: string;
  product: Product;
}

interface ProductTimelineProps {
  items: TimelineItem[];
  currentTime: number;
  onProductClick?: (productId: string) => void;
  className?: string;
}

export function ProductTimeline({
  items,
  currentTime,
  onProductClick,
  className,
}: ProductTimelineProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    // Find the active item based on current time
    let active = null;
    for (let i = items.length - 1; i >= 0; i--) {
      if (currentTime >= items[i].timestamp) {
        active = i;
        break;
      }
    }
    setActiveIndex(active);

    // Scroll active item into view
    if (active !== null && itemRefs.current[active]) {
      itemRefs.current[active]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentTime, items]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (items.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">
        Shop the Video
      </h4>
      <div className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-[#1C1C1C] space-y-1.5">
        {items.map((item, index) => {
          const isActive = activeIndex === index;
          const isPast = activeIndex !== null && index <= activeIndex;

          return (
            <motion.div
              key={item.productId}
              ref={(el) => { itemRefs.current[index] = el; }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-200',
                isActive
                  ? 'bg-[#6366F1]/10 border border-[#6366F1]/20'
                  : 'hover:bg-[#1C1C1C]',
                isPast && !isActive && 'opacity-60'
              )}
              onClick={() => onProductClick?.(item.productId)}
            >
              {/* Timeline Dot */}
              <div className="relative flex-shrink-0">
                <div
                  className={cn(
                    'h-3 w-3 rounded-full border-2 transition-all duration-300',
                    isActive
                      ? 'bg-[#FF3B5C] border-[#FF3B5C] scale-125'
                      : isPast
                        ? 'bg-[#6366F1] border-[#6366F1]'
                        : 'bg-[#1C1C1C] border-[rgba(255,255,255,0.1)]'
                  )}
                />
                {index < items.length - 1 && (
                  <div
                    className={cn(
                      'absolute top-3 left-1/2 -translate-x-1/2 w-0.5 h-4',
                      isPast ? 'bg-[#6366F1]' : 'bg-[rgba(255,255,255,0.1)]'
                    )}
                  />
                )}
              </div>

              {/* Timestamp */}
              <span className="text-xs font-mono text-[#A3A3A3] flex-shrink-0 w-12">
                {formatTime(item.timestamp)}
              </span>

              {/* Product Info */}
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <div className="relative h-8 w-8 flex-shrink-0 rounded bg-[#0B0B0D] overflow-hidden">
                  <img
                    src={item.product.thumbnail ?? undefined}
                    alt={item.product.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm font-medium truncate',
                    isActive ? 'text-white' : 'text-[#A3A3A3]'
                  )}>
                    {item.product.name}
                  </p>
                  <p className="text-xs text-[#A3A3A3]">
                    ${item.product.price.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Active Indicator */}
              {isActive && (
                <motion.div
                  layoutId="active-timeline-indicator"
                  className="h-2 w-2 rounded-full bg-[#FF3B5C] flex-shrink-0"
                />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}