'use client';

import { forwardRef, HTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animate?: boolean;
}

const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant = 'rectangular', width, height, animate = true, ...props }, ref) => {
    const variants = {
      text: 'h-4 rounded',
      circular: 'rounded-full',
      rectangular: 'rounded-none',
      rounded: 'rounded-lg',
    };

    return (
      <motion.div
        ref={ref}
        className={cn(
          'bg-[#151515] relative overflow-hidden',
          variants[variant],
          className
        )}
        style={{
          width: width || 'auto',
          height: height || 'auto',
          minHeight: variant === 'text' ? '1rem' : undefined,
        }}
        {...props}
      >
        {animate && (
          <motion.div
            className="absolute inset-0 -translate-x-full"
            animate={{
              translateX: ['0%', '100%', '0%'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          </motion.div>
        )}
      </motion.div>
    );
  }
);

Skeleton.displayName = 'Skeleton';

// Predefined skeleton components
const SkeletonText = ({ lines = 3, className, ...props }: { lines?: number } & SkeletonProps) => (
  <div className={cn('space-y-2', className)}>
    {[...Array(lines)].map((_, i) => (
      <Skeleton
        key={i}
        variant="text"
        width={i === lines - 1 ? '60%' : '100%'}
        {...props}
      />
    ))}
  </div>
);

const SkeletonCard = ({ className, ...props }: SkeletonProps) => (
  <div className={cn('space-y-3', className)}>
    <Skeleton variant="rounded" height="160px" {...props} />
    <SkeletonText lines={2} {...props} />
  </div>
);

const SkeletonAvatar = ({ className, ...props }: SkeletonProps) => (
  <Skeleton
    variant="circular"
    width="40px"
    height="40px"
    className={className}
    {...props}
  />
);

export { Skeleton, SkeletonText, SkeletonCard, SkeletonAvatar };