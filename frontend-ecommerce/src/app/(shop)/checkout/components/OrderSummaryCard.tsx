'use client';

import type { LucideIcon } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/LanguageContext';

interface SummaryRow {
  icon: LucideIcon;
  label: string;
  value: string;
  onChange: () => void;
}

interface OrderSummaryCardProps {
  rows: SummaryRow[];
}

// Step 4's 3-row recap (Enderesu/Haruka/Pagamentu) — each row's "Troka"
// link jumps back to that exact step (see onChange, wired to setCurrentStep
// in the caller) without losing any other step's already-made selection.
export function OrderSummaryCard({ rows }: OrderSummaryCardProps) {
  const { t } = useTranslation();

  return (
    <div className="divide-y divide-[#EEF1EE] rounded-2xl border border-[#DDE3DE] bg-white px-4">
      {rows.map(({ icon: Icon, label, value, onChange }) => (
        <div key={label} className="flex items-center gap-3 py-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E3F1E8] text-[#17703F]">
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] text-[#56635B]">{label}</p>
            <p className="truncate text-[15px] font-bold text-[#142019]">{value}</p>
          </div>
          <button type="button" onClick={onChange} className="shrink-0 text-[13px] font-semibold text-[#17703F]">
            {t('checkout.address.change')}
          </button>
        </div>
      ))}
    </div>
  );
}
