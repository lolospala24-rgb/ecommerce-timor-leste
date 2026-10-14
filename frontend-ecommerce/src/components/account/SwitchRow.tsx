'use client';

import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface SwitchRowProps {
  title: string;
  subtitle?: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}

export function SwitchRow({ title, subtitle, checked, disabled, onCheckedChange, className }: SwitchRowProps) {
  return (
    <div className={cn('flex min-h-[56px] items-center gap-3 px-4 py-2.5', className)}>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} aria-label={title} />
    </div>
  );
}
