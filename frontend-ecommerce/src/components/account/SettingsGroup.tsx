import { Children, Fragment, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SettingsGroupProps {
  label?: string;
  children: ReactNode;
  className?: string;
}

// Grey uppercase label above a white rounded card of rows — wraps any mix
// of MenuRow / SwitchRow children and inserts dividers between them.
export function SettingsGroup({ label, children, className }: SettingsGroupProps) {
  const rows = Children.toArray(children).filter(Boolean);

  return (
    <div className={className}>
      {label && <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>}
      <div className="divide-y divide-border overflow-hidden rounded-2xl border bg-card">
        {rows.map((row, i) => (
          <Fragment key={i}>{row}</Fragment>
        ))}
      </div>
    </div>
  );
}
