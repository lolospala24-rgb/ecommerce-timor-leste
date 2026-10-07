'use client';

import { Switch } from '@/components/ui/switch';

interface SwitchRowProps {
  title: string;
  subtitle?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function SwitchRow({ title, subtitle, checked, onChange }: SwitchRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="min-w-0">
        <p className="text-[14px] font-semibold text-[#142019]">{title}</p>
        {subtitle && <p className="text-[12px] text-[#56635B]">{subtitle}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
