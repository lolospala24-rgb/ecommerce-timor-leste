'use client';

import { ArrowDown, ArrowUp } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { cn } from '@/lib/utils';

interface SortTabsProps {
  sortBy: string;
  onChange: (sortBy: string) => void;
}

const PRICE_ASC = 'price_asc';
const PRICE_DESC = 'price_desc';

export function SortTabs({ sortBy, onChange }: SortTabsProps) {
  const { t } = useTranslation();
  const isPriceActive = sortBy === PRICE_ASC || sortBy === PRICE_DESC;

  const tabs = [
    { key: 'relevance', label: t('productList.sortRelevant') },
    { key: 'newest', label: t('productList.sortNewest') },
    { key: 'best_selling', label: t('productList.sortBestSelling') },
  ];

  return (
    <div className="flex border-b border-[#EEF1EE] bg-white">
      {tabs.map((tab) => (
        <Tab key={tab.key} active={sortBy === tab.key} onClick={() => onChange(tab.key)}>
          {tab.label}
        </Tab>
      ))}
      <Tab
        active={isPriceActive}
        onClick={() => onChange(sortBy === PRICE_ASC ? PRICE_DESC : PRICE_ASC)}
      >
        <span className="inline-flex items-center gap-1">
          {t('productList.sortPrice')}
          {isPriceActive &&
            (sortBy === PRICE_ASC ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />)}
        </span>
      </Tab>
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex h-12 flex-1 items-center justify-center text-[13px] font-semibold transition-colors',
        active ? 'border-b-[3px] border-[#17703F] text-[#17703F]' : 'border-b-[3px] border-transparent text-[#56635B]',
      )}
    >
      {children}
    </button>
  );
}
