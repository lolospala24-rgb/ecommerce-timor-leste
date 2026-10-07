'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useDebounce } from '@/hooks/useDebounce';
import { useCategoryProducts } from '@/hooks/useCategories';
import { PriceRangeField } from '@/components/products/list/PriceRangeField';
import { FilterChipGroup } from '@/components/products/list/FilterChipGroup';
import { SwitchRow } from '@/components/products/list/SwitchRow';
import type { CategoryFilterFacet, CategoryListingFilters } from '@/types/category.types';

interface CategoryFilterDraft {
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  minRating?: number;
  brand: string[];
  attributes: Record<string, string[]>;
}

function toDraft(filters: CategoryListingFilters): CategoryFilterDraft {
  return {
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    inStock: filters.inStock,
    minRating: filters.minRating,
    brand: filters.brand ?? [],
    attributes: filters.attributes,
  };
}

const RATING_OPTIONS = [
  { value: '4', label: '4+' },
  { value: '3', label: '3+' },
  { value: '2', label: '2+' },
  { value: '1', label: '1+' },
];

interface CategoryFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  facets: CategoryFilterFacet[];
  filters: CategoryListingFilters;
  onApply: (patch: Partial<CategoryListingFilters>) => void;
}

// Reuses Task 4's PriceRangeField/FilterChipGroup/SwitchRow building blocks
// (same scoped tokens) but adds brand + dynamic per-category attribute
// facets — the generic product-list FilterSheet has neither, and this
// category's real, admin-configured filterConfig would otherwise be lost.
export function CategoryFilterSheet({ open, onOpenChange, slug, facets, filters, onApply }: CategoryFilterSheetProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<CategoryFilterDraft>(() => toDraft(filters));

  useEffect(() => {
    if (open) setDraft(toDraft(filters));
  }, [open, filters]);

  const debouncedDraft = useDebounce(draft, 400);
  const { data } = useCategoryProducts(
    slug,
    { ...filters, ...debouncedDraft, page: 1, limit: 1 },
    { enabled: open },
  );
  const count = data?.pagination?.total;

  const brandFacet = facets.find((f) => f.source === 'brand' || f.key === 'brand');
  const attributeFacets = facets.filter(
    (f) => (f.type === 'multiselect' || f.type === 'select') && f.key !== 'brand' && f.source !== 'brand',
  );

  const handleReset = () =>
    setDraft({ minPrice: undefined, maxPrice: undefined, inStock: undefined, minRating: undefined, brand: [], attributes: {} });

  const handleApply = () => {
    onApply({
      minPrice: draft.minPrice,
      maxPrice: draft.maxPrice,
      inStock: draft.inStock,
      minRating: draft.minRating,
      brand: draft.brand.length > 0 ? draft.brand : undefined,
      attributes: draft.attributes,
    });
    onOpenChange(false);
  };

  const toggleBrand = (value: string) =>
    setDraft((prev) => ({
      ...prev,
      brand: prev.brand.includes(value) ? prev.brand.filter((b) => b !== value) : [...prev.brand, value],
    }));

  const toggleAttribute = (key: string, value: string) =>
    setDraft((prev) => {
      const current = prev.attributes[key] || [];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, attributes: { ...prev.attributes, [key]: next } };
    });

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh] rounded-t-[28px]">
        <div className="flex items-center justify-between border-b border-[#EEF1EE] px-5 pb-3">
          <DrawerTitle className="text-[16px] font-bold text-[#142019]">{t('productList.filterButton')}</DrawerTitle>
          <div className="flex items-center gap-3">
            <button type="button" onClick={handleReset} className="text-[13px] font-semibold text-[#17703F]">
              {t('productList.resetAll')}
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label={t('productList.close')}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F4F6F3] text-[#56635B]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <PriceRangeField
            minPrice={draft.minPrice}
            maxPrice={draft.maxPrice}
            onChange={(minPrice, maxPrice) => setDraft((prev) => ({ ...prev, minPrice, maxPrice }))}
          />

          <FilterChipGroup
            label={t('productList.ratingLabel')}
            options={RATING_OPTIONS}
            selected={draft.minRating != null ? String(draft.minRating) : undefined}
            onToggle={(value) =>
              setDraft((prev) => ({ ...prev, minRating: prev.minRating === Number(value) ? undefined : Number(value) }))
            }
          />

          {brandFacet?.options && brandFacet.options.length > 0 && (
            <FilterChipGroup
              label={t('category.brandLabel')}
              options={brandFacet.options.map((o) => ({ value: o.value, label: `${o.label} (${o.count})` }))}
              selected={draft.brand}
              onToggle={toggleBrand}
            />
          )}

          {attributeFacets.map((facet) =>
            facet.options && facet.options.length > 0 ? (
              <FilterChipGroup
                key={facet.key}
                label={facet.label}
                options={facet.options.map((o) => ({ value: o.value, label: `${o.label} (${o.count})` }))}
                selected={draft.attributes[facet.key] || []}
                onToggle={(value) => toggleAttribute(facet.key, value)}
              />
            ) : null,
          )}

          <SwitchRow
            title={t('productList.inStockTitle')}
            subtitle={t('productList.inStockSubtitle')}
            checked={!!draft.inStock}
            onChange={(checked) => setDraft((prev) => ({ ...prev, inStock: checked ? true : undefined }))}
          />
        </div>

        <div className="sticky bottom-0 flex gap-3 border-t border-[#EEF1EE] bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-[48px] flex-1 rounded-2xl border border-[#DDE3DE] text-[14px] font-semibold text-[#142019]"
          >
            {t('productList.cancel')}
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="h-[48px] flex-1 rounded-2xl bg-[#17703F] text-[14px] font-bold text-white"
          >
            {t('productList.showResults', { count: count ?? '' })}
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
