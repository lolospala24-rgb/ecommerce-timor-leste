'use client';

import { LayoutGrid, List } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { cn } from '@/lib/utils';

export type ViewMode = 'grid' | 'list';

interface ViewModeToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewModeToggle({ mode, onChange }: ViewModeToggleProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center overflow-hidden rounded-lg border border-[#DDE3DE]">
      <button
        type="button"
        onClick={() => onChange('grid')}
        aria-label={t('productList.gridView')}
        aria-pressed={mode === 'grid'}
        className={cn('flex h-9 w-9 items-center justify-center', mode === 'grid' ? 'bg-[#E3F1E8] text-[#17703F]' : 'bg-white text-[#56635B]')}
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange('list')}
        aria-label={t('productList.listView')}
        aria-pressed={mode === 'list'}
        className={cn('flex h-9 w-9 items-center justify-center border-l border-[#DDE3DE]', mode === 'list' ? 'bg-[#E3F1E8] text-[#17703F]' : 'bg-white text-[#56635B]')}
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  );
}
