'use client';

import { cn } from '@/lib/utils';
import { getCategoryIcon } from '@/lib/categoryIcons';
import { getCategoryColorPair } from './categoryTokens';

interface CategoryRailItemProps {
  id: number;
  name: string;
  active: boolean;
  onSelect: () => void;
}

export function CategoryRailItem({ id, name, active, onSelect }: CategoryRailItemProps) {
  const Icon = getCategoryIcon(name);
  const pair = getCategoryColorPair(name, id);

  return (
    <button
      type="button"
      onClick={onSelect}
      role="tab"
      aria-selected={active}
      className={cn(
        'flex w-full min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-[14px] px-1.5 py-2.5 transition-colors',
        active ? 'bg-white shadow-[0_2px_8px_rgba(20,32,25,0.08)]' : 'bg-transparent',
      )}
    >
      <span
        className="flex h-[34px] w-[34px] items-center justify-center rounded-xl"
        style={{ backgroundColor: active ? '#17703F' : '#FFFFFF' }}
      >
        <Icon className="h-[18px] w-[18px]" style={{ color: active ? '#FFFFFF' : pair.icon }} strokeWidth={2} />
      </span>
      <span
        className={cn('line-clamp-2 text-center text-[11px] leading-tight', active ? 'font-bold' : 'font-medium')}
        style={{ color: active ? '#0F5530' : '#56635B' }}
      >
        {name}
      </span>
    </button>
  );
}
