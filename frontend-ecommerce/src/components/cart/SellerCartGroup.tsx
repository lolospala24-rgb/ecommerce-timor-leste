'use client';

import { Store } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { CartItemTile } from './CartItemTile';
import { getCartItemKey } from '@/lib/cart';
import type { CartItem } from '@/types/cart.types';

const GREEN_CHECKBOX_CLASS = 'checked:border-[#17703F] checked:bg-[#17703F] border-[#DDE3DE]';

interface SellerCartGroupProps {
  sellerName: string;
  items: CartItem[];
  isItemSelected: (key: string) => boolean;
  onToggleItem: (key: string) => void;
  onToggleSeller: (keys: string[], selected: boolean) => void;
  onQuantityChange: (item: CartItem, quantity: number) => void;
  onRemove: (item: CartItem) => void;
  isRowUpdating: (key: string) => boolean;
}

export function SellerCartGroup({
  sellerName,
  items,
  isItemSelected,
  onToggleItem,
  onToggleSeller,
  onQuantityChange,
  onRemove,
  isRowUpdating,
}: SellerCartGroupProps) {
  const { t } = useTranslation();
  // Out-of-stock lines can never be selected, so the seller checkbox only
  // reflects the sellable ones — otherwise a seller with one unavailable
  // item could never show as "fully selected".
  const selectableKeys = items.filter((i) => i.stock > 0).map(getCartItemKey);
  const allSelected = selectableKeys.length > 0 && selectableKeys.every(isItemSelected);

  return (
    <div className="rounded-2xl border border-[#DDE3DE] bg-white p-4">
      <div className="flex items-center gap-2.5 border-b border-[#EEF1EE] pb-3">
        <Checkbox
          checked={allSelected}
          onCheckedChange={(checked) => onToggleSeller(selectableKeys, checked)}
          disabled={selectableKeys.length === 0}
          aria-label={t('cart.selectSeller', { seller: sellerName })}
          className={GREEN_CHECKBOX_CLASS}
        />
        <Store className="h-4 w-4 text-[#17703F]" />
        <span className="truncate text-[15px] font-bold text-[#142019]">{sellerName}</span>
      </div>

      <div className="divide-y divide-[#EEF1EE]">
        {items.map((item) => {
          const key = getCartItemKey(item);
          return (
            <CartItemTile
              key={key}
              item={item}
              selected={isItemSelected(key)}
              onToggleSelect={() => onToggleItem(key)}
              onQuantityChange={(quantity) => onQuantityChange(item, quantity)}
              onRemove={() => onRemove(item)}
              isUpdating={isRowUpdating(key)}
            />
          );
        })}
      </div>
    </div>
  );
}
