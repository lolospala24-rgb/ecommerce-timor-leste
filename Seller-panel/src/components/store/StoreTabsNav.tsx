'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/my-store/profile', label: 'Store Profile' },
  { href: '/my-store/address', label: 'Store Address' },
  { href: '/my-store/settings', label: 'Store Settings' },
];

export function StoreTabsNav() {
  const pathname = usePathname();

  return (
    <div className="mb-6 flex gap-1 overflow-x-auto rounded-md border bg-card p-1">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            'flex-shrink-0 rounded px-3 py-1.5 text-sm font-medium transition-colors',
            pathname === tab.href ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent',
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
