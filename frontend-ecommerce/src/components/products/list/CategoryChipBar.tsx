'use client';

import { useTranslation } from '@/lib/i18n/LanguageContext';
import { cn } from '@/lib/utils';

interface CategoryOption {
  id: number;
  name: string;
  nameTetum?: string | null;
}

interface CategoryChipBarProps {
  categories: CategoryOption[];
  selectedId?: number;
  onSelect: (id: number | undefined) => void;
}

export function CategoryChipBar({ categories, selectedId, onSelect }: CategoryChipBarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2.5" data-lenis-prevent>
      <Chip label={t('productList.categoryAll')} active={selectedId === undefined} onClick={() => onSelect(undefined)} />
      {categories.map((cat) => (
        <Chip
          key={cat.id}
          label={cat.name || cat.nameTetum || ''}
          active={selectedId === cat.id}
          onClick={() => onSelect(cat.id)}
        />
      ))}
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-semibold transition-colors min-h-[36px]',
        active ? 'bg-[#142019] text-white' : 'border border-[#DDE3DE] bg-white text-[#142019]',
      )}
    >
      {label}
    </button>
  );
}
