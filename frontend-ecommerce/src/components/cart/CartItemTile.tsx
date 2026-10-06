'use client';

import Image from 'next/image';
import { Loader2, ShoppingCart, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { QuantityStepper } from './QuantityStepper';
import type { CartItem } from '@/types/cart.types';

const CART_LOW_STOCK_THRESHOLD = 5;
const GREEN_CHECKBOX_CLASS = 'checked:border-[#17703F] checked:bg-[#17703F] border-[#DDE3DE]';

interface CartItemTileProps {
  item: CartItem;
  selected: boolean;
  onToggleSelect: () => void;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
  isUpdating: boolean;
}

export function CartItemTile({ item, selected, onToggleSelect, onQuantityChange, onRemove, isUpdating }: CartItemTileProps) {
  const { t } = useTranslation();
  const outOfStock = item.stock <= 0;
  const variantLabel =
    item.variantAttributes && typeof item.variantAttributes === 'object'
      ? Object.values(item.variantAttributes as Record<string, string>).filter(Boolean).join(' / ') || null
      : null;

  const stockCaption = outOfStock
    ? t('cart.stockOut')
    : item.stock <= CART_LOW_STOCK_THRESHOLD
      ? t('cart.stockLow', { count: item.stock })
      : t('cart.stockOk');

  return (
    <div className={`flex gap-3 py-3 ${outOfStock ? 'opacity-50' : ''}`}>
      <div className="flex h-[76px] shrink-0 items-center">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggleSelect}
          disabled={outOfStock}
          aria-label={item.name}
          className={GREEN_CHECKBOX_CLASS}
        />
      </div>

      <div className="relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-xl border border-[#DDE3DE] bg-[#F4F6F3]">
        {item.thumbnail ? (
          <Image src={item.thumbnail} alt={item.name} fill className="object-cover" sizes="76px" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[#9AA59C]">
            <ShoppingCart className="h-7 w-7" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[14px] font-semibold text-[#142019]">{item.name}</p>
        {variantLabel && (
          <p className="mt-0.5 truncate text-[12px] text-[#56635B]">{variantLabel}</p>
        )}
        <div className="mt-1 flex items-center gap-2">
          <span className="text-[16px] font-extrabold text-[#17703F]">${item.price.toFixed(2)}</span>
          {item.originalPrice != null && item.originalPrice > item.price && (
            <span className="text-[12px] text-[#56635B] line-through">${item.originalPrice.toFixed(2)}</span>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="relative">
            <QuantityStepper
              quantity={item.quantity}
              onChange={onQuantityChange}
              max={item.stock}
              disabled={outOfStock || isUpdating}
            />
            {isUpdating && (
              <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70">
                <Loader2 className="h-4 w-4 animate-spin text-[#17703F]" />
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label={t('cart.removeFromCart')}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#56635B]"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <p className={`mt-1.5 text-[12px] font-medium ${outOfStock ? 'text-[#93330B]' : item.stock <= CART_LOW_STOCK_THRESHOLD ? 'text-[#93330B]' : 'text-[#56635B]'}`}>
          {stockCaption}
        </p>
      </div>
    </div>
  );
}
