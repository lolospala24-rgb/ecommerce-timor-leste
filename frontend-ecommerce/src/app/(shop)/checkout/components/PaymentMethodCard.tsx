'use client';

import type { LucideIcon } from 'lucide-react';
import { SelectableOptionCard } from './SelectableOptionCard';

interface PaymentMethodCardProps {
  name: string;
  description: string;
  icon: LucideIcon;
  selected: boolean;
  onSelect: () => void;
}

export function PaymentMethodCard({ name, description, icon: Icon, selected, onSelect }: PaymentMethodCardProps) {
  return (
    <SelectableOptionCard selected={selected} onClick={onSelect} ariaLabel={name} radioPosition="right">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E3F1E8] text-[#17703F]">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-bold text-[#142019]">{name}</p>
          <p className="truncate text-[13px] text-[#56635B]">{description}</p>
        </div>
      </div>
    </SelectableOptionCard>
  );
}
