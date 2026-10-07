'use client';

import { CategoryRailItem } from './CategoryRailItem';
import type { Category } from '@/types/category.types';

interface CategoryRailProps {
  categories: Category[];
  selectedId?: number;
  onSelect: (category: Category) => void;
}

export function CategoryRail({ categories, selectedId, onSelect }: CategoryRailProps) {
  return (
    <div
      role="tablist"
      aria-orientation="vertical"
      className="h-full w-24 shrink-0 min-[600px]:w-[120px] overflow-y-auto bg-[#F4F6F3] px-2 py-3"
    >
      <div className="flex flex-col gap-1.5">
        {categories.map((category) => (
          <CategoryRailItem
            key={category.id}
            id={category.id}
            name={category.name}
            active={category.id === selectedId}
            onSelect={() => onSelect(category)}
          />
        ))}
      </div>
    </div>
  );
}
