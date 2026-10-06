'use client';

import type { ReactNode } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductActionRowProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  onClick?: () => void;
  expanded?: boolean;
  children?: ReactNode;
  showDivider?: boolean;
}

// One row per spec item 3 — 40px green-tint icon tile, title + subtitle,
// trailing chevron. When `children` is passed, the row expands in place
// (used by "Haruka ba" to reveal the municipality picker / cost) instead
// of navigating anywhere.
export function ProductActionRow({
  icon,
  title,
  subtitle,
  onClick,
  expanded,
  children,
  showDivider = true,
}: ProductActionRowProps) {
  const isExpandable = !!children;

  return (
    <div className={cn(showDivider && 'border-b border-[#EEF1EE]')}>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full min-h-11 items-center gap-3 py-3.5 text-left"
        aria-expanded={isExpandable ? !!expanded : undefined}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E3F1E8] text-[#17703F]">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-[#142019]">{title}</span>
          <span className="block truncate text-xs text-[#56635B]">{subtitle}</span>
        </span>
        {isExpandable ? (
          <ChevronDown className={cn('h-5 w-5 shrink-0 text-[#56635B] transition-transform', expanded && 'rotate-180')} />
        ) : (
          <ChevronRight className="h-5 w-5 shrink-0 text-[#56635B]" />
        )}
      </button>
      {isExpandable && expanded && <div className="pb-4 pl-[52px] pr-1">{children}</div>}
    </div>
  );
}
