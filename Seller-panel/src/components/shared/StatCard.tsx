import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  tone?: 'default' | 'warning' | 'destructive' | 'success';
  className?: string;
}

const toneStyles: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'bg-accent text-accent-foreground',
  warning: 'bg-warning/15 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  success: 'bg-success/15 text-success',
};

export function StatCard({ label, value, icon: Icon, hint, tone = 'default', className }: StatCardProps) {
  return (
    <div className={cn('rounded-lg border bg-card p-4 flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-md', toneStyles[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}
