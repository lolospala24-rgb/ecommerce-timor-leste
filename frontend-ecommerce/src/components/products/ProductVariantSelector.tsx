'use client';

import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Check, Package } from 'lucide-react';
import type { ProductVariant } from '@/types/product.types';
import {
  formatVariantLabel,
  getVariantImageForOption,
  getVariantThumbnail,
} from '@/lib/product';
import { cn } from '@/lib/utils';

interface ProductVariantSelectorProps {
  variants: ProductVariant[];
  attributeKeys: string[];
  attributeOptions: Record<string, string[]>;
  attributeLabels?: Record<string, string>;
  selectedAttributes: Record<string, string>;
  selectedVariant: ProductVariant | null;
  selectedVariantLabel: string | null;
  onSelectAttribute: (attribute: string, value: string) => void;
  onSelectVariant?: (variant: ProductVariant) => void;
  isAttributeValueAvailable: (attribute: string, value: string) => boolean;
  productThumbnail?: string | null;
  compact?: boolean;
}

export function ProductVariantSelector({
  variants,
  attributeKeys,
  attributeOptions,
  attributeLabels = {},
  selectedAttributes,
  selectedVariant,
  selectedVariantLabel,
  onSelectAttribute,
  onSelectVariant,
  isAttributeValueAvailable,
  productThumbnail,
  compact = false,
}: ProductVariantSelectorProps) {
  if (variants.length === 0) return null;

  const hasVariantImages = variants.some((v) => Array.isArray(v.images) && v.images.length > 0);

  return (
    <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
            {compact ? 'Options' : 'Select Options'}
          </h3>
        </div>
        {hasVariantImages && (
          <span className="text-xs text-muted-foreground">Tap to preview variant image</span>
        )}
      </div>

      <div className="space-y-5">
        {attributeKeys.length > 0 ? (
          attributeKeys.map((attribute) => (
            <div key={attribute} className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">
                  {attributeLabels[attribute] ?? attribute}
                </p>
                {selectedAttributes[attribute] && (
                  <span className="text-xs text-muted-foreground">
                    {selectedAttributes[attribute]}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2.5">
                {attributeOptions[attribute]?.map((value) => {
                  const selected = selectedAttributes[attribute] === value;
                  const available = isAttributeValueAvailable(attribute, value);
                  const optionImage = getVariantImageForOption(
                    variants,
                    attribute,
                    value,
                    selectedAttributes,
                  );
                  const showImage = Boolean(optionImage);

                  return (
                    <button
                      key={`${attribute}-${value}`}
                      type="button"
                      disabled={!available}
                      onClick={() => onSelectAttribute(attribute, value)}
                      className={cn(
                        'relative flex flex-col items-center gap-1.5 rounded-xl border transition-all',
                        showImage ? 'p-1.5 min-w-[4.5rem]' : 'px-4 py-2.5 min-w-[3rem]',
                        selected
                          ? 'border-primary bg-primary/5 ring-2 ring-primary ring-offset-1'
                          : 'border-border bg-background hover:border-primary/50 hover:bg-muted/50',
                        !available && 'cursor-not-allowed opacity-35',
                      )}
                    >
                      {selected && (
                        <span className="absolute -right-1 -top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                          <Check className="h-2.5 w-2.5" />
                        </span>
                      )}
                      {showImage && optionImage && (
                        <div className="relative h-14 w-14 overflow-hidden rounded-lg bg-muted sm:h-16 sm:w-16">
                          <Image
                            src={optionImage}
                            alt={value}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        </div>
                      )}
                      <span
                        className={cn(
                          'text-xs font-medium sm:text-sm',
                          selected ? 'text-primary' : 'text-foreground',
                          !available && 'line-through',
                        )}
                      >
                        {value}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="space-y-2.5">
            <p className="text-sm font-medium text-muted-foreground">Available variants</p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {variants.map((variant) => {
                const label = formatVariantLabel(variant, attributeKeys, attributeLabels);
                const selected = selectedVariant?.id === variant.id;
                const thumb = getVariantThumbnail(variant, productThumbnail);

                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => onSelectVariant?.(variant)}
                    className={cn(
                      'relative flex flex-col items-center gap-2 rounded-xl border p-2 transition-all',
                      selected
                        ? 'border-primary bg-primary/5 ring-2 ring-primary ring-offset-1'
                        : 'border-border bg-background hover:border-primary/50 hover:bg-muted/50',
                    )}
                  >
                    {selected && (
                      <span className="absolute right-1 top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                    )}
                    <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
                      <Image
                        src={thumb}
                        alt={label}
                        fill
                        className="object-cover"
                        sizes="120px"
                      />
                    </div>
                    <span className="line-clamp-2 text-center text-xs font-medium">{label}</span>
                    <span className="text-xs font-semibold text-primary">
                      ${variant.price.toFixed(2)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {selectedVariant && !compact && (
        <div className="mt-5 rounded-xl border border-dashed border-primary/25 bg-primary/5 p-3.5 sm:p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Your selection
          </p>
          <div className="mt-3 flex gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border bg-background shadow-sm sm:h-24 sm:w-24">
              <Image
                src={getVariantThumbnail(selectedVariant, productThumbnail)}
                alt={selectedVariantLabel ?? 'Selected variant'}
                fill
                className="object-cover"
                sizes="96px"
              />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              {selectedVariantLabel && (
                <p className="font-semibold text-foreground">{selectedVariantLabel}</p>
              )}
              <div className="flex flex-wrap gap-1.5">
                <Badge className="bg-primary/90 hover:bg-primary/90">
                  ${selectedVariant.price.toFixed(2)}
                </Badge>
                <Badge variant="outline" className="bg-background/80 font-normal">
                  SKU: {selectedVariant.sku || 'N/A'}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    'font-normal',
                    selectedVariant.stock > 0
                      ? 'border-green-200 text-green-700'
                      : 'border-red-200 text-red-700',
                  )}
                >
                  {selectedVariant.stock > 0
                    ? `${selectedVariant.stock} in stock`
                    : 'Out of stock'}
                </Badge>
              </div>
              {selectedVariant.images && selectedVariant.images.length > 1 && (
                <div className="flex gap-1.5 overflow-x-auto pt-1">
                  {selectedVariant.images.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-background"
                    >
                      <Image src={img} alt={`${selectedVariantLabel} ${idx + 1}`} fill className="object-cover" sizes="40px" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
