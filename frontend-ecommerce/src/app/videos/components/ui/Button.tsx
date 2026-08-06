'use client';

import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { motion, MotionProps } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B0D] disabled:opacity-50 disabled:cursor-not-allowed gap-2',
  {
    variants: {
      variant: {
        default: 'bg-[#FF3B5C] text-white hover:bg-[#FF3B5C]/90 active:scale-[0.98] shadow-lg shadow-[#FF3B5C]/20 hover:shadow-[#FF3B5C]/30',
        secondary: 'bg-[#6366F1] text-white hover:bg-[#6366F1]/90 active:scale-[0.98] shadow-lg shadow-[#6366F1]/20 hover:shadow-[#6366F1]/30',
        outline: 'border border-[rgba(255,255,255,0.08)] bg-transparent text-white hover:bg-[#1C1C1C] active:scale-[0.98]',
        ghost: 'bg-transparent text-white hover:bg-[#1C1C1C] active:scale-[0.98]',
        destructive: 'bg-red-500/10 text-red-500 hover:bg-red-500/20 active:scale-[0.98] border border-red-500/20',
        success: 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 active:scale-[0.98] border border-emerald-500/20',
        glass: 'bg-white/5 backdrop-blur-sm text-white hover:bg-white/10 active:scale-[0.98] border border-white/10',
      },
      size: {
        default: 'h-10 px-4 py-2 text-sm',
        sm: 'h-8 px-3 py-1.5 text-xs',
        lg: 'h-12 px-6 py-3 text-base',
        icon: 'h-10 w-10 p-0',
        'icon-sm': 'h-8 w-8 p-0',
        'icon-lg': 'h-12 w-12 p-0',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  children?: ReactNode;
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      loading = false,
      icon,
      iconPosition = 'left',
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <motion.button
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        disabled={isDisabled}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.1 }}
        {...(props as MotionProps)}
      >
        {loading ? (
          <>
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Loading...</span>
          </>
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <span className="flex-shrink-0">{icon}</span>
            )}
            {children}
            {icon && iconPosition === 'right' && (
              <span className="flex-shrink-0">{icon}</span>
            )}
          </>
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };