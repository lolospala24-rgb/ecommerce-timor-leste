'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SelectableOptionCardProps {
  selected: boolean;
  onClick: () => void;
  ariaLabel: string;
  children: ReactNode;
  radioPosition?: 'left' | 'right';
  className?: string;
}

// Generic radio-card shell shared by AddressCard, ShippingOptionCard, and
// PaymentMethodCard — unselected 1px border, selected 2px brand-green
// border + filled radio dot, whole card tappable with radio semantics.
export function SelectableOptionCard({
  selected,
  onClick,
  ariaLabel,
  children,
  radioPosition = 'left',
  className,
}: SelectableOptionCardProps) {
  const radio = (
    <span
      className={cn(
        'mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2',
        selected ? 'border-[#17703F]' : 'border-[#C9D1CB]',
      )}
    >
      {selected && <span className="h-[10px] w-[10px] rounded-full bg-[#17703F]" />}
    </span>
  );

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        'flex w-full min-h-11 items-start gap-3 rounded-2xl border bg-white p-4 text-left transition-colors',
        selected ? 'border-2 border-[#17703F]' : 'border border-[#DDE3DE]',
        className,
      )}
    >
      {radioPosition === 'left' && radio}
      <span className="min-w-0 flex-1">{children}</span>
      {radioPosition === 'right' && radio}
    </button>
  );
}
