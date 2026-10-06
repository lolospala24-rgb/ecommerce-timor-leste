'use client';

import type { LucideIcon } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { SelectableOptionCard } from './SelectableOptionCard';

interface ShippingOptionCardProps {
  name: string;
  subtitle: string;
  cost: number;
  icon: LucideIcon;
  selected: boolean;
  onSelect: () => void;
}

export function ShippingOptionCard({ name, subtitle, cost, icon: Icon, selected, onSelect }: ShippingOptionCardProps) {
  const { t } = useTranslation();

  return (
    <SelectableOptionCard selected={selected} onClick={onSelect} ariaLabel={name}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Icon className="h-4 w-4 shrink-0 text-[#56635B]" />
          <div>
            <p className="text-[15px] font-bold text-[#142019]">{name}</p>
            <p className="text-[13px] text-[#56635B]">{subtitle}</p>
          </div>
        </div>
        <span className={cost === 0 ? 'shrink-0 text-[15px] font-bold text-[#17703F]' : 'shrink-0 text-[15px] font-bold text-[#142019]'}>
          {cost === 0 ? t('checkout.shipping.gratis') : `$${cost.toFixed(2)}`}
        </span>
      </div>
    </SelectableOptionCard>
  );
}
