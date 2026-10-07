'use client';

import { cn } from '@/lib/utils';

interface FilterChipOption {
  value: string;
  label: string;
}

interface FilterChipGroupProps {
  label?: string;
  options: FilterChipOption[];
  /** Single string for single-select (e.g. rating), string[] for multi-select (e.g. municipality). */
  selected: string | string[] | undefined;
  onToggle: (value: string) => void;
  /** How many options to show before collapsing behind a "see all" expansion — omit to show all. */
  visibleCount?: number;
  seeAllLabel?: string;
}

export function FilterChipGroup({ label, options, selected, onToggle, visibleCount, seeAllLabel }: FilterChipGroupProps) {
  const isActive = (value: string) => (Array.isArray(selected) ? selected.includes(value) : selected === value);
  const visible = visibleCount != null ? options.slice(0, visibleCount) : options;
  const hiddenCount = options.length - visible.length;

  return (
    <div>
      {label && <p className="mb-2 text-[13px] font-semibold text-[#142019]">{label}</p>}
      <div className="flex flex-wrap gap-2">
        {visible.map((opt) => {
          const active = isActive(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onToggle(opt.value)}
              aria-pressed={active}
              className={cn(
                'rounded-[10px] border px-3 py-1.5 text-[12px] font-medium min-h-[32px]',
                active ? 'border-[#17703F] bg-[#E3F1E8] text-[#0F5530]' : 'border-[#DDE3DE] bg-white text-[#56635B]',
              )}
            >
              {opt.label}
            </button>
          );
        })}
        {hiddenCount > 0 && seeAllLabel && (
          <span className="flex items-center px-1 text-[12px] font-medium text-[#17703F]">{seeAllLabel}</span>
        )}
      </div>
    </div>
  );
}
