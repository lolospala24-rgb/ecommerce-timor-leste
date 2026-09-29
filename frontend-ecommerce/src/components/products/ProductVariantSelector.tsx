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
              <div className="flex flex-wrap gap-3">
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

                  // Image-backed options (color/pattern swatches) — a
                  // horizontal chip with a small square thumbnail beside its
                  // full label (never truncated; the chip just grows to fit
                  // a longer name like "sndalrndom 2pcs"), matching the
                  // reference layout rather than a vertical image-over-label
                  // tile.
                  if (showImage) {
                    return (
                      <button
                        key={`${attribute}-${value}`}
                        type="button"
                        disabled={!available}
                        onClick={() => onSelectAttribute(attribute, value)}
                        title={value}
                        className={cn(
                          'relative flex items-center gap-2 rounded-lg border-2 bg-background py-1.5 pl-1.5 pr-3 transition-colors',
                          selected
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/40',
                          !available && 'cursor-not-allowed opacity-40',
                        )}
                      >
                        <span className="relative block h-8 w-8 shrink-0 overflow-hidden rounded-md bg-muted">
                          <Image
                            src={optionImage!}
                            alt={value}
                            fill
                            className="object-cover"
                            sizes="32px"
                          />
                        </span>
                        <span
                          className={cn(
                            'text-sm font-medium',
                            selected ? 'text-primary' : 'text-foreground',
                            !available && 'line-through text-muted-foreground',
                          )}
                        >
                          {value}
                        </span>
                        {selected && (
                          <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                            <Check className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </button>
                    );
                  }

                  // Text-only options (size, material, ...) — a plain pill,
                  // uniform height, width determined by its own label.
                  return (
                    <button
                      key={`${attribute}-${value}`}
                      type="button"
                      disabled={!available}
                      onClick={() => onSelectAttribute(attribute, value)}
                      className={cn(
                        'relative flex h-10 min-w-[2.75rem] items-center justify-center rounded-lg border px-4 text-sm font-medium transition-colors',
                        selected
                          ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                          : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-muted/50',
                        !available && 'cursor-not-allowed border-border/60 text-muted-foreground line-through opacity-60',
                      )}
                    >
                      {value}
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
                <div className="flex gap-1.5 overflow-x-auto pt-1" data-lenis-prevent>
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
