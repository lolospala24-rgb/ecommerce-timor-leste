'use client';

import { useTranslation } from '@/lib/i18n/LanguageContext';
import { cn } from '@/lib/utils';

interface PriceRangeFieldProps {
  minPrice?: number;
  maxPrice?: number;
  onChange: (minPrice?: number, maxPrice?: number) => void;
}

const PRESETS: Array<{ labelKey: string; min?: number; max?: number }> = [
  { labelKey: 'productList.priceUnder10', min: undefined, max: 10 },
  { labelKey: 'productList.price10to50', min: 10, max: 50 },
  { labelKey: 'productList.price50to500', min: 50, max: 500 },
  { labelKey: 'productList.priceOver500', min: 500, max: undefined },
];

export function PriceRangeField({ minPrice, maxPrice, onChange }: PriceRangeFieldProps) {
  const { t } = useTranslation();

  const parse = (value: string) => (value === '' ? undefined : Number(value));

  return (
    <div>
      <p className="mb-2 text-[13px] font-semibold text-[#142019]">{t('productList.priceLabel')}</p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          placeholder={t('productList.priceMin')}
          value={minPrice ?? ''}
          onChange={(e) => onChange(parse(e.target.value), maxPrice)}
          className="h-[46px] w-full rounded-xl border border-[#DDE3DE] bg-white px-3 text-[14px] text-[#142019] outline-none focus:border-[#17703F]"
        />
        <span className="text-[#56635B]">–</span>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          placeholder={t('productList.priceMax')}
          value={maxPrice ?? ''}
          onChange={(e) => onChange(minPrice, parse(e.target.value))}
          className="h-[46px] w-full rounded-xl border border-[#DDE3DE] bg-white px-3 text-[14px] text-[#142019] outline-none focus:border-[#17703F]"
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {PRESETS.map((preset) => {
          const active = minPrice === preset.min && maxPrice === preset.max;
          return (
            <button
              key={preset.labelKey}
              type="button"
              onClick={() => onChange(preset.min, preset.max)}
              aria-pressed={active}
              className={cn(
                'rounded-[10px] border px-3 py-1.5 text-[12px] font-medium min-h-[32px]',
                active ? 'border-[#17703F] bg-[#E3F1E8] text-[#0F5530]' : 'border-[#DDE3DE] bg-white text-[#56635B]',
              )}
            >
              {t(preset.labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
