'use client';

import { Minus, Plus } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/LanguageContext';

interface QuantityStepperProps {
  quantity: number;
  onChange: (quantity: number) => void;
  max: number;
  min?: number;
  disabled?: boolean;
}

// Shared stepper — bordered box, radius 12, −/+ either side of the
// number. Used by CartItemTile and the product detail page's
// BuyBottomSheet (not the desktop inline selector, which stays on the
// older QuantitySelector to keep that page pixel-identical).
export function QuantityStepper({ quantity, onChange, max, min = 1, disabled }: QuantityStepperProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center overflow-hidden rounded-xl border border-[#DDE3DE] bg-white">
      <button
        type="button"
        onClick={() => onChange(quantity - 1)}
        disabled={disabled || quantity <= min}
        aria-label={t('cart.decrease')}
        className="flex h-11 w-11 items-center justify-center text-[#142019] disabled:text-[#9AA59C]"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="min-w-[1.75rem] text-center text-[15px] font-extrabold text-[#142019]">{quantity}</span>
      <button
        type="button"
        onClick={() => onChange(quantity + 1)}
        disabled={disabled || quantity >= max}
        aria-label={t('cart.increase')}
        className="flex h-11 w-11 items-center justify-center text-[#142019] disabled:text-[#9AA59C]"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
