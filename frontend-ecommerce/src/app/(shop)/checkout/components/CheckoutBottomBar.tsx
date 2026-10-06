'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CheckoutBottomBarProps {
  totalLabel: string;
  amount: number;
  buttonLabel: string;
  onButtonClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export function CheckoutBottomBar({
  totalLabel,
  amount,
  buttonLabel,
  onButtonClick,
  disabled,
  loading,
  className,
}: CheckoutBottomBarProps) {
  return (
    <div
      className={cn('border-t border-[#DDE3DE] bg-white px-4 py-3', className)}
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto flex max-w-[720px] items-center gap-4">
        <div className="shrink-0">
          <p className="text-[13px] text-[#56635B]">{totalLabel}</p>
          <p className="text-[20px] font-extrabold leading-tight text-[#142019]">${amount.toFixed(2)}</p>
        </div>
        <button
          type="button"
          onClick={onButtonClick}
          disabled={disabled || loading}
          className="flex h-[50px] flex-1 items-center justify-center rounded-2xl bg-[#17703F] text-[15px] font-bold text-white transition-opacity disabled:bg-[#DDE3DE] disabled:text-[#9AA59C]"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : buttonLabel}
        </button>
      </div>
    </div>
  );
}
