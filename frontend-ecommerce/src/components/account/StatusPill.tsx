import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type StatusPillTone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

const toneClasses: Record<StatusPillTone, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/15 text-warning-foreground',
  danger: 'bg-destructive/10 text-destructive',
  info: 'bg-info/10 text-info',
  muted: 'bg-muted text-muted-foreground',
};

interface StatusPillProps {
  label: string;
  tone?: StatusPillTone;
  icon?: ReactNode;
  className?: string;
}

export function StatusPill({ label, tone = 'muted', icon, className }: StatusPillProps) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', toneClasses[tone], className)}>
      {icon}
      {label}
    </span>
  );
}
