'use client';

import Image from 'next/image';
import { Check, Tag } from 'lucide-react';
import type { ProductVariant } from '@/types/product.types';
import { getVariantForOption, getVariantImageForOption } from '@/lib/product';
import { cn } from '@/lib/utils';

interface VariantOptionGridProps {
  variants: ProductVariant[];
  attributeKeys: string[];
  attributeOptions: Record<string, string[]>;
  attributeLabels?: Record<string, string>;
  selectedAttributes: Record<string, string>;
  onSelectAttribute: (attribute: string, value: string) => void;
  isAttributeValueAvailable: (attribute: string, value: string) => boolean;
  productThumbnail?: string | null;
}

// The BuyBottomSheet's variant picker — one card per option (thumbnail,
// name, price, stock), grouped by attribute, so a buyer can pick a variant
// without leaving the sheet. Deliberately a different, richer visual than
// ProductVariantSelector's pill/swatch style used on the page itself: this
// mirrors the reference "quick buy" sheet design (per-option price/stock
// preview), while reusing the same selectAttribute/isAttributeValueAvailable
// logic the inline selector already uses, so both stay in sync.
export function VariantOptionGrid({
  variants,
  attributeKeys,
  attributeOptions,
  attributeLabels = {},
  selectedAttributes,
  onSelectAttribute,
  isAttributeValueAvailable,
  productThumbnail,
}: VariantOptionGridProps) {
  if (attributeKeys.length === 0) return null;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-base font-bold text-[#142019]">Varian Produtu</p>
        <p className="text-xs text-[#56635B]">Hili variante ne'ebé ita hakarak sosa:</p>
      </div>

      {attributeKeys.map((attribute) => {
        const selectedValue = selectedAttributes[attribute];
        return (
          <div key={attribute} className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E3F1E8] text-[#17703F]">
                  <Tag className="h-3.5 w-3.5" />
                </span>
                <p className="text-sm font-bold text-[#142019]">{attributeLabels[attribute] ?? attribute}</p>
              </div>
              <span className="rounded-full bg-[#E3F1E8] px-2.5 py-0.5 text-xs font-semibold text-[#17703F]">
                {selectedValue ? '1 hili ona' : '0 hili ona'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {attributeOptions[attribute]?.map((value) => {
                const selected = selectedValue === value;
                const available = isAttributeValueAvailable(attribute, value);
                const optionVariant = getVariantForOption(variants, attribute, value, selectedAttributes);
                const optionImage =
                  getVariantImageForOption(variants, attribute, value, selectedAttributes, productThumbnail) ??
                  productThumbnail ??
                  '/images/placeholder.png';
                const optionPrice = optionVariant?.effectivePrice ?? optionVariant?.price;
                const optionStock = optionVariant?.stock;

                return (
                  <button
                    key={`${attribute}-${value}`}
                    type="button"
                    disabled={!available}
                    onClick={() => onSelectAttribute(attribute, value)}
                    className={cn(
                      'relative flex flex-col items-center gap-1.5 rounded-xl border-2 p-2 text-center transition-colors',
                      selected ? 'border-[#17703F] bg-[#E3F1E8]/40' : 'border-[#DDE3DE] bg-white',
                      !available && 'cursor-not-allowed opacity-40',
                    )}
                  >
                    {selected && (
                      <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#17703F] text-white">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                    <div className="relative h-14 w-14 overflow-hidden rounded-lg bg-[#F4F6F3]">
                      <Image src={optionImage} alt={value} fill className="object-cover" sizes="56px" />
                    </div>
                    <span className="line-clamp-1 text-xs font-semibold text-[#142019]">{value}</span>
                    {optionPrice != null && (
                      <span className="text-xs font-bold text-[#17703F]">${optionPrice.toFixed(2)}</span>
                    )}
                    <span className="text-[11px] text-[#56635B]">
                      {optionStock != null ? `Stok: ${optionStock}` : available ? '—' : 'La iha'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
