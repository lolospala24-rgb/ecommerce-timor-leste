'use client';

import { forwardRef, HTMLAttributes, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:ring-offset-2 focus:ring-offset-[#0B0B0D]',
  {
    variants: {
      variant: {
        default: 'bg-[#FF3B5C] text-white',
        secondary: 'bg-[#6366F1] text-white',
        outline: 'border border-[rgba(255,255,255,0.08)] text-white',
        ghost: 'bg-[#1C1C1C] text-white',
        destructive: 'bg-red-500/20 text-red-500',
        success: 'bg-emerald-500/20 text-emerald-400',
        warning: 'bg-amber-500/20 text-amber-400',
        info: 'bg-blue-500/20 text-blue-400',
        live: 'bg-red-500 text-white animate-pulse',
        premium: 'bg-gradient-to-r from-[#FF3B5C] to-[#6366F1] text-white',
      },
      size: {
        default: 'px-2.5 py-0.5 text-xs',
        sm: 'px-2 py-0.5 text-[10px]',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  children: ReactNode;
  dot?: boolean;
  dotColor?: string;
}

const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, children, dot, dotColor, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(badgeVariants({ variant, size }), className)}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full mr-1.5 flex-shrink-0',
              dotColor || 'bg-current'
            )}
          />
        )}
        {children}
      </div>
    );
  }
);

Badge.displayName = 'Badge';

export { Badge, badgeVariants };