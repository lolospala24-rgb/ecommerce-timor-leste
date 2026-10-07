'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickFilterBarProps {
  /** Top real municipalities (from useLocalOriginMunicipalities) — only
   *  real, backend-supported quick filters are shown here. The reference
   *  design's Promosaun/Haruka-gratis/Loja-verifikadu chips are omitted:
   *  GET /products has no query param for any of them. */
  municipalities: string[];
  selected?: string;
  onToggle: (municipality: string) => void;
}

export function QuickFilterBar({ municipalities, selected, onToggle }: QuickFilterBarProps) {
  if (municipalities.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto border-t border-[#EEF1EE] px-4 py-2" data-lenis-prevent>
      {municipalities.map((m) => {
        const active = selected === m;
        return (
          <button
            key={m}
            type="button"
            onClick={() => onToggle(m)}
            aria-pressed={active}
            className={cn(
              'flex shrink-0 items-center gap-1 whitespace-nowrap rounded-[10px] border px-3 py-1.5 text-[12px] font-medium transition-colors min-h-[32px]',
              active ? 'border-[#17703F] bg-[#E3F1E8] text-[#0F5530]' : 'border-[#DDE3DE] bg-white text-[#56635B]',
            )}
          >
            {active && <Check className="h-3.5 w-3.5" />}
            {m}
          </button>
        );
      })}
    </div>
  );
}
