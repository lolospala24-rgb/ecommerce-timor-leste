'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useDebounce } from '@/hooks/useDebounce';
import { useProducts } from '@/hooks/useProducts';
import { PriceRangeField } from './PriceRangeField';
import { FilterChipGroup } from './FilterChipGroup';
import { SwitchRow } from './SwitchRow';

export interface ProductListFilterValues {
  minPrice?: number;
  maxPrice?: number;
  originMunicipality?: string;
  minRating?: number;
  inStock?: boolean;
  isLocallyMade?: boolean;
}

export const EMPTY_PRODUCT_LIST_FILTERS: ProductListFilterValues = {};

// Rating is an exact-value param (minRating), not a free range — these 3
// fixed thresholds are what the reference design's star buttons map onto.
const RATING_OPTIONS = [
  { value: '4.5', label: '4.5+' },
  { value: '4', label: '4.0+' },
  { value: '3', label: '3.0+' },
];

interface FilterFieldsProps {
  draft: ProductListFilterValues;
  onDraftChange: (next: ProductListFilterValues) => void;
  municipalities: string[];
}

// Shared between the mobile/tablet Drawer below and the >=1000px sidebar
// panel in page.tsx, so both surfaces stay in sync with zero duplication.
export function FilterFields({ draft, onDraftChange, municipalities }: FilterFieldsProps) {
  const { t } = useTranslation();
  const municipalityOptions = municipalities.map((m) => ({ value: m, label: m }));

  return (
    <div className="space-y-5">
      <PriceRangeField
        minPrice={draft.minPrice}
        maxPrice={draft.maxPrice}
        onChange={(minPrice, maxPrice) => onDraftChange({ ...draft, minPrice, maxPrice })}
      />

      {municipalityOptions.length > 0 && (
        <FilterChipGroup
          label={t('productList.municipalityLabel')}
          options={municipalityOptions}
          selected={draft.originMunicipality}
          onToggle={(value) =>
            onDraftChange({ ...draft, originMunicipality: draft.originMunicipality === value ? undefined : value })
          }
          visibleCount={8}
          seeAllLabel={
            municipalityOptions.length > 8
              ? t('productList.seeAllMunicipalities', { count: municipalityOptions.length })
              : undefined
          }
        />
      )}

      <FilterChipGroup
        label={t('productList.ratingLabel')}
        options={RATING_OPTIONS}
        selected={draft.minRating != null ? String(draft.minRating) : undefined}
        onToggle={(value) =>
          onDraftChange({ ...draft, minRating: draft.minRating === Number(value) ? undefined : Number(value) })
        }
      />

      <div>
        <p className="mb-2 text-[13px] font-semibold text-[#142019]">{t('productList.otherLabel')}</p>
        <div className="space-y-3">
          <SwitchRow
            title={t('productList.inStockTitle')}
            subtitle={t('productList.inStockSubtitle')}
            checked={!!draft.inStock}
            onChange={(checked) => onDraftChange({ ...draft, inStock: checked ? true : undefined })}
          />
          <SwitchRow
            title={t('productList.localTitle')}
            subtitle={t('productList.localSubtitle')}
            checked={!!draft.isLocallyMade}
            onChange={(checked) => onDraftChange({ ...draft, isLocallyMade: checked ? true : undefined })}
          />
        </div>
      </div>
    </div>
  );
}

interface FilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: ProductListFilterValues;
  /** The non-filter-sheet query params (search/categoryId/sortBy) combined with
   *  the draft so the live result count reflects the full real query. */
  baseFilters: { search?: string; categoryId?: number; sortBy?: string };
  municipalities: string[];
  onApply: (filters: ProductListFilterValues) => void;
}

export function FilterSheet({ open, onOpenChange, filters, baseFilters, municipalities, onApply }: FilterSheetProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<ProductListFilterValues>(filters);

  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  const debouncedDraft = useDebounce(draft, 400);
  const { data } = useProducts({ ...baseFilters, ...debouncedDraft, page: 1, limit: 1, enabled: open });
  const count = data?.pagination?.total;

  const handleApply = () => {
    onApply(draft);
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh] rounded-t-[28px]">
        <div className="flex items-center justify-between border-b border-[#EEF1EE] px-5 pb-3">
          <DrawerTitle className="text-[16px] font-bold text-[#142019]">{t('productList.filterButton')}</DrawerTitle>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setDraft(EMPTY_PRODUCT_LIST_FILTERS)} className="text-[13px] font-semibold text-[#17703F]">
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

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <FilterFields draft={draft} onDraftChange={setDraft} municipalities={municipalities} />
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
