'use client';

import Link from 'next/link';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuRowProps {
  icon: LucideIcon;
  iconClassName?: string;
  title: string;
  subtitle?: string;
  value?: string;
  href?: string;
  onClick?: () => void;
  showChevron?: boolean;
  danger?: boolean;
  className?: string;
}

export function MenuRow({
  icon: Icon,
  iconClassName,
  title,
  subtitle,
  value,
  href,
  onClick,
  showChevron = true,
  danger = false,
  className,
}: MenuRowProps) {
  const content = (
    <>
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]',
          danger ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary',
          iconClassName,
        )}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate text-sm font-semibold', danger ? 'text-destructive' : 'text-foreground')}>
          {title}
        </span>
        {subtitle && <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>}
      </span>
      {value && <span className="shrink-0 text-sm text-muted-foreground">{value}</span>}
      {showChevron && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
    </>
  );

  const interactive = !!href || !!onClick;
  const rowClass = cn(
    'flex min-h-[56px] w-full items-center gap-3 px-4 py-2.5 text-left',
    interactive && 'transition-colors hover:bg-accent',
    className,
  );

  if (href) {
    return (
      <Link href={href} className={rowClass}>
        {content}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={rowClass}>
        {content}
      </button>
    );
  }
  // No href/onClick — a purely informational row (e.g. settings copy with
  // no toggle), rendered without button/link semantics or hover affordance.
  return <div className={rowClass}>{content}</div>;
}
